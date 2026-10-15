/**
 * The opening as a 2.5D camera move over flat illustrated planes (one SVG, no WebGL).
 *
 * Each plane is art in world centimetres placed at a depth Z. A pinhole camera at (cx, cy, cz) looking down +Z draws
 * a plane with scale k = F / (Z - cz) and centre offset (W/2 - cx·k, H/2 - cy·k), so moving the camera forward gives
 * real parallax (near planes grow and slide faster than far ones) instead of a flat zoom. The facade has a real
 * hole for the lit window; the bedroom planes sit behind it and are clipped to that hole while we are outside.
 *
 * Everything here is a pure function of (time, viewport): `?t=` frames are exact and reduced motion can render any
 * shot at any moment.
 */
import { citySvg, EXTERIOR_DEFS, flowerboxSvg, groundSvg, HOLE, hillsSvg, neighboursSvg, streetlampSvg, treeSvg, wallSvg, wiresSvg } from './exterior'
import { GB_SCREEN, KID_DEFS, LCD, LCD_C, kidSvg } from './kid'
import { backSvg, bedSvg, curtainsSvg, deskSvg, jambSvg, mobileSvg, ROOM_DEFS, tableSvg, tvSvg } from './room'
import { SKY_DEFS, skySvg } from './sky'
import { clamp01, f, hash1, lerp, monotone, seg, smooth } from './util'

export const Z = {
  city: 60000,
  hills: 15000,
  neighbours: 1200,
  back: 520,
  tv: 495,
  table: 478,
  bed: 445,
  desk: 430,
  kid: 260,
  mobile: 150,
  curtains: 26,
  jamb: 22,
  wall: 0,
  flowerbox: -25,
  ground: -200,
  streetlamp: -350,
  tree: -700,
  wires: -1000,
} as const
type PlaneId = keyof typeof Z

const OUTSIDE: PlaneId[] = ['city', 'hills', 'neighbours']
const INSIDE: PlaneId[] = ['back', 'tv', 'table', 'bed', 'desk', 'kid', 'mobile', 'curtains', 'jamb']
const FRONT: PlaneId[] = ['wall', 'flowerbox', 'ground', 'streetlamp', 'tree', 'wires']

const ART: Record<PlaneId, () => string> = {
  city: citySvg,
  hills: hillsSvg,
  neighbours: neighboursSvg,
  back: backSvg,
  tv: tvSvg,
  table: tableSvg,
  bed: bedSvg,
  desk: deskSvg,
  kid: kidSvg,
  mobile: mobileSvg,
  curtains: curtainsSvg,
  jamb: jambSvg,
  wall: wallSvg,
  flowerbox: flowerboxSvg,
  ground: groundSvg,
  streetlamp: streetlampSvg,
  tree: treeSvg,
  wires: wiresSvg,
}

let worldCache: string | null = null
/** The static world markup (built once per page; ids prefixed `opx-`). */
function worldMarkup(): string {
  if (worldCache) return worldCache
  const g = (id: PlaneId) => `<g data-p="${id}">${ART[id]()}</g>`
  worldCache = `
  <defs>${SKY_DEFS}${EXTERIOR_DEFS}${ROOM_DEFS}${KID_DEFS}
    <clipPath id="opx-hole" clipPathUnits="userSpaceOnUse"><rect data-k="holeclip" x="0" y="0" width="1" height="1"/></clipPath>
  </defs>
  <g data-k="sky"></g>
  <g data-k="world">
    ${OUTSIDE.map(g).join('')}
    <g data-k="inside">${INSIDE.map(g).join('')}</g>
    ${FRONT.map(g).join('')}
  </g>`
  return worldCache
}

// ───────────────────────── viewport + camera ─────────────────────────
export interface View {
  W: number
  H: number
  /** Focal length in px. */
  F: number
  /** 0 = tall phone .. 1 = wide desktop. */
  q: number
  /** Camera path for this viewport. */
  cam: (t: number) => { x: number; y: number; z: number }
}

const KEY_T = [0, 3.0, 4.4, 5.8, 6.95]
/** Depth reference just past the handheld: the camera's z is interpolated in log distance to it. */
const ZREF = Z.kid + 2

export function makeView(W: number, H: number): View {
  const q = clamp01((W / Math.max(1, H) - 0.56) / (1.6 - 0.56))
  const F = Math.min(1.07 * H, 1.25 * W)
  const d0 = (lerp(1500, 3500, q) * F) / W
  // end: the LCD (in cm) covers the viewport with a margin
  const kEnd = Math.max(W / (LCD.w / 10), H / (LCD.h / 10)) * 1.12
  const dEnd = F / kEnd
  const zs = [-d0, 0, 90, 205, Z.kid - dEnd]
  const ws = zs.map((z) => -Math.log(ZREF - z))
  const wz = monotone(KEY_T, ws, true, 0.3)
  const xs = monotone(KEY_T, [lerp(-20, -150, q), 0, lerp(18, 8, q), lerp(27, 22, q), GB_SCREEN.x])
  const ys = monotone(KEY_T, [lerp(-430, -250, q), -150, lerp(-96, -112, q), lerp(-64, -66, q), GB_SCREEN.y])
  return { W, H, F, q, cam: (t) => ({ x: xs(t), y: ys(t), z: ZREF - Math.exp(-wz(t)) }) }
}

// ───────────────────────── one rendered copy of the world ─────────────────────────
export interface Instance {
  svg: SVGSVGElement
  sky: SVGGElement
  world: SVGGElement
  inside: SVGGElement
  holeclip: SVGRectElement
  planes: { id: PlaneId; z: number; el: SVGGElement; shown: boolean }[]
  k: Record<string, Element | null>
}

const DYN = [
  'tw0', 'tw1', 'tw2', 'spill', 'bloom', 'lampwall', 'lamphalo', 'tvwall', 'tvhalo', 'tvkid', 'rimTop', 'tvsky',
  'tvsun', 'tvhill', 'tvflash', 'tail', 'head', 'thumbL', 'thumbR', 'btnA', 'logo', 'logosub', 'lcdgrid', 'lcdsheen', 'lcdedge',
  'led', 'gb', 'gbglow',
]

export function createInstance(host: HTMLElement, n: number): Instance {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  // a second copy (reduced-motion crossfades) gets its own ids
  const markup = n === 0 ? worldMarkup() : worldMarkup().replace(/opx-/g, `opx${n}-`)
  svg.innerHTML = markup
  host.appendChild(svg)
  const q = <T extends Element>(sel: string) => svg.querySelector(sel) as T
  const k: Record<string, Element | null> = {}
  for (const key of DYN) k[key] = svg.querySelector(`[data-k="${key}"]`)
  return {
    svg,
    sky: q('[data-k="sky"]'),
    world: q('[data-k="world"]'),
    inside: q('[data-k="inside"]'),
    holeclip: q('[data-k="holeclip"]'),
    planes: (Object.keys(Z) as PlaneId[]).map((id) => ({ id, z: Z[id], el: q(`[data-p="${id}"]`), shown: true })),
    k,
  }
}

export function setSky(inst: Instance, v: View, n: number): void {
  const s = skySvg(v.W, v.H, v.q)
  inst.sky.innerHTML = n === 0 ? s : s.replace(/opx-/g, `opx${n}-`)
  for (const key of ['tw0', 'tw1', 'tw2']) inst.k[key] = inst.sky.querySelector(`[data-k="${key}"]`)
}

// ───────────────────────── per-frame look ─────────────────────────
const TV_SCENES = [
  { sky: '#5aa0e8', sun: '#ffe680', hill: '#4fbf5a', glow: 1 },
  { sky: '#f2a65a', sun: '#fff1b0', hill: '#8a5a9a', glow: 0.85 },
  { sky: '#2a3a8a', sun: '#e8f0ff', hill: '#3a7a6a', glow: 0.6 },
  { sky: '#e86a8a', sun: '#ffe0f0', hill: '#5a4aa8', glow: 0.9 },
]

const set = (el: Element | null, name: string, v: string): void => {
  if (el) el.setAttribute(name, v)
}

/**
 * Draw one frame. `camT` positions the camera (and the handheld's straightening); `t` drives everything that lives
 * in the scene (TV, lamp, cat, thumbs, boot logo). In the normal path they are equal.
 */
export function renderFrame(inst: Instance, v: View, camT: number, t: number, still: boolean): void {
  const { W, H, F } = v
  const c = v.cam(camT)
  const dive = smooth(seg(camT, 5.8, 6.95))
  // a tiny handheld drift that settles as we lock onto the screen
  const drift = still ? 0 : 1 - dive
  const dx = Math.sin(camT * 0.9) * 3.5 * drift
  const dy = Math.cos(camT * 1.3) * 2.5 * drift
  const inside = c.z >= Z.wall

  for (const p of inst.planes) {
    const d = p.z - c.z
    let show = d > 0.6
    if (show && inside && (p.id === 'city' || p.id === 'hills' || p.id === 'neighbours')) show = false
    // once the screen covers the frame, only the handheld's plane is needed
    if (show && camT > 6.9 && p.id !== 'kid') show = false
    if (show !== p.shown) {
      p.el.style.display = show ? '' : 'none'
      p.shown = show
    }
    if (!show) continue
    const k = F / d
    p.el.setAttribute('transform', `matrix(${k} 0 0 ${k} ${f(W / 2 - c.x * k + dx)} ${f(H / 2 - c.y * k + dy)})`)
  }

  // the bedroom only shows through the window until we pass the wall
  if (!inside) {
    const k = F / (Z.wall - c.z)
    const x = W / 2 + (HOLE.x0 - c.x) * k + dx
    const y = H / 2 + (HOLE.y0 - c.y) * k + dy
    inst.holeclip.setAttribute('x', f(x))
    inst.holeclip.setAttribute('y', f(y))
    inst.holeclip.setAttribute('width', f((HOLE.x1 - HOLE.x0) * k))
    inst.holeclip.setAttribute('height', f((HOLE.y1 - HOLE.y0) * k))
    if (!inst.inside.hasAttribute('clip-path')) inst.inside.setAttribute('clip-path', `url(#${inst.holeclip.parentElement!.id})`)
  } else if (inst.inside.hasAttribute('clip-path')) inst.inside.removeAttribute('clip-path')

  const K = inst.k
  // sky
  set(K.tw0, 'opacity', f(0.55 + 0.45 * Math.sin(t * 2.3)))
  set(K.tw1, 'opacity', f(0.55 + 0.45 * Math.sin(t * 1.7 + 2)))
  set(K.tw2, 'opacity', f(0.55 + 0.45 * Math.sin(t * 2.9 + 4)))

  // lamp: steady with a slow breath; window bloom fades as we get close enough to see in
  const lamp = 1 + 0.035 * Math.sin(t * 2.1) + 0.015 * Math.sin(t * 5.3)
  set(K.spill, 'opacity', f(0.9 * lamp))
  set(K.lampwall, 'opacity', f(lamp))
  set(K.lamphalo, 'opacity', f(lamp))
  const dWall = Z.wall - c.z


  // CRT: cuts every ~0.8 s between a few cartoon palettes, with a flash on each cut and a constant shimmer
  const cut = Math.floor(t / 0.83)
  const sc = TV_SCENES[Math.floor(hash1(cut + 7) * TV_SCENES.length)]
  const since = t - cut * 0.83
  const flash = still ? 0 : Math.max(0, 1 - since / 0.12)
  const shimmer = still ? 0.92 : 0.86 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7.1) + 0.06 * hash1(Math.floor(t * 15))
  const tv = sc.glow * shimmer + flash * 0.25
  set(K.tvsky, 'fill', sc.sky)
  set(K.tvsun, 'fill', sc.sun)
  set(K.tvhill, 'fill', sc.hill)
  set(K.tvflash, 'opacity', f(flash * 0.35))
  set(K.tvwall, 'opacity', f(tv))
  set(K.tvhalo, 'opacity', f(tv))
  set(K.tvkid, 'opacity', f(tv))
  set(K.rimTop, 'opacity', f(0.35 + 0.45 * tv))
  // the window's glow from outside breathes a little with the TV inside
  set(K.bloom, 'opacity', f(0.62 * clamp01((dWall - 40) / 700) * (0.9 + 0.1 * tv)))

  // life: the cat's tail, a little head nod, thumbs on the buttons
  const tail = 10 * Math.pow(Math.max(0, Math.sin(t * 1.6)), 3) - 3
  set(K.tail, 'transform', `rotate(${f(tail)} -26 4)`)
  const play = 1 - dive
  const nod = (Math.sin(t * 2.2) * 1.4 - 1.5) * play
  set(K.head, 'transform', `rotate(${f(nod)} 1 -74)`)
  const press = play * (Math.sin(t * 9) > 0.55 ? 1 : 0)
  set(K.thumbR, 'transform', `translate(${f(-press * 0.8)} ${f(press * 0.9)})`)
  set(K.btnA, 'transform', `translate(0 ${f(press * 0.7)})`)
  const dpad = play * Math.sin(t * 3.3)
  set(K.thumbL, 'transform', `translate(${f(dpad * 0.8)} ${f(-Math.abs(dpad) * 0.5)})`)

  // the handheld straightens up to face the camera as we dive in
  const rot = lerp(-9, 0, dive)
  const sy = lerp(0.84, 1, dive)
  set(K.gb, 'transform', `translate(${GB_SCREEN.x} ${GB_SCREEN.y}) rotate(${f(rot)}) scale(.1 ${f(0.1 * sy)}) translate(${-LCD_C.x} ${-LCD_C.y})`)
  set(K.gbglow, 'opacity', f(0.8 + 0.2 * Math.sin(t * 3)))

  // boot screen: logo drops 4.6 -> 5.9, holds, clears at ~6.8 (then the screen is flat green for the menu)
  const drop = smooth(seg(t, 4.6, 5.9))
  const logoOn = t < 6.8
  set(K.logo, 'transform', `translate(0 ${f(lerp(LCD.y - 1, LCD_C.y + 3.6, drop))})`)
  set(K.logo, 'opacity', logoOn ? '1' : '0')
  set(K.logosub, 'opacity', logoOn && t >= 5.95 ? '1' : '0')
  // LCD texture only reads once the screen is big; fades out before the flat frame
  const kKid = F / Math.max(0.01, Z.kid - c.z)
  const pxPerMm = kKid / 10
  set(K.lcdgrid, 'opacity', f(clamp01((pxPerMm - 6) / 10) * (1 - seg(camT, 6.6, 6.9)) * 0.5))
  set(K.lcdsheen, 'opacity', f(0.08 * (1 - seg(camT, 6.4, 6.9))))
  set(K.lcdedge, 'opacity', f(0.12 * (1 - seg(camT, 6.4, 6.9))))
  set(K.led, 'opacity', f(0.3 + 0.1 * Math.sin(t * 4)))
}
