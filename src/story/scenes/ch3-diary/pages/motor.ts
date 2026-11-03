// OWNER: page agent C. Spread 2: the motor thesis (left: the desk cartoon, right: FIG. 1 with a spinnable rotor).
import { INK, appear, arrow, bubble, entry, hl, ink, kid, label, row, svg, swallowClicks } from '../kit'
import type { DiaryPage } from '../types'

// Fact source: entries.ts 'motor-thesis' ("Wrote a thesis paper on electric motor propulsion."). Throws if the id is renamed.
const THESIS = entry('motor-thesis')

/** All wording on this spread (draft; Risheek edits here). */
const COPY = {
  month: 'OCTOBER',
  bubble: 'ALMOST DONE.',
  drafts: 'earlier drafts',
  cta: 'Spin it yourself →',
  // FIG. 1 (right page)
  magnet: 'MAGNET',
  magnet2: 'MAGNET',
  coil: 'COIL',
  spins: 'SPINS',
  north: 'N',
  south: 'S',
  caption: 'FIG. 1: a motor.',
  hint: '↻ spin it',
} as const

const r2 = (v: number): string => v.toFixed(2)

/**
 * Local workaround for two pathLength=1 rounding artefacts in Chrome: "undrawn" strokes leave hairline slivers
 * (dash offset 1), and finished closed shapes keep a pinhole gap where the dash meets itself. So: hide ink groups
 * that have not started, and drop the dash once a group is finished. Pure in u; runs after the engine's applyInk.
 */
function inkFix(root: HTMLElement, u: number): void {
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    g.style.visibility = u <= Number(g.dataset.a) ? 'hidden' : ''
    const done = u >= Number(g.dataset.b)
    g.querySelectorAll<SVGElement>('[pathLength]').forEach((el) => {
      el.style.strokeDasharray = done ? 'none' : '1'
    })
  })
}

// ───────────────────────── left page: the desk ─────────────────────────
function deskCartoon(): string {
  // The stack: wobbly sheets, a little messier towards the top.
  const sheets = Array.from({ length: 13 }, (_, i) => {
    const x = 29.4 + ((i * 37) % 5) * 0.32 - (i % 3) * 0.35 + (i > 9 ? (i - 9) * 0.45 : 0)
    return `<rect x="${r2(x)}" y="${r2(55.6 - (i + 1) * 2.05)}" width="16" height="2.05" fill="#fff" stroke="${INK}" stroke-width=".6"/>`
  }).join('')
  // A crumpled paper ball: a lumpy outline (radius jitter) with two crease marks.
  const ball = (x: number, y: number, r: number, seed: number): string => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + seed
      const rr = r * (0.82 + 0.28 * (((i * 7 + seed * 13) % 5) / 4))
      return `${r2(x + Math.cos(a) * rr)},${r2(y + Math.sin(a) * rr)}`
    })
    return `<path d="M${pts.join(' L')} Z" fill="#fff" stroke="${INK}" stroke-width=".5"/><path d="M${r2(x - r * 0.1)},${r2(y)} L${r2(x - r * 0.62)},${r2(y - r * 0.38)} M${r2(x - r * 0.1)},${r2(y)} L${r2(x + r * 0.5)},${r2(y - r * 0.42)} M${r2(x - r * 0.1)},${r2(y)} L${r2(x + r * 0.12)},${r2(y + r * 0.6)}" fill="none" stroke="${INK}" stroke-width=".28"/>`
  }
  const s = `stroke="${INK}" stroke-linecap="round" stroke-linejoin="round"`
  // DOM order = depth (chair, kid, desk, stack); the ink windows set the drawing order (desk first, then him).
  return [
    // floor and a chair (so he is sitting, feet not quite reaching the floor)
    ink(0.22, 0.25, `<g ${s}>
      <path d="M4,70 Q40,69.4 76,70.2" fill="none" stroke-width=".5"/>
      <path d="M10.6,70 L10.6,46.6 M10.6,61.2 L26,61.2 M24.6,61.2 L24.6,70 M12.4,61.2 L12.4,70" fill="none" stroke-width=".7"/></g>`),
    // the kid, behind the desk (hands on it)
    ink(0.25, 0.31, kid(21.6, 66, 0.56, { armL: 70, armR: 72, legL: 2, legR: 12 })),
    // desk and drawer, in front of him
    ink(0.22, 0.27, `<g ${s}>
      <rect x="12" y="55.6" width="50" height="2.4" fill="#fff" stroke-width=".8"/>
      <path d="M15,58 L15,70 M59,58 L59,70" fill="none" stroke-width=".8"/>
      <rect x="45" y="58" width="14" height="5.2" fill="#fff" stroke-width=".65"/>
      <path d="M50.6,60.6 L53.4,60.6" fill="none" stroke-width=".65"/></g>`),
    // the stack, in front of him, taller than he is
    ink(0.28, 0.34, `<g ${s}>${sheets}</g>`),
    // desk lamp, aimed at the stack
    ink(0.31, 0.35, `<g ${s} fill="none">
      <path d="M53.6,55.6 Q57,53.9 60.4,55.6 Z" fill="#fff" stroke-width=".65"/>
      <path d="M57,54.6 L59.4,45.2 L54.4,39.6" stroke-width=".7"/>
      <path d="M55.8,36.6 L50.2,40.8 L53.6,43.6 Z" fill="${INK}" stroke-width=".6"/>
      <path d="M49.4,43.6 L47.6,45 M51.2,45.4 L50.4,47.4 M48.4,41.8 L46.4,42.5" stroke-width=".4"/></g>`),
    // the bin, and the drafts that missed it
    ink(0.34, 0.38, `<g ${s}>
      <path d="M65,61 L74,61 L72.8,70 L66.2,70 Z" fill="#fff" stroke-width=".65"/>
      <path d="M67.6,61.6 L68.2,69.6 M69.5,61.6 L69.5,69.6 M71.4,61.6 L70.8,69.6" fill="none" stroke-width=".35"/>
      ${ball(69.4, 59.6, 1.8, 1)}${ball(62.2, 68.4, 1.6, 2)}${ball(7.4, 68.5, 1.6, 3)}</g>`),
    ink(0.37, 0.39, `${label(61, 76.8, COPY.drafts, 2.5, 'middle', '#7a7a7a')}${arrow(64.6, 74.4, 68.4, 71.2, 0.3).replace(`stroke="${INK}"`, 'stroke="#7a7a7a"').replace('stroke-width=".7"', 'stroke-width=".4"')}`),
    ink(0.38, 0.41, bubble(15.6, 31, COPY.bubble, 19.4, 36.2, 3)),
  ].join('')
}

/** The kit arrow, a touch thinner (diagram labels). */
const thinArrow = (x1: number, y1: number, x2: number, y2: number, bend: number): string =>
  arrow(x1, y1, x2, y2, bend).replace('stroke-width=".7"', 'stroke-width=".5"')

export const motorText: DiaryPage = {
  id: 'motor-text',
  side: 'l',
  html: `
    ${row(1, appear(0.02, 0.05, COPY.month), 'dp-month')}
    ${row(2.6, appear(0.05, 0.12, `Thesis: ${hl('electric motors', 'sky')}`), 'dp-big')}
    ${row(4.2, appear(0.12, 0.2, `current + magnets = ${hl('SPIN', 'y')}`), 'dp-big')}
    ${svg(deskCartoon())}
    ${row(20, appear(0.41, 0.46, hl(COPY.cta, 'pink')), 'dp-big')}`,
  update: inkFix,
}

// ───────────────────────── right page: FIG. 1 ─────────────────────────
const CX = 40
const CY = 35
/** Housing (yoke) ring radii, magnet faces, rotor tip radius. Rotor tip < magnet face: there is an air gap. */
const R_HOUSE = 24
const R_YOKE = 21.6
const R_FACE = 15.6
const R_TIP = 13.6
/** Magnet arcs (degrees clockwise from 12 o'clock): S on the right, N on the left, each 84 degrees wide. */
const S_AT = 90
const N_AT = 270
const HALF_ARC = 42

/** Point at angle th (degrees clockwise from up) and radius r around (cx, cy). */
function polar(th: number, r: number, cx = CX, cy = CY): [number, number] {
  const a = (th * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
}
const P = (th: number, r: number, cx = CX, cy = CY): string => polar(th, r, cx, cy).map(r2).join(',')

/** An annular sector between radii r1 < r2 from angle a to b (clockwise). */
const sector = (a: number, b: number, r1: number, rr: number, cx = CX, cy = CY): string =>
  `M${P(a, rr, cx, cy)} A${rr},${rr} 0 0 1 ${P(b, rr, cx, cy)} L${P(b, r1, cx, cy)} A${r1},${r1} 0 0 0 ${P(a, r1, cx, cy)} Z`

/** Field lines inside the motor, from the N face across the gap (through the rotor iron) into the S face. */
function fieldLines(): string {
  const out: string[] = []
  for (const k of [-10.5, -5.4, 0, 5.4, 10.5]) {
    const dx = Math.sqrt(R_FACE * R_FACE - k * k)
    const y = CY + k
    const bow = k * 0.28
    out.push(`<path d="M${r2(CX - dx)},${r2(y)} C${r2(CX - dx / 2)},${r2(y + bow)} ${r2(CX + dx / 2)},${r2(y + bow)} ${r2(CX + dx)},${r2(y)}" fill="none"/>`)
  }
  // arrowheads (N -> S), on the two outer lines, in the gaps above and below the rotor
  for (const k of [-10.5, 10.5]) {
    const y = CY + k + k * 0.21
    out.push(`<path d="M${r2(CX + 1.3)},${r2(y - 1.1)} L${r2(CX + 2.6)},${r2(y)} L${r2(CX + 1.3)},${r2(y + 1.1)}" fill="none" stroke-dasharray="none"/>`)
  }
  return `<g class="mt-field" stroke="${INK}" stroke-width=".32" stroke-dasharray="1 .9" stroke-linecap="round" opacity="0">${out.join('')}</g>`
}

/** One rotor arm pointing up in rotor space: iron stem + curved pole shoe + a wound coil. */
function arm(k: number): string {
  const turns = [-9.9, -8.7, -7.5, -6.3, -5.1].map((y) => `M${r2(CX - 2.9)},${r2(CY + y + 0.45)} L${r2(CX + 2.9)},${r2(CY + y - 0.45)}`).join(' ')
  return `<g class="mt-arm" transform="rotate(${k * 120} ${CX} ${CY})">
    <rect x="${CX - 1.25}" y="${CY - 12.3}" width="2.5" height="9" fill="#fff" stroke-width=".6"/>
    <path d="${sector(-27, 27, 12.1, R_TIP)}" fill="#fff" stroke-width=".7"/>
    <rect class="mt-coil" x="${CX - 3}" y="${CY - 10.6}" width="6" height="6.2" rx=".8" fill="#fff" stroke-width=".55"/>
    <path class="mt-turns" d="${turns}" fill="none" stroke-width=".38"/>
  </g>`
}

function figure(): string {
  const s = `stroke="${INK}" stroke-linejoin="round"`
  const nLbl = polar(N_AT, (R_FACE + R_YOKE) / 2)
  const sLbl = polar(S_AT, (R_FACE + R_YOKE) / 2)
  // rotation arrow: an arc in the top gap between the magnets, clockwise, same way the rotor turns
  const rr = 18.6
  const [ax, ay] = polar(30, rr)
  const tan = (30 * Math.PI) / 180 // direction of travel at the head = (cos, sin) of the angle
  const head = (off: number): string => {
    const back = Math.atan2(Math.sin(tan), Math.cos(tan)) + Math.PI + off
    return `M${r2(ax)},${r2(ay)} L${r2(ax + Math.cos(back) * 2.3)},${r2(ay + Math.sin(back) * 2.3)}`
  }
  const magnetTo = polar(306, 19.5)
  const magnet2To = polar(54, 19.5)
  const coilTo = polar(240, 9.4)
  const spinsTo = polar(128, 14.8)
  return [
    // housing ring + the two permanent magnets (N hatched)
    ink(0.44, 0.51, `<g ${s}>
      <circle cx="${CX}" cy="${CY}" r="${R_HOUSE}" fill="none" stroke-width="1"/>
      <circle cx="${CX}" cy="${CY}" r="${R_YOKE}" fill="none" stroke-width=".45"/>
      <path d="${sector(N_AT - HALF_ARC, N_AT + HALF_ARC, R_FACE, R_YOKE)}" fill="url(#dp-hatch)" stroke-width=".75"/>
      <path d="${sector(S_AT - HALF_ARC, S_AT + HALF_ARC, R_FACE, R_YOKE)}" fill="#fff" stroke-width=".75"/>
      <circle cx="${r2(nLbl[0])}" cy="${r2(nLbl[1] - 0.2)}" r="2.3" fill="#fdfcf6" stroke="none"/>
      ${label(nLbl[0], nLbl[1] + 1.35, COPY.north, 3.8, 'middle')}
      ${label(sLbl[0], sLbl[1] + 1.35, COPY.south, 3.8, 'middle')}</g>`),
    fieldLines(),
    // the rotor (rotated in update)
    ink(0.52, 0.58, `<g class="mt-rotor" ${s}>${[0, 1, 2].map(arm).join('')}
      <circle cx="${CX}" cy="${CY}" r="3.3" fill="#fff" stroke-width=".8"/>
      <circle cx="${CX}" cy="${CY}" r=".9" fill="${INK}" stroke="none"/></g>`),
    ink(0.57, 0.6, `<g ${s} fill="none" stroke-width=".6"><path d="M${P(-30, rr)} A${rr},${rr} 0 0 1 ${r2(ax)},${r2(ay)}"/><path d="${head(0.5)} ${head(-0.5)}"/></g>`),
    // labels, with hand-drawn arrows
    ink(0.58, 0.61, `${label(4.5, 8.2, COPY.magnet, 3.6)}${thinArrow(11, 10, magnetTo[0], magnetTo[1], 0.22)}`),
    ink(0.6, 0.63, `${label(76, 8.2, COPY.magnet2, 3.6, 'end')}${thinArrow(66, 10, magnet2To[0], magnet2To[1], -0.22)}`),
    ink(0.62, 0.645, `${label(6, 68.4, COPY.coil, 3.6)}${thinArrow(13.5, 65.2, coilTo[0], coilTo[1], -0.12)}`),
    ink(0.63, 0.66, `${label(38, 68.4, COPY.spins, 3.6, 'middle')}${thinArrow(44.5, 65, spinsTo[0], spinsTo[1], 0.15)}`),
    // touch target: the whole motor plus a margin (stays on top; transparent)
    `<circle class="dp-hit mt-hit" cx="${CX}" cy="${CY}" r="${R_HOUSE + 3}" fill="transparent"/>`,
  ].join('')
}

/** Rotor spin from scrolling: starts once the ink is down, three full turns by the end of the spread (eased). */
const SPIN_A = 0.62
const SPIN_TURNS = 3

interface RotorState {
  /** Extra degrees from the viewer's spinning (added to the scroll-driven angle). */
  drag: number
  u: number
  /** Spin speed in degrees per second (clockwise positive); the loop in bind() coasts it to a stop. */
  omega: number
}
const states = new WeakMap<HTMLElement, RotorState>()
const stateOf = (root: HTMLElement): RotorState => {
  let st = states.get(root)
  if (!st) {
    st = { drag: 0, u: 0, omega: 0 }
    states.set(root, st)
  }
  return st
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x: number): number => x * x * (3 - 2 * x)

/** Rotor angle (degrees, clockwise) at progress u plus any dragged amount. Pure. */
const rotorAngle = (u: number, drag: number): number => SPIN_TURNS * 360 * smooth(clamp01((u - SPIN_A) / (1 - SPIN_A))) + drag

/**
 * Arm k's coil is drawn bolder while it is being pulled in towards a pole: in the 30 degrees before it lines up with
 * the S or N magnet (clockwise, the way it turns). At most one arm at a time (arms 120 apart, poles 180 apart).
 */
const isPulled = (armAngle: number): boolean => {
  const a = ((armAngle % 360) + 360) % 360
  return (a >= S_AT - 30 && a < S_AT) || (a >= N_AT - 30 && a < N_AT)
}

function render(root: HTMLElement, st: RotorState): void {
  const ang = rotorAngle(st.u, st.drag)
  root.querySelector('.mt-rotor')?.setAttribute('transform', `rotate(${ang.toFixed(2)} ${CX} ${CY})`)
  root.querySelectorAll<SVGGElement>('.mt-arm').forEach((g, k) => {
    const hot = isPulled(ang + k * 120)
    g.querySelector('.mt-coil')?.setAttribute('stroke-width', hot ? '1.1' : '.55')
    g.querySelector('.mt-turns')?.setAttribute('stroke-width', hot ? '.62' : '.38')
  })
}

export const motorDiagram: DiaryPage = {
  id: 'motor-diagram',
  side: 'r',
  entryIds: [THESIS.id],
  html: `
    ${svg(figure())}
    ${row(17.6, appear(0.66, 0.72, COPY.caption), 'dp-small', 'right:32%')}
    ${row(19.4, appear(0.72, 0.76, hl(COPY.hint, 'pink')), 'dp-big', 'right:32%')}`,
  update(root, u) {
    const st = stateOf(root)
    st.u = u
    inkFix(root, u)
    const f = root.querySelector<SVGGElement>('.mt-field')
    if (f) f.style.opacity = String(clamp01((u - 0.5) / 0.06))
    render(root, st)
  },
  /**
   * Effortless spinning (Risheek found the old circular-drag hard): the target is the whole motor. A click or tap kicks
   * it, HOLDING spins it up, and dragging in ANY direction (a straight swipe is enough) adds speed in proportion to how
   * far you move. It then coasts to a stop by itself. The hit area keeps class dp-hit so none of this advances the story.
   */
  bind(root) {
    const st = stateOf(root)
    const hit = root.querySelector<SVGCircleElement>('.mt-hit')
    if (!hit) return () => undefined
    const MAX = 1500 // deg/s
    const HOLD_TO = 540 // holding eases towards this speed
    let raf = 0
    let last = 0
    let held = false
    let lastX = 0
    let lastY = 0
    const loop = (t: number): void => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60
      last = t
      if (held) st.omega += (HOLD_TO - st.omega) * Math.min(1, dt * 4)
      else st.omega *= Math.exp(-dt * 0.9)
      st.drag += st.omega * dt
      render(root, st)
      if (!held && Math.abs(st.omega) < 6) {
        st.omega = 0
        raf = 0
        last = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }
    const kick = (): void => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const down = (e: PointerEvent): void => {
      held = true
      lastX = e.clientX
      lastY = e.clientY
      hit.setPointerCapture(e.pointerId)
      st.omega = Math.max(st.omega, 420) // a plain click already sets it spinning
      kick()
      e.preventDefault()
      e.stopPropagation()
    }
    const move = (e: PointerEvent): void => {
      if (!held) return
      const d = Math.hypot(e.clientX - lastX, e.clientY - lastY)
      lastX = e.clientX
      lastY = e.clientY
      st.omega = Math.min(MAX, st.omega + d * 14)
    }
    const up = (e: PointerEvent): void => {
      held = false
      if (hit.hasPointerCapture(e.pointerId)) hit.releasePointerCapture(e.pointerId)
      kick()
    }
    const noClick = swallowClicks(hit)
    hit.addEventListener('pointerdown', down)
    hit.addEventListener('pointermove', move)
    hit.addEventListener('pointerup', up)
    hit.addEventListener('pointercancel', up)
    return () => {
      hit.removeEventListener('pointerdown', down)
      hit.removeEventListener('pointermove', move)
      hit.removeEventListener('pointerup', up)
      hit.removeEventListener('pointercancel', up)
      noClick()
      held = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      st.omega = 0
    }
  },
}
