// OWNER: page agent D. The flipbook riffle (12 spreads of scribbled diary pages) and the final spread.
// Static pages: no ink animation. The engine draws the corner doodle (kit.corner) on every right page;
// right pages keep the box x >= 54, y >= 66 empty.
import { INK, row, scribbles, svg } from '../kit'
import type { DiaryPage } from '../types'

/** Month / grade headers for the 24 riffle right pages, in order (time flies: grade 9 to the end of grade 12). */
const HEADERS = [
  'NOVEMBER', 'DECEMBER', 'FEBRUARY', 'APRIL',
  'GRADE 10', 'SEPTEMBER', 'NOVEMBER', 'JANUARY', 'MARCH', 'MAY',
  'GRADE 11', 'AUGUST', 'OCTOBER', 'DECEMBER', 'FEBRUARY', 'APRIL',
  'GRADE 12', 'SEPTEMBER', 'NOVEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY',
]

const COPY = {
  finalMonth: 'JUNE',
  finalLine: '...and that was high school.',
  finalAside: '(more or less.)',
}

/** Deterministic small RNG per seed. */
function rng(seed: number): () => number {
  let s = (seed * 48271 + 11) % 2147483647
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** A short, darker "day name" squiggle with an underline, like a dated entry heading. */
function dayMark(r: number, seed: number): string {
  const R = rng(seed + 500)
  const w = 9 + R() * 6
  let d = `M7.4,${4 * r + 2.7}`
  for (let x = 0; x < w; ) {
    const k = 0.9 + R() * 1.1
    d += ` q${(k / 2).toFixed(2)},${(-(0.6 + R() * 1.2)).toFixed(2)} ${k.toFixed(2)},0`
    x += k
  }
  return `<path d="${d}" fill="none" stroke="#5a5a5a" stroke-width=".4"/><path d="M7.2,${4 * r + 3.5} L${(7.6 + w).toFixed(1)},${4 * r + 3.4}" stroke="#5a5a5a" stroke-width=".35" fill="none"/>`
}

// Sparse margin doodles (ink, small).
const star = (x: number, y: number, s = 1): string => {
  const p = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = (i % 2 ? 1.1 : 2.6) * s
    return `${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`
  })
  return `<path d="M${p.join(' L')} Z" fill="none" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>`
}
const cube = (x: number, y: number): string =>
  `<path d="M${x},${y} h4 v4 h-4 Z M${x + 1.6},${y - 1.6} h4 v4 h-4 Z M${x},${y} l1.6,-1.6 M${x + 4},${y} l1.6,-1.6 M${x + 4},${y + 4} l1.6,-1.6 M${x},${y + 4} l1.6,-1.6" fill="none" stroke="${INK}" stroke-width=".4" stroke-linejoin="round"/>`
const spiral = (x: number, y: number): string =>
  `<path d="M${x},${y} q1,-1 1.6,0 q.6,1.6 -1.4,2 q-2.4,.2 -2.4,-2.2 q.2,-3 3.4,-2.6 q3,.6 2.4,3.8" fill="none" stroke="${INK}" stroke-width=".4"/>`
const doodleArrow = (x: number, y: number): string =>
  `<path d="M${x},${y} q3,-2 7,-.4 M${x + 7},${y - 0.4} l-1.8,-1.3 M${x + 7},${y - 0.4} l-1.9,1" fill="none" stroke="${INK}" stroke-width=".45" stroke-linecap="round"/>`

/** Doodles for a few pages only (keyed by riffle index), placed in clear margins (top right, or below short entries). */
const RIGHT_DOODLES: Record<number, string> = {
  1: star(68, 6.2, 0.9),
  4: cube(10, 74),
  8: doodleArrow(9, 82),
  10: star(12, 6, 0.8) + star(68.5, 6.4, 0.7),
}
const LEFT_DOODLES: Record<number, string> = {
  2: spiral(62, 5.4),
  6: star(63, 5, 0.9),
  9: cube(60, 3.4),
}

/** Right riffle page k: header on row 1, then one or two scribbled "entries" that stay clear of the corner box. */
function rightPage(k: number): DiaryPage {
  const R = rng(k + 1)
  const n1 = 4 + Math.floor(R() * 5) // rows 3 .. 3+n1-1
  const two = R() > 0.4
  let parts = scribbles(3, n1, 100 + k, 52 + R() * 10)
  if (two) {
    const r2 = 3 + n1 + 1
    const n2 = 2 + Math.floor(R() * 4)
    const top = Math.min(n2, Math.max(0, 16 - (r2 + 1))) // rows above the corner box: full width
    const low = n2 - top // rows from 16 down: keep short (end before x ≈ 51)
    parts += svg(dayMark(r2, k))
    if (top > 0) parts += scribbles(r2 + 1, top, 200 + k, 50 + R() * 12)
    if (low > 0) parts += scribbles(r2 + 1 + top, low, 300 + k, 42)
  }
  if (RIGHT_DOODLES[k]) parts += svg(RIGHT_DOODLES[k])
  return { id: `riffle-r${k}`, side: 'r', html: `${row(1, HEADERS[k], 'dp-month')}${parts}` }
}

/** Left riffle page k: full page of scribbles, sometimes split into two dated entries. */
function leftPage(k: number, id = `riffle-l${k}`, seedBase = 1000): DiaryPage {
  const R = rng(seedBase + k)
  let parts = ''
  let r = 1
  const blocks = R() > 0.5 ? 2 : 1
  for (let b = 0; b < blocks && r < 21; b++) {
    parts += svg(dayMark(r, seedBase + k * 3 + b))
    r += 1
    const n = blocks === 1 ? 14 + Math.floor(R() * 7) : 5 + Math.floor(R() * 5)
    const nn = Math.min(n, 22 - r)
    parts += scribbles(r, nn, seedBase + 37 * k + b, 56 + R() * 8)
    r += nn + 1
  }
  if (LEFT_DOODLES[k] && seedBase === 1000) parts += svg(LEFT_DOODLES[k])
  return { id, side: 'l', html: parts }
}

/** 24 flipbook spreads (left = back of the previous leaf, right = a page with a month/grade header). */
export const riffleSpreads: { left: DiaryPage; right: DiaryPage }[] = HEADERS.map((_, k) => ({
  left: leftPage(k),
  right: rightPage(k),
}))

export const finalSpread: { left: DiaryPage; right: DiaryPage } = {
  left: leftPage(0, 'final-l', 2000),
  right: {
    id: 'final',
    side: 'r',
    html: `${row(1, COPY.finalMonth, 'dp-month')}${row(3, COPY.finalLine)}${row(4, COPY.finalAside, 'dp-grey')}`,
  },
}
