/** The four Game Boy shades, darkest to lightest (same greens as src/gate/Opening.tsx). */
export const PAL = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] as const
/** Same shades packed little-endian (0xAABBGGRR) for ImageData Uint32 views. */
export const PAL32 = new Uint32Array([
  [0x0f, 0x38, 0x0f],
  [0x30, 0x62, 0x30],
  [0x8b, 0xac, 0x0f],
  [0x9b, 0xbc, 0x0f],
].map(([r, g, b]) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0))

/** Shade index lookup by the red channel (15 / 48 / 139 / 155), tolerant of antialiasing. */
export const SHADE_BY_RED = new Uint8Array(256)
for (let r = 0; r < 256; r++) SHADE_BY_RED[r] = r < 32 ? 0 : r < 92 ? 1 : r < 147 ? 2 : 3

/** 4x4 ordered-dither matrix (Bayer), values 0..15. */
export const BAYER4 = new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5])
