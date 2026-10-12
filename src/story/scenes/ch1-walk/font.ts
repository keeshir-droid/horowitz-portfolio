/** Tiny 3x5 pixel font for in-world signs. '#' = ink. Rows are 3 chars, 5 rows per glyph. */
const RAW: Record<string, string> = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
  '0': '###|#.#|#.#|#.#|###', '1': '.#.|##.|.#.|.#.|###', '2': '##.|..#|.#.|#..|###', '3': '##.|..#|.#.|..#|##.', '4': '#.#|#.#|###|..#|..#', '5': '###|#..|##.|..#|##.', '6': '.##|#..|###|#.#|###', '7': '###|..#|.#.|.#.|.#.', '8': '###|#.#|###|#.#|###', '9': '###|#.#|###|..#|##.',
  '!': '.#.|.#.|.#.|...|.#.', '?': '##.|..#|.#.|...|.#.', '.': '...|...|...|...|.#.', ',': '...|...|...|.#.|#..',
  ':': '...|.#.|...|.#.|...', '-': '...|...|###|...|...', "'": '.#.|.#.|...|...|...', ' ': '...|...|...|...|...',
}

const GLYPHS: Record<string, Uint8Array> = {}
for (const [ch, rows] of Object.entries(RAW)) {
  const bits = new Uint8Array(15)
  rows.split('|').forEach((row, y) => {
    for (let x = 0; x < 3; x++) bits[y * 3 + x] = row[x] === '#' ? 1 : 0
  })
  GLYPHS[ch] = bits
}

export const textWidth = (s: string): number => Math.max(0, s.length * 4 - 1)

/** Draw `s` (uppercased) with its top-left at integer (x, y). */
export function drawText(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string): void {
  g.fillStyle = color
  let cx = x | 0
  const cy = y | 0
  for (let i = 0; i < s.length; i++) {
    const glyph = GLYPHS[s[i].toUpperCase()] ?? GLYPHS['?']
    for (let k = 0; k < 15; k++) if (glyph[k]) g.fillRect(cx + (k % 3), cy + ((k / 3) | 0), 1, 1)
    cx += 4
  }
}

/** Same as drawText but each font pixel becomes a scale x scale block (used for the title if the web font is missing). */
export function drawTextScaled(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, scale: number): void {
  g.fillStyle = color
  let cx = x | 0
  for (let i = 0; i < s.length; i++) {
    const glyph = GLYPHS[s[i].toUpperCase()] ?? GLYPHS['?']
    for (let k = 0; k < 15; k++) if (glyph[k]) g.fillRect(cx + (k % 3) * scale, (y | 0) + ((k / 3) | 0) * scale, scale, scale)
    cx += 4 * scale
  }
}
export const textWidthScaled = (s: string, scale: number): number => Math.max(0, s.length * 4 * scale - scale)
