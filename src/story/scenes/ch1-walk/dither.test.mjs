// Run: node src/story/scenes/ch1-walk/dither.test.mjs   (Node 22.18+ strips TS types)
import assert from 'node:assert/strict'
import { ditherToShades, makeTestImage } from './dither.ts'

const w = 24
const h = 24
const shades = ditherToShades(makeTestImage(w, h), w, h)
assert.equal(shades.length, w * h)
const used = new Set(shades)
assert.ok([...used].every((v) => v >= 0 && v <= 3), 'values within 0..3')
assert.ok(used.size >= 3, `uses several shades (got ${[...used]})`)
// deterministic
assert.deepEqual(shades, ditherToShades(makeTestImage(w, h), w, h))
// flat black -> shade 0, flat white -> 3 once min/max stretched by a second tone
const two = new Uint8ClampedArray(4 * 4 * 4)
for (let i = 0; i < 16; i++) { const v = i < 8 ? 0 : 255; two.set([v, v, v, 255], i * 4) }
const t = ditherToShades(two, 4, 4)
assert.ok(t.slice(0, 8).every((v) => v === 0) && t.slice(8).every((v) => v === 3))
// print a tiny ASCII preview
const ch = ' .oO'
let txt = ''
for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) txt += ch[shades[y * w + x]]; txt += '\n' }
console.log(txt)
console.log('dither tests passed; shades used:', [...used].sort().join(','))
