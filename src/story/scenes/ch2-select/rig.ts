/**
 * Full-body cel-shaded side-view character, drawn with canvas 2D from a joint-angle pose (forward kinematics, so
 * interpolating two poses never stretches a limb). Facing right; flip with a negative x scale.
 *
 * Units: ~225 tall. Feet on y = 0, up is negative y. Angles in radians:
 *  - limbs: absolute, 0 = pointing straight down, +PI/2 = pointing forward (the way he faces), PI = straight up;
 *  - torso `t`: 0 = upright, + = leaning forward; head `h`: extra tilt on top of the torso;
 *  - feet `f1`/`f2`: absolute direction heel -> toes (PI/2 = flat, pointing forward).
 * Identity anchors (never change): short dark hair, round glasses, light-brown skin; black jacket + jeans + white
 * sneakers, or a white gi with a black belt on the karate floor.
 */
type G = CanvasRenderingContext2D

export const INK = '#140c12'

export interface Pose {
  /** Root forward offset (units, along the facing direction). */
  x: number
  /** Extra vertical root offset (negative = up). With g = 0 it is the hip height itself. */
  y: number
  /** 1 = feet solved onto the ground, 0 = hip placed at y (airborne, lying down). */
  g: number
  t: number
  h: number
  l1a: number
  l1b: number
  l2a: number
  l2b: number
  a1a: number
  a1b: number
  a2a: number
  a2b: number
  f1: number
  f2: number
  /** Hands: 0 fist, 1 open. */
  o1: number
  o2: number
  /** Whole-body rotation around the hip (falls). */
  rot: number
}

const KEYS: ReadonlyArray<keyof Pose> = ['x', 'y', 'g', 't', 'h', 'l1a', 'l1b', 'l2a', 'l2b', 'a1a', 'a1b', 'a2a', 'a2b', 'f1', 'f2', 'o1', 'o2', 'rot']

const HALF_PI = Math.PI / 2
export const STAND: Pose = {
  x: 0, y: 0, g: 1, t: 0.02, h: 0,
  l1a: 0.07, l1b: 0.02, l2a: -0.07, l2b: -0.02,
  a1a: 0.12, a1b: 0.06, a2a: -0.08, a2b: -0.02,
  f1: HALF_PI, f2: HALF_PI, o1: 1, o2: 1, rot: 0,
}

/** Build a pose from STAND plus overrides. */
export const P = (o: Partial<Pose>): Pose => ({ ...STAND, ...o })

export function newPose(): Pose {
  return { ...STAND }
}

export function copyPose(out: Pose, a: Pose): Pose {
  for (const k of KEYS) out[k] = a[k]
  return out
}

export function lerpPose(out: Pose, a: Pose, b: Pose, u: number): Pose {
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * u
  return out
}

// ───────────────────────── proportions ─────────────────────────
const THIGH = 48
const SHIN = 47
const ANKLE = 7
const TORSO = 62
const SHOULDER = 54
const UPPER = 35
const FORE = 33
const NECK = 21
const OL = 3.4 // ink outline width (each side)

// ───────────────────────── looks ─────────────────────────
export type Outfit = 'gi' | 'casual' | 'shadow' | 'hint' | 'locked'
export type Face = 'set' | 'fight' | 'shout' | 'hurt' | 'grin' | 'calm' | 'talk'

interface Palette {
  top: string
  topShade: string
  leg: string
  legShade: string
  skin: string
  skinShade: string
  hand: string
  handShade: string
  foot: string
  footShade: string
  rim: string | null
}

const SKIN = '#d9a066'
const SKIN_D = '#b0763f'
const HAIR = '#15101b'
const HAIR_HI = '#433f66'

const PAL: Record<Outfit, Palette> = {
  gi: { top: '#f6f5fa', topShade: '#c4c4da', leg: '#f6f5fa', legShade: '#c4c4da', skin: SKIN, skinShade: SKIN_D, hand: SKIN, handShade: SKIN_D, foot: SKIN, footShade: SKIN_D, rim: null },
  casual: { top: '#22222e', topShade: '#121219', leg: '#33406a', legShade: '#222b4c', skin: SKIN, skinShade: SKIN_D, hand: SKIN, handShade: SKIN_D, foot: '#f4f1e8', footShade: '#bdb6a6', rim: null },
  shadow: { top: '#1e1a2c', topShade: '#0f0d18', leg: '#1e1a2c', legShade: '#0f0d18', skin: '#1e1a2c', skinShade: '#0f0d18', hand: '#262036', handShade: '#120f1c', foot: '#1e1a2c', footShade: '#0f0d18', rim: '#ff3b5c' },
  hint: { top: '#1c1828', topShade: '#100d18', leg: '#1c1828', legShade: '#100d18', skin: '#1c1828', skinShade: '#100d18', hand: '#221d30', handShade: '#120f1c', foot: '#1c1828', footShade: '#100d18', rim: '#ffd84a' },
  locked: { top: '#1a1830', topShade: '#121026', leg: '#1a1830', legShade: '#121026', skin: '#1a1830', skinShade: '#121026', hand: '#1a1830', handShade: '#121026', foot: '#1a1830', footShade: '#121026', rim: null },
}

export interface Look {
  outfit: Outfit
  face: Face
  /** 0..1 heat aura (drawn behind the body). */
  heat?: number
  /** Override rim colour (shadow outfit) or add a rim to others. */
  rim?: string
  /** Mouth flap 0..1 for 'talk'. */
  talk?: number
}

// ───────────────────────── joints (scratch, no per-frame allocation) ─────────────────────────
const J = {
  hx: 0, hy: 0, fx: 0, fy: 0, ux: 0, uy: 0,
  k1x: 0, k1y: 0, a1x: 0, a1y: 0, k2x: 0, k2y: 0, a2x: 0, a2y: 0,
  s1x: 0, s1y: 0, e1x: 0, e1y: 0, w1x: 0, w1y: 0,
  s2x: 0, s2y: 0, e2x: 0, e2y: 0, w2x: 0, w2y: 0,
  nx: 0, ny: 0, cx: 0, cy: 0, ha: 0,
  p1x: 0, p1y: 0, p2x: 0, p2y: 0,
}

function solve(p: Pose): void {
  const s = Math.sin
  const c = Math.cos
  const ext1 = THIGH * c(p.l1a) + SHIN * c(p.l1b)
  const ext2 = THIGH * c(p.l2a) + SHIN * c(p.l2b)
  const ground = -(Math.max(ext1, ext2) + ANKLE)
  J.hx = p.x
  J.hy = p.g * ground + p.y
  J.ux = s(p.t)
  J.uy = -c(p.t)
  J.fx = c(p.t)
  J.fy = s(p.t)
  // legs
  J.p1x = J.hx + J.fx * 4
  J.p1y = J.hy + J.fy * 4
  J.p2x = J.hx - J.fx * 4
  J.p2y = J.hy - J.fy * 4
  J.k1x = J.p1x + THIGH * s(p.l1a)
  J.k1y = J.p1y + THIGH * c(p.l1a)
  J.a1x = J.k1x + SHIN * s(p.l1b)
  J.a1y = J.k1y + SHIN * c(p.l1b)
  J.k2x = J.p2x + THIGH * s(p.l2a)
  J.k2y = J.p2y + THIGH * c(p.l2a)
  J.a2x = J.k2x + SHIN * s(p.l2b)
  J.a2y = J.k2y + SHIN * c(p.l2b)
  // shoulders
  const sx = J.hx + J.ux * SHOULDER
  const sy = J.hy + J.uy * SHOULDER
  J.s1x = sx + J.fx * 3
  J.s1y = sy + J.fy * 3
  J.s2x = sx - J.fx * 6
  J.s2y = sy - J.fy * 6
  J.e1x = J.s1x + UPPER * s(p.a1a)
  J.e1y = J.s1y + UPPER * c(p.a1a)
  J.w1x = J.e1x + FORE * s(p.a1b)
  J.w1y = J.e1y + FORE * c(p.a1b)
  J.e2x = J.s2x + UPPER * s(p.a2a)
  J.e2y = J.s2y + UPPER * c(p.a2a)
  J.w2x = J.e2x + FORE * s(p.a2b)
  J.w2y = J.e2y + FORE * c(p.a2b)
  // neck + head
  J.nx = J.hx + J.ux * TORSO
  J.ny = J.hy + J.uy * TORSO
  J.ha = p.t + p.h
  J.cx = J.nx + s(J.ha) * NECK
  J.cy = J.ny - c(J.ha) * NECK
}

/** World-space (unscaled, unflipped) position of a named end effector, for sparks and smears. */
export function effector(p: Pose, which: 'fist1' | 'fist2' | 'foot1' | 'foot2' | 'head' | 'chest', out: { x: number; y: number }): { x: number; y: number } {
  solve(p)
  let x = 0
  let y = 0
  if (which === 'fist1') {
    x = J.w1x + Math.sin(p.a1b) * 5
    y = J.w1y + Math.cos(p.a1b) * 5
  } else if (which === 'fist2') {
    x = J.w2x + Math.sin(p.a2b) * 5
    y = J.w2y + Math.cos(p.a2b) * 5
  } else if (which === 'foot1') {
    x = J.a1x + Math.sin(p.f1) * 12
    y = J.a1y + Math.cos(p.f1) * 12
  } else if (which === 'foot2') {
    x = J.a2x + Math.sin(p.f2) * 12
    y = J.a2y + Math.cos(p.f2) * 12
  } else if (which === 'head') {
    x = J.cx
    y = J.cy
  } else {
    x = J.hx + J.ux * 40 + J.fx * 10
    y = J.hy + J.uy * 40 + J.fy * 10
  }
  if (p.rot) {
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    const dx = x - J.hx
    const dy = y - J.hy
    x = J.hx + dx * c - dy * s
    y = J.hy + dx * s + dy * c
  }
  out.x = x
  out.y = y
  return out
}

// ───────────────────────── primitives ─────────────────────────
function seg(g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  g.strokeStyle = color
  g.lineWidth = w
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.stroke()
}

/** Shade stroke along the side facing away from the light (light = front-top). */
function shadeSeg(g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  let dx = x1 - x0
  let dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  dx /= len
  dy /= len
  let nx = -dy
  let ny = dx
  if (nx * 0.6 + ny * -0.8 > 0) {
    nx = -nx
    ny = -ny
  }
  const o = w * 0.26
  g.strokeStyle = color
  g.lineWidth = w * 0.46
  g.beginPath()
  g.moveTo(x0 + nx * o, y0 + ny * o)
  g.lineTo(x1 + nx * o, y1 + ny * o)
  g.stroke()
}

function rimSeg(g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  let dx = x1 - x0
  let dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  dx /= len
  dy /= len
  let nx = -dy
  let ny = dx
  if (nx * 0.6 + ny * -0.8 < 0) {
    nx = -nx
    ny = -ny
  }
  const o = w * 0.5 - 1.6
  g.strokeStyle = color
  g.lineWidth = 2.4
  g.beginPath()
  g.moveTo(x0 + nx * o, y0 + ny * o)
  g.lineTo(x1 + nx * o, y1 + ny * o)
  g.stroke()
}

/** Two-segment limb: ink for both, then base, then shade (so the inner joint has no seam). */
function limb(g: G, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, w0: number, w1: number, base: string, shade: string, rim: string | null): void {
  seg(g, x0, y0, x1, y1, w0 + OL * 2, INK)
  seg(g, x1, y1, x2, y2, w1 + OL * 2, INK)
  seg(g, x0, y0, x1, y1, w0, base)
  seg(g, x1, y1, x2, y2, w1, base)
  shadeSeg(g, x0, y0, x1, y1, w0, shade)
  shadeSeg(g, x1, y1, x2, y2, w1, shade)
  if (rim) {
    rimSeg(g, x0, y0, x1, y1, w0, rim)
    rimSeg(g, x1, y1, x2, y2, w1, rim)
  }
}

function ellipse(g: G, x: number, y: number, rx: number, ry: number, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

function foot(g: G, ax: number, ay: number, ang: number, pal: Palette, outfit: Outfit): void {
  const dx = Math.sin(ang)
  const dy = Math.cos(ang)
  // the sole is "below" the foot direction: rotate the direction by -90deg relative to forward
  const bx = -dy
  const by = dx
  const sole = outfit === 'casual' ? 4.5 : 3
  const hx = ax - dx * 5 + bx * sole
  const hy = ay - dy * 5 + by * sole
  const tx = ax + dx * (outfit === 'casual' ? 17 : 15) + bx * sole
  const ty = ay + dy * (outfit === 'casual' ? 17 : 15) + by * sole
  const w = outfit === 'casual' ? 11 : 9
  seg(g, hx, hy, tx, ty, w + OL * 2, INK)
  seg(g, hx, hy, tx, ty, w, pal.foot)
  if (outfit === 'casual') {
    seg(g, hx + bx * 3.2, hy + by * 3.2, tx + bx * 3.2, ty + by * 3.2, 3, pal.footShade)
  } else shadeSeg(g, hx, hy, tx, ty, w, pal.footShade)
}

function hand(g: G, wx: number, wy: number, ang: number, open: number, pal: Palette): void {
  const dx = Math.sin(ang)
  const dy = Math.cos(ang)
  if (open > 0.5) {
    const cx = wx + dx * 7
    const cy = wy + dy * 7
    const rot = Math.atan2(dy, dx)
    g.fillStyle = INK
    ellipse(g, cx, cy, 9 + OL, 5.6 + OL, rot)
    g.fill()
    g.fillStyle = pal.hand
    ellipse(g, cx, cy, 9, 5.6, rot)
    g.fill()
    g.fillStyle = pal.handShade
    ellipse(g, cx + dy * 1.8, cy - dx * 1.8, 6, 2.4, rot)
    g.fill()
  } else {
    const cx = wx + dx * 5
    const cy = wy + dy * 5
    g.fillStyle = INK
    g.beginPath()
    g.arc(cx, cy, 8 + OL, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = pal.hand
    g.beginPath()
    g.arc(cx, cy, 8, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = pal.handShade
    g.beginPath()
    g.arc(cx + 1.6, cy + 2.4, 4.6, 0, Math.PI * 2)
    g.fill()
    // knuckle line
    g.strokeStyle = INK
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(cx + dx * 4 - dy * 4, cy + dy * 4 + dx * 4)
    g.lineTo(cx + dx * 4 + dy * 4, cy + dy * 4 - dx * 4)
    g.stroke()
  }
}

/** Arm: forearm skin first, then the sleeve chain on top, then the hand. */
function arm(g: G, sx: number, sy: number, ex: number, ey: number, wx: number, wy: number, ang: number, open: number, pal: Palette, outfit: Outfit, rim: string | null): void {
  if (outfit === 'gi') {
    // bare forearm, then a wide three-quarter sleeve
    limb(g, ex, ey, ex + (wx - ex) * 0.55, ey + (wy - ey) * 0.55, wx, wy, 11, 10, pal.skin, pal.skinShade, null)
    const cx = ex + (wx - ex) * 0.6
    const cy = ey + (wy - ey) * 0.6
    limb(g, sx, sy, ex, ey, cx, cy, 19, 17, pal.top, pal.topShade, null)
  } else if (outfit === 'casual') {
    const cx = ex + (wx - ex) * 0.9
    const cy = ey + (wy - ey) * 0.9
    limb(g, sx, sy, ex, ey, cx, cy, 16, 14, pal.top, pal.topShade, rim)
  } else {
    limb(g, sx, sy, ex, ey, wx, wy, 17, 15, pal.top, pal.topShade, rim)
  }
  hand(g, wx, wy, ang, open, pal)
}

function leg(g: G, px: number, py: number, kx: number, ky: number, ax: number, ay: number, fang: number, pal: Palette, outfit: Outfit, rim: string | null): void {
  const slim = outfit === 'casual' || outfit === 'hint' || outfit === 'locked'
  const w0 = slim ? 18 : 22
  const w1 = slim ? 16 : 21
  foot(g, ax, ay, fang, pal, outfit)
  limb(g, px, py, kx, ky, ax, ay, w0, w1, pal.leg, pal.legShade, rim)
  if (outfit === 'casual') {
    // rolled jeans hem
    const dx = ax - kx
    const dy = ay - ky
    const l = Math.hypot(dx, dy) || 1
    const hx = ax - (dx / l) * 3
    const hy = ay - (dy / l) * 3
    seg(g, hx - (dy / l) * 7.5, hy + (dx / l) * 7.5, hx + (dy / l) * 7.5, hy - (dx / l) * 7.5, 4, '#4a5a8c')
  }
}

// ───────────────────────── torso ─────────────────────────
function tp(a: number, b: number): void {
  // helper writes into T0 (point = hip + f*a + u*b)
  T0.x = J.hx + J.fx * a + J.ux * b
  T0.y = J.hy + J.fy * a + J.uy * b
}
const T0 = { x: 0, y: 0 }
function tl(g: G, a: number, b: number, first = false): void {
  tp(a, b)
  if (first) g.moveTo(T0.x, T0.y)
  else g.lineTo(T0.x, T0.y)
}

function torsoPath(g: G, bottom: number): void {
  g.beginPath()
  tl(g, -15, -bottom, true)
  tl(g, 17, -bottom)
  tl(g, 16, 26)
  tl(g, 18.5, 45)
  tl(g, 9, 61)
  tl(g, -9, 63)
  tl(g, -17.5, 50)
  tl(g, -15.5, 20)
  g.closePath()
}

function torso(g: G, pal: Palette, outfit: Outfit, rim: string | null, belt: boolean): void {
  const bottom = outfit === 'casual' ? 6 : 13
  g.lineJoin = 'round'
  torsoPath(g, bottom)
  g.strokeStyle = INK
  g.lineWidth = OL * 2
  g.stroke()
  g.fillStyle = pal.top
  g.fill()
  // shade (back side)
  g.fillStyle = pal.topShade
  g.beginPath()
  tl(g, -9, 63, true)
  tl(g, -17.5, 50)
  tl(g, -15.5, 20)
  tl(g, -15, -bottom)
  tl(g, -5, -bottom)
  tl(g, -6, 22)
  tl(g, -3, 48)
  tl(g, -1, 62)
  g.closePath()
  g.fill()
  if (outfit === 'gi') {
    // chest V + lapels
    g.fillStyle = SKIN
    g.beginPath()
    tl(g, 9, 61, true)
    tl(g, 1, 62)
    tl(g, 13, 38)
    g.closePath()
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2.2
    g.beginPath()
    tl(g, -3, 62.5, true)
    tl(g, 14, 9)
    tl(g, 9, 61, true)
    tl(g, 13, 38)
    g.stroke()
    g.strokeStyle = pal.topShade
    g.lineWidth = 3
    g.beginPath()
    tl(g, -1, 60, true)
    tl(g, 13, 14)
    g.stroke()
  } else if (outfit === 'casual') {
    // white tee in the open jacket
    g.fillStyle = '#ebe7dd'
    g.beginPath()
    tl(g, 9, 61, true)
    tl(g, 18.3, 45)
    tl(g, 16.2, 26)
    tl(g, 16.8, -6)
    tl(g, 10, -6)
    tl(g, 8, 28)
    tl(g, 3, 60)
    g.closePath()
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
    // zip edge highlight + collar
    g.strokeStyle = '#4a4a62'
    g.lineWidth = 2.4
    g.beginPath()
    tl(g, 3.5, 58, true)
    tl(g, 8.5, 27)
    tl(g, 9.6, -4)
    g.stroke()
    g.fillStyle = pal.top
    g.beginPath()
    tl(g, -12, 61, true)
    tl(g, -6, 71)
    tl(g, 3, 62)
    g.closePath()
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2.2
    g.stroke()
  }
  if (belt) {
    g.fillStyle = '#141018'
    g.beginPath()
    tl(g, -15.8, 2, true)
    tl(g, 17.6, 2)
    tl(g, 17.4, 10)
    tl(g, -15.6, 10)
    g.closePath()
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
    // knot + tails (hang with gravity)
    tp(16, 6)
    const kx = T0.x
    const ky = T0.y
    g.lineCap = 'round'
    seg(g, kx, ky, kx + 6, ky + 20, 6.5 + 3, INK)
    seg(g, kx, ky, kx + 1, ky + 21, 6.5 + 3, INK)
    seg(g, kx, ky, kx + 6, ky + 20, 6.5, '#141018')
    seg(g, kx, ky, kx + 1, ky + 21, 6.5, '#141018')
    g.fillStyle = '#141018'
    g.beginPath()
    g.arc(kx, ky, 5.5, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
  }
  if (rim) {
    g.strokeStyle = rim
    g.lineWidth = 2.6
    g.beginPath()
    tl(g, 15, -bottom + 2, true)
    tl(g, 14, 26)
    tl(g, 16.5, 45)
    tl(g, 7.5, 59)
    g.stroke()
  }
}

// ───────────────────────── head ─────────────────────────
function head(g: G, look: Look, pal: Palette): void {
  const shadow = look.outfit === 'shadow' || look.outfit === 'hint' || look.outfit === 'locked'
  g.save()
  g.translate(J.cx, J.cy)
  g.rotate(J.ha * 0.85)
  // ink union of skull + jaw
  g.fillStyle = INK
  ellipse(g, 0, 0, 19 + OL, 21 + OL)
  g.fill()
  ellipse(g, 7, 10, 11 + OL, 9 + OL)
  g.fill()
  if (!shadow) {
    // ear (behind the skin fill edge)
    g.fillStyle = INK
    ellipse(g, -4, 3, 5 + OL * 0.8, 6.4 + OL * 0.8)
    g.fill()
  }
  g.fillStyle = pal.skinShade
  ellipse(g, 0, 0, 19, 21)
  g.fill()
  ellipse(g, 7, 10, 11, 9)
  g.fill()
  g.fillStyle = pal.skin
  ellipse(g, 1.6, -2, 17, 19)
  g.fill()
  ellipse(g, 8, 8.4, 9.6, 7.6)
  g.fill()
  if (shadow) {
    // faceless: a headband with tails and a rim of light
    if (look.outfit === 'locked') {
      g.restore()
      return
    }
    const rim = look.rim ?? pal.rim ?? '#ff3b5c'
    g.strokeStyle = rim
    g.lineWidth = 2.6
    g.beginPath()
    g.ellipse(0, 0, 17.4, 19.4, 0, -1.25, 0.55)
    g.stroke()
    if (look.outfit === 'hint') {
      hintHead(g, rim)
      g.restore()
      return
    }
    g.fillStyle = '#7a1024'
    g.beginPath()
    g.moveTo(-19.5, -7)
    g.quadraticCurveTo(0, -12, 19.4, -9)
    g.lineTo(19, -3)
    g.quadraticCurveTo(0, -6, -19.8, -1)
    g.closePath()
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
    g.lineCap = 'round'
    seg(g, -18, -4, -34, 4, 4 + 3, INK)
    seg(g, -18, -4, -31, 10, 4 + 3, INK)
    seg(g, -18, -4, -34, 4, 4, '#7a1024')
    seg(g, -18, -4, -31, 10, 4, '#7a1024')
    g.restore()
    return
  }
  // ear
  g.fillStyle = pal.skin
  ellipse(g, -4, 3, 5, 6.4)
  g.fill()
  g.fillStyle = pal.skinShade
  ellipse(g, -3.4, 3.6, 2.2, 3.4)
  g.fill()
  // nose (profile)
  g.fillStyle = pal.skin
  g.beginPath()
  g.moveTo(17, 0)
  g.lineTo(24.5, 7.2)
  g.lineTo(18, 8.6)
  g.closePath()
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 2
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(19.4, 2.2)
  g.lineTo(24.5, 7.2)
  g.lineTo(19.5, 8.8)
  g.stroke()
  // hair
  g.fillStyle = HAIR
  g.beginPath()
  g.moveTo(-21, 4)
  g.bezierCurveTo(-25, -18, -12, -27, 2, -25.5)
  g.bezierCurveTo(16, -25, 25, -16, 21.5, -5)
  g.lineTo(16.5, -10.5)
  g.lineTo(13, -6.5)
  g.lineTo(9, -12.5)
  g.lineTo(4.5, -8)
  g.lineTo(-0.5, -13.5)
  g.lineTo(-5, -7)
  g.lineTo(-10, -9.5)
  g.lineTo(-12.5, 0)
  g.lineTo(-15.5, 7)
  g.closePath()
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 2.6
  g.stroke()
  g.strokeStyle = HAIR_HI
  g.lineWidth = 2.6
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(-15, -14)
  g.quadraticCurveTo(-6, -23, 7, -22)
  g.stroke()
  // eyes / brows / mouth
  const f = look.face
  g.fillStyle = HAIR
  g.strokeStyle = HAIR
  g.lineWidth = 2.6
  if (f === 'hurt') {
    g.beginPath()
    g.moveTo(5.5, -1.5)
    g.lineTo(10, 1)
    g.lineTo(5.5, 3)
    g.moveTo(22.5, -1.5)
    g.lineTo(18.5, 1)
    g.lineTo(22.5, 3)
    g.stroke()
  } else if (f === 'grin' || f === 'calm') {
    g.beginPath()
    g.moveTo(5.8, 1.4)
    g.quadraticCurveTo(8.6, -1.6, 11.4, 1.4)
    g.moveTo(18.4, 1.4)
    g.quadraticCurveTo(20.8, -1.4, 23, 1.4)
    g.stroke()
  } else {
    ellipse(g, 9, 0.8, 1.9, 2.7)
    g.fill()
    ellipse(g, 20.6, 0.8, 1.6, 2.5)
    g.fill()
  }
  const angry = f === 'fight' || f === 'shout'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(3.5, angry ? -10.5 : -9)
  g.lineTo(12.5, angry ? -7 : -9.6)
  g.moveTo(16.5, angry ? -7.4 : -9.6)
  g.lineTo(23, angry ? -10 : -8.4)
  g.stroke()
  // mouth
  g.lineWidth = 2
  g.strokeStyle = INK
  const open = f === 'shout' ? 1 : f === 'talk' ? (look.talk ?? 0) : f === 'hurt' ? 0.6 : 0
  if (open > 0.15) {
    g.fillStyle = '#4a1418'
    ellipse(g, 14.5, 13, 3.6, 1.2 + 3 * open)
    g.fill()
    g.stroke()
  } else if (f === 'grin') {
    g.fillStyle = '#fff'
    g.beginPath()
    g.moveTo(9.5, 11)
    g.quadraticCurveTo(14.5, 18, 19, 10.5)
    g.closePath()
    g.fill()
    g.stroke()
  } else {
    g.beginPath()
    g.moveTo(10.5, 12.4)
    g.quadraticCurveTo(14.5, f === 'calm' ? 15.4 : 13.6, 18, 11.8)
    g.stroke()
  }
  // round glasses (identity anchor)
  g.lineWidth = 2.5
  g.strokeStyle = '#1d1019'
  g.fillStyle = 'rgba(205,230,255,.34)'
  g.beginPath()
  g.arc(8.5, 0.5, 6.4, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.beginPath()
  g.arc(20.6, 0.5, 5.2, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.beginPath()
  g.moveTo(14.9, -0.4)
  g.lineTo(15.4, -0.4)
  g.moveTo(2.2, -0.6)
  g.lineTo(-3.2, 0.6)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,.85)'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(5, -2.4)
  g.lineTo(7.4, -4.4)
  g.moveTo(18.2, -2)
  g.lineTo(19.8, -3.4)
  g.stroke()
  g.restore()
}

/** Locked "next chapter" silhouette: hair shape and the round glasses catch the light, nothing else. */
function hintHead(g: G, rim: string): void {
  g.fillStyle = HAIR
  g.beginPath()
  g.moveTo(-21, 4)
  g.bezierCurveTo(-25, -18, -12, -28, 2, -26.5)
  g.bezierCurveTo(17, -26, 26, -16, 22, -4)
  g.lineTo(17, -10)
  g.lineTo(11, -7)
  g.lineTo(6, -13)
  g.lineTo(0, -8)
  g.lineTo(-5, -12)
  g.lineTo(-10, -6)
  g.lineTo(-13, 2)
  g.lineTo(-15.5, 7)
  g.closePath()
  g.fill()
  g.strokeStyle = rim
  g.lineWidth = 2.2
  g.beginPath()
  g.moveTo(-17, -16)
  g.quadraticCurveTo(-4, -28, 12, -24)
  g.stroke()
  g.strokeStyle = rim
  g.lineWidth = 2.5
  g.beginPath()
  g.arc(8.5, 0.5, 6.4, 0, Math.PI * 2)
  g.moveTo(25.8, 0.5)
  g.arc(20.6, 0.5, 5.2, 0, Math.PI * 2)
  g.moveTo(14.9, -0.4)
  g.lineTo(15.4, -0.4)
  g.stroke()
  g.strokeStyle = '#fff'
  g.lineWidth = 1.8
  g.beginPath()
  g.moveTo(5, -2.4)
  g.lineTo(7.6, -4.6)
  g.moveTo(18.2, -2)
  g.lineTo(19.8, -3.4)
  g.stroke()
}

// ───────────────────────── heat aura ─────────────────────────
function aura(g: G, heat: number, flick: number): void {
  if (heat <= 0.01) return
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.lineCap = 'round'
  const a = heat * (0.16 + 0.06 * Math.sin(flick * 31))
  const wob = 6 * Math.sin(flick * 23)
  g.globalAlpha = a
  const col = '#3d8cff'
  seg(g, J.p1x, J.p1y, J.k1x, J.k1y, 46 + wob, col)
  seg(g, J.k1x, J.k1y, J.a1x, J.a1y, 42 + wob, col)
  seg(g, J.p2x, J.p2y, J.k2x, J.k2y, 46 - wob, col)
  seg(g, J.k2x, J.k2y, J.a2x, J.a2y, 42 - wob, col)
  seg(g, J.hx, J.hy, J.nx, J.ny, 64 + wob, col)
  seg(g, J.s1x, J.s1y, J.e1x, J.e1y, 40, col)
  seg(g, J.e1x, J.e1y, J.w1x, J.w1y, 38, col)
  seg(g, J.s2x, J.s2y, J.e2x, J.e2y, 40, col)
  seg(g, J.e2x, J.e2y, J.w2x, J.w2y, 38, col)
  g.beginPath()
  g.arc(J.cx, J.cy, 34 + wob, 0, Math.PI * 2)
  g.fillStyle = col
  g.fill()
  // rising flame tongues
  g.globalAlpha = heat * 0.55
  g.fillStyle = '#9fd0ff'
  for (let i = 0; i < 7; i++) {
    const ph = (flick * 2.2 + i * 0.37) % 1
    const x = J.hx + (i - 3) * 13 + Math.sin(i * 7.1 + flick * 9) * 6
    const y = J.hy + 40 - ph * 190
    const r = 7 * (1 - ph)
    g.beginPath()
    g.moveTo(x, y - r * 3)
    g.quadraticCurveTo(x + r, y, x, y + r)
    g.quadraticCurveTo(x - r, y, x, y - r * 3)
    g.fill()
  }
  g.restore()
}

/**
 * Draw a character. (x, y) = where the root's ground point lands on the canvas, s = scale, flip = face left.
 * `flick` is any monotonically moving number (for aura flicker); pass 0 when static.
 */
export function drawFigure(g: G, p: Pose, look: Look, x: number, y: number, s: number, flip: boolean, flick = 0): void {
  solve(p)
  const pal = PAL[look.outfit]
  const rim = look.rim ?? pal.rim
  g.save()
  g.translate(x, y)
  g.scale(flip ? -s : s, s)
  if (p.rot) {
    g.translate(J.hx, J.hy)
    g.rotate(p.rot)
    g.translate(-J.hx, -J.hy)
  }
  g.lineCap = 'round'
  g.lineJoin = 'round'
  if (look.heat) aura(g, look.heat, flick)
  // far side first
  const far = darker(look.outfit)
  const farRim = look.outfit === 'shadow' || look.outfit === 'hint' || look.outfit === 'locked' ? null : rim
  arm(g, J.s2x, J.s2y, J.e2x, J.e2y, J.w2x, J.w2y, p.a2b, p.o2, far, look.outfit, farRim)
  leg(g, J.p2x, J.p2y, J.k2x, J.k2y, J.a2x, J.a2y, p.f2, far, look.outfit, farRim)
  // neck
  seg(g, J.nx - J.ux * 6, J.ny - J.uy * 6, J.cx, J.cy + 8, 13 + OL * 2, INK)
  seg(g, J.nx - J.ux * 6, J.ny - J.uy * 6, J.cx, J.cy + 8, 13, pal.skinShade)
  torso(g, pal, look.outfit, rim, look.outfit === 'gi' || look.outfit === 'shadow')
  leg(g, J.p1x, J.p1y, J.k1x, J.k1y, J.a1x, J.a1y, p.f1, pal, look.outfit, rim)
  if (look.outfit === 'gi' || look.outfit === 'shadow') {
    // gi jacket skirt over the front thigh top
    g.fillStyle = pal.top
    g.beginPath()
    tl(g, -2, 2, true)
    tl(g, 17.2, 2)
    tl(g, 17, -12)
    tl(g, -1, -12)
    g.closePath()
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.beginPath()
    tl(g, 17, -12, true)
    tl(g, -1, -12)
    g.stroke()
    if (rim) {
      g.strokeStyle = rim
      g.lineWidth = 2.4
      g.beginPath()
      tl(g, 15.2, 1, true)
      tl(g, 15, -11)
      g.stroke()
    }
  }
  head(g, look, pal)
  arm(g, J.s1x, J.s1y, J.e1x, J.e1y, J.w1x, J.w1y, p.a1b, p.o1, pal, look.outfit, rim)
  g.restore()
}

/** Far-side limbs read one step darker (depth). */
const DARK: Record<Outfit, Palette> = {
  gi: { ...PAL.gi, top: '#dcdbe8', topShade: '#acadc6', leg: '#dcdbe8', legShade: '#acadc6', skin: '#c48d57', skinShade: '#9c6634', hand: '#c48d57', handShade: '#9c6634', foot: '#c48d57', footShade: '#9c6634' },
  casual: { ...PAL.casual, top: '#18181f', topShade: '#0c0c11', leg: '#28325a', legShade: '#1a2140', hand: '#c48d57', handShade: '#9c6634', foot: '#dcd8cc', footShade: '#a8a294' },
  shadow: { ...PAL.shadow, top: '#16131f', topShade: '#0a0910', leg: '#16131f', legShade: '#0a0910', hand: '#1b1727', handShade: '#0c0a12', foot: '#16131f', footShade: '#0a0910', rim: null },
  hint: { ...PAL.hint, top: '#15121f', topShade: '#0a0910', leg: '#15121f', legShade: '#0a0910', hand: '#191524', handShade: '#0c0a12', foot: '#15121f', footShade: '#0a0910', rim: null },
  locked: { ...PAL.locked, top: '#141226', topShade: '#0e0c1e', leg: '#141226', legShade: '#0e0c1e', hand: '#141226', handShade: '#0e0c1e', foot: '#141226', footShade: '#0e0c1e' },
}
const darker = (outfit: Outfit): Palette => DARK[outfit]

// ───────────────────────── pose library ─────────────────────────
/** Karate fighting stance (kamae). */
export const KAMAE = P({ t: 0.12, h: -0.06, l1a: 0.36, l1b: 0.06, l2a: -0.36, l2b: -0.16, a1a: 1.05, a1b: 2.35, a2a: 0.45, a2b: 2.75, f1: 1.62, f2: 1.45, o1: 0, o2: 0 })
export const KAMAE_LOW = P({ ...KAMAE, l1a: 0.46, l1b: 0.0, l2a: -0.44, l2b: -0.08, t: 0.16 })
/** Lead-hand jab (kizami-zuki). */
export const JAB = P({ ...KAMAE, x: 14, t: 0.24, h: -0.12, l1a: 0.62, l1b: 0.1, l2a: -0.5, l2b: -0.4, a1a: 1.74, a1b: 1.8, a2a: 0.5, a2b: 2.8 })
/** Reverse punch (gyaku-zuki), back fist out, front fist pulled to the hip. */
export const GYAKU = P({ ...KAMAE, x: 30, t: 0.3, h: -0.16, l1a: 0.8, l1b: 0.08, l2a: -0.62, l2b: -0.58, a1a: -0.25, a1b: 1.95, a2a: 1.52, a2b: 1.57, f2: 1.25 })
/** Chamber for a kick. */
export const CHAMBER = P({ ...KAMAE, x: 6, t: -0.05, l1a: 1.7, l1b: -0.1, l2a: -0.08, l2b: 0.0, f1: 2.2, a1a: 0.8, a1b: 2.5, a2a: 0.3, a2b: 2.7 })
/** Front kick (mae-geri) at body height. */
export const MAE = P({ ...KAMAE, x: 20, t: -0.18, h: 0.1, l1a: 1.55, l1b: 1.48, l2a: -0.12, l2b: -0.02, f1: 2.4, a1a: 0.75, a1b: 2.2, a2a: 0.15, a2b: 2.5 })
/** High roundhouse (jodan mawashi-geri). */
export const MAWASHI = P({ ...KAMAE, x: 24, t: -0.55, h: 0.36, l1a: 2.32, l1b: 2.2, l2a: -0.06, l2b: 0.04, f1: 1.95, a1a: 0.5, a1b: 0.8, a2a: -0.4, a2b: 1.2 })
export const MAWASHI_CHAMBER = P({ ...KAMAE, x: 10, t: -0.32, h: 0.2, l1a: 2.0, l1b: 0.4, l2a: -0.08, l2b: 0.02, f1: 1.4, a1a: 0.6, a1b: 1.2, a2a: -0.2, a2b: 1.8 })
/** Block (high guard). */
export const BLOCK = P({ ...KAMAE, x: -6, t: 0.0, h: 0.12, a1a: 0.72, a1b: 2.95, a2a: 0.5, a2b: 2.75, l1a: 0.28, l1b: 0.1 })
/** Hit reaction (head snapped back). */
export const HURT = P({ ...KAMAE, x: -18, t: -0.42, h: -0.38, l1a: 0.3, l1b: 0.16, l2a: -0.42, l2b: -0.26, a1a: 0.95, a1b: 0.5, a2a: -0.35, a2b: -0.1, o1: 1, o2: 1 })
/** Heavy hit reaction (body folds). */
export const HURT_BODY = P({ ...KAMAE, x: -22, t: 0.42, h: 0.3, l1a: 0.2, l1b: 0.32, l2a: -0.5, l2b: -0.22, a1a: 0.4, a1b: 0.9, a2a: 0.2, a2b: 0.8 })
/** Knocked flying, then lying on the back. */
export const LAUNCH = P({ ...KAMAE, x: -70, y: -60, g: 1, t: -0.9, h: -0.5, l1a: 0.9, l1b: 0.5, l2a: 0.3, l2b: 0.1, a1a: 2.2, a1b: 2.6, a2a: -1.4, a2b: -1.9, o1: 1, o2: 1, rot: -0.5 })
export const DOWN = P({ ...KAMAE, x: -150, y: -12, g: 0, t: -1.5, h: -0.2, l1a: 1.35, l1b: 1.62, l2a: 1.1, l2b: 1.75, a1a: -1.75, a1b: -1.5, a2a: -1.42, a2b: -1.62, f1: 3.0, f2: 3.0, o1: 1, o2: 1, rot: 0 })
/** Ready stance (yoi). */
export const YOI = P({ t: 0.0, l1a: 0.12, l1b: 0.02, l2a: -0.12, l2b: -0.02, a1a: 0.3, a1b: 0.62, a2a: 0.2, a2b: 0.58, o1: 0, o2: 0 })
/** Karate bow (rei): feet together, back straight, hands at the sides. */
export const REI = P({ t: 0.55, h: 0.18, l1a: 0.03, l1b: -0.02, l2a: -0.03, l2b: -0.04, a1a: 0.42, a1b: 0.3, a2a: 0.36, a2b: 0.24, o1: 1, o2: 1 })
/** Stage bow: deep, one hand on the belly, one behind the back. */
export const STAGE_BOW = P({ t: 0.82, h: 0.12, l1a: 0.05, l1b: 0.0, l2a: -0.05, l2b: -0.05, a1a: 0.08, a1b: -1.35, a2a: 0.12, a2b: 0.08, o1: 1, o2: 1 })
/** Speech at a podium: lead hand gestures (modulated in code). */
export const SPEECH = P({ t: 0.06, h: -0.04, a1a: 1.2, a1b: 2.0, a2a: 0.75, a2b: 1.45, o1: 1, o2: 1 })
/** Wave. */
export const WAVE = P({ a1a: 2.55, a1b: 3.05, o1: 1 })
/** Select-screen pose: casual clothes, fight-ready (front fist up, back fist low). */
export const READY = P({ t: 0.07, h: -0.05, l1a: 0.32, l1b: 0.06, l2a: -0.3, l2b: -0.1, a1a: 0.78, a1b: 2.3, a2a: 0.32, a2b: 1.95, f1: 1.62, f2: 1.48, o1: 0, o2: 0 })
/** A relaxed, confident stand for portraits. */
export const PORTRAIT = P({ t: 0.03, h: -0.04, l1a: 0.14, l1b: 0.04, l2a: -0.12, l2b: -0.05, a1a: 0.16, a1b: 0.2, a2a: -0.06, a2b: 0.05, o1: 0, o2: 0 })
