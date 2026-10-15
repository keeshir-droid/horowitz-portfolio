/**
 * Procedural San Francisco at golden hour, laid out in viewport pixels (so the sun is always at SUN.x / SUN.y and the
 * horizon at WATER_Y on any aspect, matching Chapter 4's window). Pure: same (w, h) -> same strings. Built once per
 * size; the per-frame work (index.tsx) only moves layers and fades groups.
 *
 * Original drawing, not traced: a suspension bridge with two art-deco towers on the left, downtown towers on the
 * right (one pointed, one round-topped), a hazier back row, hills, lit windows bucketed into a few paths.
 */
import { SUN, WATER_Y } from './config'

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k
const f = (n: number): string => (Math.round(n * 10) / 10).toString()

/** Deterministic PRNG (mulberry32): the city looks the same on every visit. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Kind = 'box' | 'step' | 'pyramid' | 'round' | 'mast'
/** Front row of downtown: [centre 0..1 across the cluster, width fraction, height (fraction of viewport h), kind]. */
const FRONT: readonly (readonly [number, number, number, Kind])[] = [
  [0.0, 0.05, 0.09, 'box'],
  [0.05, 0.045, 0.13, 'step'],
  [0.11, 0.05, 0.2, 'box'],
  [0.165, 0.045, 0.27, 'step'],
  [0.215, 0.034, 0.4, 'pyramid'],
  [0.27, 0.05, 0.25, 'box'],
  [0.33, 0.056, 0.44, 'round'],
  [0.39, 0.045, 0.31, 'mast'],
  [0.445, 0.05, 0.22, 'step'],
  [0.5, 0.05, 0.15, 'box'],
  [0.555, 0.06, 0.11, 'box'],
  [0.615, 0.05, 0.085, 'box'],
  [0.67, 0.055, 0.105, 'step'],
  [0.725, 0.05, 0.08, 'box'],
  [0.78, 0.05, 0.17, 'step'],
  [0.835, 0.055, 0.21, 'box'],
  [0.89, 0.05, 0.145, 'mast'],
  [0.945, 0.06, 0.115, 'box'],
  [1.0, 0.05, 0.085, 'box'],
]

export interface Skyline {
  w: number
  h: number
  horizon: number
  /** Far ridge (lighter, hazier) and near hills. */
  ridgeFar: string
  ridgeNear: string
  /** Bridge: towers (filled), main + side cables (stroked), suspenders (thin stroke), deck (filled). */
  towers: string
  cables: string
  suspenders: string
  deck: string
  cableW: number
  suspW: number
  /** Hazier back row of buildings. */
  backCity: string
  /** Front row silhouette, its sun-side rim light, and lit windows bucketed by switch-on order (0 first). */
  city: string
  rim: string
  windows: string[]
  /** A small sailboat shape at the origin (translated per frame). */
  boat: string
  boatSize: number
}

export const WINDOW_BUCKETS = 8

export function buildSkyline(w: number, h: number): Skyline {
  const hz = WATER_Y * h
  const aspect = w / Math.max(1, h)
  /** 0 = tall phone, 1 = wide desktop. */
  const q = clamp01((aspect - 0.55) / (1.5 - 0.55))
  const sx = (fr: number): number => fr * w
  const R = rng(5150)

  // ── hills ──
  const ridge = (base: number, amp: number, marin: number, seed: number): string => {
    const r = rng(seed)
    const n = 14
    let d = `M0 ${f(hz + 2)} L0 ${f(hz - (base + marin) * h)}`
    let px = 0
    let py = hz - (base + marin) * h
    for (let i = 1; i <= n; i++) {
      const x = (i / n) * w
      const fx = i / n
      // Marin headlands on the left are higher; East Bay hills gentle on the right
      const lift = marin * Math.max(0, 1 - fx * 2.6) + base + amp * (0.4 + 0.6 * r())
      const y = hz - lift * h
      d += ` Q${f(px + (x - px) * 0.5)} ${f(Math.min(py, y) - amp * 0.35 * h)} ${f(x)} ${f(y)}`
      px = x
      py = y
    }
    return `${d} L${f(w)} ${f(hz + 2)} Z`
  }
  const ridgeFar = ridge(0.05, 0.035, 0.07, 11)
  const ridgeNear = ridge(0.018, 0.022, 0.05, 23)

  // ── bridge (left): span in viewport fractions, towers at 22% / 78% of it ──
  const b0 = lerp(-0.42, -0.04, q)
  const b1 = lerp(0.36, 0.35, q)
  const bw = (b1 - b0) * w
  const deckY = hz - 0.045 * h
  const towerH = lerp(0.15, 0.165, q) * h
  const tA = sx(b0) + bw * 0.22
  const tB = sx(b0) + bw * 0.78
  const leg = Math.max(2.5, 0.0075 * h)
  const gap = Math.max(5, 0.016 * h)
  let towers = ''
  for (const tx of [tA, tB]) {
    const top = deckY - towerH
    const l = tx - gap / 2 - leg
    const r = tx + gap / 2
    // two legs, slightly tapered by a stepped top (art-deco feel)
    towers += `M${f(l)} ${f(hz + 2)} V${f(top + leg * 1.2)} h${f(leg * 0.25)} V${f(top)} h${f(leg * 0.75)} V${f(hz + 2)} Z `
    towers += `M${f(r)} ${f(hz + 2)} V${f(top)} h${f(leg * 0.75)} V${f(top + leg * 1.2)} h${f(leg * 0.25)} V${f(hz + 2)} Z `
    // portals (cross beams), closer together towards the top
    for (const k of [0.04, 0.27, 0.5, 0.72]) {
      const y = top + towerH * k
      const th = Math.max(1.5, leg * (k < 0.1 ? 0.9 : 0.6))
      towers += `M${f(l)} ${f(y)} H${f(r + leg)} v${f(th)} H${f(l)} Z `
    }
  }
  const cableTop = deckY - towerH + leg * 0.5
  const sag = deckY - 0.008 * h
  // Main span: quadratic through the low point (control = 2*low - top). Side spans: dropping to the anchorages.
  const ctrlY = 2 * sag - cableTop
  const midX = (tA + tB) / 2
  const anchorL = sx(b0) - bw * 0.02
  const anchorR = sx(b0) + bw * 1.02
  const cables =
    `M${f(tA)} ${f(cableTop)} Q${f(midX)} ${f(ctrlY)} ${f(tB)} ${f(cableTop)} ` +
    `M${f(tA)} ${f(cableTop)} Q${f((tA + anchorL) / 2)} ${f(deckY - towerH * 0.18)} ${f(anchorL)} ${f(deckY)} ` +
    `M${f(tB)} ${f(cableTop)} Q${f((tB + anchorR) / 2)} ${f(deckY - towerH * 0.18)} ${f(anchorR)} ${f(deckY)}`
  // suspenders every ~1.1% of the viewport width (or 9 px), main span only + side spans
  const step = Math.max(7, 0.011 * w)
  const quadY = (x: number, x0: number, x1: number, y0: number, yc: number, y1: number): number => {
    // the quadratic's y at the x along a symmetric-ish curve (x is linear in t for these control points)
    const t = clamp01((x - x0) / (x1 - x0))
    return (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * yc + t * t * y1
  }
  let suspenders = ''
  for (let x = tA + step; x < tB - step * 0.5; x += step) {
    const y = quadY(x, tA, tB, cableTop, ctrlY, cableTop)
    if (deckY - y > 2) suspenders += `M${f(x)} ${f(y)} V${f(deckY)} `
  }
  for (let x = tA - step; x > anchorL + step; x -= step) {
    const y = quadY(x, tA, anchorL, cableTop, deckY - towerH * 0.18, deckY)
    if (deckY - y > 2) suspenders += `M${f(x)} ${f(y)} V${f(deckY)} `
  }
  for (let x = tB + step; x < anchorR - step; x += step) {
    const y = quadY(x, tB, anchorR, cableTop, deckY - towerH * 0.18, deckY)
    if (deckY - y > 2) suspenders += `M${f(x)} ${f(y)} V${f(deckY)} `
  }
  const deckT = Math.max(3, 0.009 * h)
  // deck + approach running into the hills on both ends, with a truss band under it
  const deck =
    `M${f(anchorL - bw * 0.2)} ${f(deckY + deckT * 0.6)} L${f(anchorL)} ${f(deckY)} H${f(anchorR)} L${f(anchorR + bw * 0.12)} ${f(deckY + deckT * 1.2)} ` +
    `V${f(deckY + deckT * 2)} L${f(anchorR)} ${f(deckY + deckT)} H${f(anchorL)} L${f(anchorL - bw * 0.2)} ${f(deckY + deckT * 1.8)} Z`

  // ── downtown: cluster span in viewport fractions; the low section sits under the sun on every aspect ──
  const c0 = lerp(0.2, 0.4, q)
  const c1 = lerp(1.14, 0.97, q)
  const cw = (c1 - c0) * w
  const hScale = lerp(0.88, 1, q)
  const minW = 0.021 * h
  let city = ''
  let rim = ''
  const buckets: string[] = Array.from({ length: WINDOW_BUCKETS }, () => '')
  const winW = Math.max(1.6, 0.0028 * h)
  const winH = Math.max(2.2, 0.0042 * h)
  const sunX = SUN.x * w
  for (const [cx, wf, hf, kind] of FRONT) {
    const bwid = Math.max(wf * cw, minW)
    const x = sx(c0) + cx * cw - bwid / 2
    const top = hz - hf * hScale * h
    const bottom = hz + 0.06 * h // below the horizon so the crane can lift it
    const xr = x + bwid
    switch (kind) {
      case 'pyramid': {
        // narrow tapering tower with a spire and two small "wings" low down
        const apex = top - 0.03 * h
        city += `M${f(x)} ${f(bottom)} V${f(top + (hz - top) * 0.62)} L${f(x - bwid * 0.18)} ${f(top + (hz - top) * 0.6)} L${f(x + bwid * 0.08)} ${f(top + (hz - top) * 0.45)} L${f(x + bwid * 0.5)} ${f(apex)} L${f(xr - bwid * 0.08)} ${f(top + (hz - top) * 0.45)} L${f(xr + bwid * 0.18)} ${f(top + (hz - top) * 0.6)} L${f(xr)} ${f(top + (hz - top) * 0.62)} V${f(bottom)} Z `
        break
      }
      case 'round': {
        // slender tower with a rounded crown
        const k = bwid * 0.5
        city += `M${f(x)} ${f(bottom)} V${f(top + k * 0.9)} Q${f(x + 0.04 * bwid)} ${f(top - k * 0.3)} ${f(x + bwid / 2)} ${f(top - k * 0.42)} Q${f(xr - 0.04 * bwid)} ${f(top - k * 0.3)} ${f(xr)} ${f(top + k * 0.9)} V${f(bottom)} Z `
        break
      }
      case 'step': {
        const s1 = bwid * 0.16
        const d1 = 0.022 * h
        city += `M${f(x)} ${f(bottom)} V${f(top + d1)} H${f(x + s1)} V${f(top)} H${f(xr - s1)} V${f(top + d1)} H${f(xr)} V${f(bottom)} Z `
        break
      }
      case 'mast': {
        const mw = Math.max(1.5, bwid * 0.06)
        city += `M${f(x)} ${f(bottom)} V${f(top)} H${f(xr)} V${f(bottom)} Z M${f(x + bwid / 2 - mw / 2)} ${f(top + 1)} v${f(-0.045 * h)} h${f(mw)} v${f(0.045 * h)} Z `
        break
      }
      default:
        city += `M${f(x)} ${f(bottom)} V${f(top)} H${f(xr)} V${f(bottom)} Z `
    }
    // rim light on the edge that faces the sun (backlit towers)
    const rw = Math.max(1.2, bwid * 0.05)
    const edge = x + bwid / 2 < sunX ? xr - rw : x
    const rimTop = kind === 'round' ? top + bwid * 0.45 : kind === 'pyramid' ? top + (hz - top) * 0.62 : top + (kind === 'step' ? 0.022 * h : 0)
    rim += `M${f(edge)} ${f(rimTop)} V${f(hz)} h${f(rw)} V${f(rimTop)} Z `
    // windows: a sparse grid, each lit window gets a switch-on bucket
    const pitchX = Math.max(winW * 2.6, 0.009 * h)
    const pitchY = Math.max(winH * 2.2, 0.012 * h)
    const cols = Math.max(1, Math.floor((bwid - pitchX * 0.6) / pitchX))
    const ox = x + (bwid - (cols - 1) * pitchX - winW) / 2
    const wTop = kind === 'pyramid' ? top + (hz - top) * 0.66 : kind === 'round' ? top + bwid * 0.7 : top + 0.03 * h
    for (let y = wTop; y < hz - pitchY; y += pitchY) {
      for (let c = 0; c < cols; c++) {
        if (R() > 0.3) continue
        const b = Math.min(WINDOW_BUCKETS - 1, Math.floor(R() * WINDOW_BUCKETS))
        buckets[b] += `M${f(ox + c * pitchX)} ${f(y)} h${f(winW)} v${f(winH)} h${f(-winW)} Z `
      }
    }
  }

  // ── back row: hazier, lower blocks filling the gaps behind downtown ──
  let backCity = ''
  const br = rng(77)
  for (let x = sx(c0) - cw * 0.06; x < sx(c1) + cw * 0.04; ) {
    const bwid = Math.max(minW * 0.9, (0.025 + br() * 0.035) * cw)
    const nearSun = Math.abs(x + bwid / 2 - sunX) < 0.06 * w
    const hh = (nearSun ? 0.04 + br() * 0.04 : 0.06 + br() * 0.12) * hScale * h
    backCity += `M${f(x)} ${f(hz + 0.06 * h)} V${f(hz - hh)} H${f(x + bwid)} V${f(hz + 0.06 * h)} Z `
    x += bwid * (0.75 + br() * 0.4)
  }

  // ── sailboat (origin at the waterline, centre) ──
  const bs = Math.max(10, 0.03 * h)
  const boat = `M${f(-bs * 0.45)} 0 L${f(bs * 0.45)} 0 L${f(bs * 0.32)} ${f(bs * 0.12)} L${f(-bs * 0.34)} ${f(bs * 0.12)} Z M${f(-bs * 0.02)} ${f(-bs * 0.06)} L${f(-bs * 0.02)} ${f(-bs)} L${f(-bs * 0.4)} ${f(-bs * 0.06)} Z M${f(bs * 0.04)} ${f(-bs * 0.85)} L${f(bs * 0.04)} ${f(-bs * 0.06)} L${f(bs * 0.32)} ${f(-bs * 0.06)} Z`

  return {
    w,
    h,
    horizon: hz,
    ridgeFar,
    ridgeNear,
    towers,
    cables,
    suspenders,
    deck,
    cableW: Math.max(1.6, 0.0042 * h),
    suspW: Math.max(0.6, 0.0011 * h),
    backCity,
    city,
    rim,
    windows: buckets,
    boat,
    boatSize: bs,
  }
}
