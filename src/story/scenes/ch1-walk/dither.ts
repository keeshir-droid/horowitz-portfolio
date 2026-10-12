import { BAYER4 } from './palette.ts'

/**
 * Convert RGBA pixels to Game Boy shade indices (0 darkest .. 3 lightest) with 4x4 ordered dithering.
 * Pure and DOM-free so it can be unit-tested in Node. `contrast` stretches the luminance around the
 * image's own min/max so a flat photo still uses all four shades.
 */
export function ditherToShades(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number, out?: Uint8Array): Uint8Array {
  const n = w * h
  const res = out && out.length >= n ? out : new Uint8Array(n)
  const lum = new Float32Array(n)
  let lo = 255
  let hi = 0
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const a = rgba[o + 3] / 255
    const l = (0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2]) * a + 255 * (1 - a)
    lum[i] = l
    if (l < lo) lo = l
    if (l > hi) hi = l
  }
  const span = Math.max(1, hi - lo)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const v = ((lum[i] - lo) / span) * 3 // 0..3
      const base = Math.floor(v)
      const frac = v - base
      const thr = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16
      res[i] = Math.min(3, base + (frac > thr ? 1 : 0))
    }
  }
  return res
}

/** Cover-fit a source image into a (w x h) canvas and return its dithered shade map. */
export function ditherImageToShades(img: CanvasImageSource, srcW: number, srcH: number, w: number, h: number): Uint8Array | null {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  const s = Math.max(w / srcW, h / srcH)
  const dw = srcW * s
  const dh = srcH * s
  g.imageSmoothingEnabled = true
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
  return ditherToShades(g.getImageData(0, 0, w, h).data, w, h)
}

/** Deterministic test picture (sky gradient, sun, a "face" disc) used to check the dither. */
export function makeTestImage(w: number, h: number): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      let l = 40 + (y / h) * 150
      const dx = x - w * 0.5
      const dy = y - h * 0.55
      if (dx * dx + dy * dy < (w * 0.28) ** 2) l = 90 + 30 * Math.sin(x * 0.4)
      if ((x - w * 0.8) ** 2 + (y - h * 0.2) ** 2 < (w * 0.1) ** 2) l = 250
      d[o] = d[o + 1] = d[o + 2] = l
      d[o + 3] = 255
    }
  }
  return d
}
