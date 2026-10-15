/** Small pure helpers shared by the opening's art and camera. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
export const smooth = (x: number): number => {
  const u = clamp01(x)
  return u * u * (3 - 2 * u)
}
/** Number -> short SVG string. */
export const f = (n: number): string => (Math.round(n * 100) / 100).toString()

/** Deterministic PRNG (mulberry32): the art is identical on every visit. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash of an integer to 0..1 (for deterministic flicker steps). */
export function hash1(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through (xs, ys). Smooth (C1) and never overshoots, so a camera
 * that only moves forward never drifts backwards between keys. `endSlope0` forces a zero slope at the last key;
 * `startScale` scales the first key's slope (an ease-in when < 1).
 */
export function monotone(xs: readonly number[], ys: readonly number[], endSlope0 = true, startScale = 1): (x: number) => number {
  const n = xs.length
  const d: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  m.push(d[0] * startScale)
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2)
  m.push(endSlope0 ? 0 : d[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const tau = 3 / Math.sqrt(s)
      m[i] = tau * a * d[i]
      m[i + 1] = tau * b * d[i]
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
    )
  }
}
