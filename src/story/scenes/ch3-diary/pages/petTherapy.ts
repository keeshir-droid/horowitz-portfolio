// OWNER: page agent D. Spread 4 ("pet"): the pet therapy attempt (left) and the "now flip fast" page (right).
import { INK, appear, arrow, ink, kid, label, needed, row, svg, tick } from '../kit'
import type { DiaryPage } from '../types'
import { settleInk } from './java'

/** All narration on these two pages (draft wording; Risheek edits here). Facts come from entries.ts ('pet-therapy'). */
const COPY = {
  day: 'Friday',
  l1: 'I tried to start a pet therapy initiative.',
  l2: 'Nobody at my school had tried before.',
  l3: 'The plan:',
  steps: ['1. be the first to try', '2. keep trying (relentlessly)', '3. get quite far', '4. get it approved'],
  howFar: needed('what stage it reached'),
  sign: 'PET THERAPY?',
  end: '3 out of 4. Sadly, number 4 was the point.',
  flip: '(okay. now flip fast.)',
  watch: 'watch the corner',
}

/** A checkbox with a hand-drawn cross (two strokes) instead of a tick. Uses the engine's .dp-tick drawing. */
const cross = (at: number): string =>
  `<svg class="dp-cb" viewBox="0 0 10 10" aria-hidden="true"><rect x=".6" y=".6" width="8.4" height="8.4" fill="none" stroke="${INK}" stroke-width="1"/>` +
  `<path class="dp-tick" data-t="${at}" d="M-.6,-.4 L10.4,10.2" pathLength="1" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>` +
  `<path class="dp-tick" data-t="${at + 0.045}" d="M10.2,-.6 L-.2,10.4" pathLength="1" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`

/** A hopeful dog sitting at (x, y = ground), facing left, head tilted up towards the kid. */
function dog(x: number, y: number): string {
  const t = (dx: number, dy: number): string => `${(x + dx).toFixed(2)},${(y + dy).toFixed(2)}`
  const hx = x + 2.4
  const hy = y - 19.4
  const h = (dx: number, dy: number): string => `${(hx + dx).toFixed(2)},${(hy + dy).toFixed(2)}`
  return `<g stroke="${INK}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${t(9, -1)} Q${t(14, -4)} ${t(14.5, -10)}" fill="none"/>
    <path d="M${t(14.2, -12.6)} l1.4,-1 M${t(15.8, -10.4)} l1.7,-.2 M${t(12.4, -13.4)} l.4,-1.5" stroke-width=".5" fill="none"/>
    <path d="M${t(-1, 0)} Q${t(-3, -10)} ${t(2, -15)} Q${t(8, -18)} ${t(10, -11)} Q${t(11.5, -5)} ${t(9.5, 0)} Z" fill="#fff"/>
    <path d="M${t(1.2, -9)} L${t(1.2, 0)} M${t(4.2, -9)} L${t(4.2, 0)}" fill="none"/>
    <ellipse cx="${x + 0.4}" cy="${y + 0.2}" rx="2" ry=".9" fill="#fff"/><ellipse cx="${x + 4.6}" cy="${y + 0.2}" rx="2" ry=".9" fill="#fff"/>
    <ellipse cx="${x + 9.5}" cy="${y - 0.4}" rx="2.6" ry="1.1" fill="#fff"/>
    <path d="M${t(-1.2, -14.8)} Q${t(2.6, -12.6)} ${t(6.6, -14.4)}" fill="none" stroke-width=".9"/>
    <circle cx="${x + 2.8}" cy="${y - 13}" r=".8" fill="#fff" stroke-width=".6"/>
    <g transform="rotate(18 ${hx} ${hy})">
      <path d="M${h(-2.6, -3.4)} Q${h(-8.4, -3.8)} ${h(-8.6, -1.2)} Q${h(-8.4, 1.6)} ${h(-2.8, 2.4)}" fill="#fff"/>
      <path d="M${h(0.4, -4.4)} Q${h(6.4, -5.4)} ${h(7, 0.6)} Q${h(6.8, 4.6)} ${h(4.4, 4.4)} Q${h(4, 0.4)} ${h(2.2, -1)} Z" fill="${INK}"/>
      <circle cx="${hx}" cy="${hy}" r="4.6" fill="#fff"/>
      <path d="M${h(-2.6, -3.3)} Q${h(-3.4, -0.4)} ${h(-2.8, 2.3)}" stroke="#fff" stroke-width="1.4" fill="none"/>
      <ellipse cx="${hx - 8.2}" cy="${hy - 2.6}" rx="1" ry=".8" fill="${INK}"/>
      <path d="M${h(-8.2, 0.4)} Q${h(-6.4, 1.2)} ${h(-5, 0.2)}" fill="none" stroke-width=".55"/>
      <circle cx="${hx - 1.6}" cy="${hy - 1.4}" r="1.35" fill="#fff" stroke-width=".7"/>
      <circle cx="${hx - 2.1}" cy="${hy - 1.9}" r=".7" fill="${INK}" stroke="none"/>
      <path d="M${h(-3.2, -3.6)} Q${h(-1.6, -4.2)} ${h(-0.2, -3.4)}" fill="none" stroke-width=".55"/>
    </g>
  </g>`
}

/** A small thought cloud with a hopeful question mark, above the dog. */
const hope = (x: number, y: number): string =>
  `<circle cx="${x - 7}" cy="${y + 8.6}" r=".7" fill="#fff" stroke="${INK}" stroke-width=".6"/>
  <circle cx="${x - 4.6}" cy="${y + 5.6}" r="1.1" fill="#fff" stroke="${INK}" stroke-width=".6"/>
  <path d="M${x - 3.4},${y + 1.6} q-2.2,-2.6 .6,-4.2 q1.4,-2.6 4.4,-1.4 q3,-1.2 4.2,1.6 q2.6,1.6 .4,4.2 q-1.6,2.2 -4.6,1.2 q-3,1.2 -5,-1.4 Z" fill="#fff" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>
  <text x="${x + 1}" y="${y + 1.6}" text-anchor="middle" font-family="DiaryHand" font-size="4.4" fill="${INK}" stroke="none">?</text>`

/** The kid holds up a small proposal sign. Local coords: feet at 0, head top ≈ -51. */
const SIGN = `<rect x="11.5" y="-34" width="25" height="10" rx=".6" fill="#fff" stroke="${INK}" stroke-width="1.1"/>
  <text x="24" y="-27.4" text-anchor="middle" font-family="DiaryHand" font-size="3.6" fill="${INK}" stroke="none">${COPY.sign}</text>
  <path d="M17.6,-24 L17.6,-17" stroke="${INK}" stroke-width="1"/>`

export const petTherapy: DiaryPage = {
  id: 'pet-therapy',
  side: 'l',
  entryIds: ['pet-therapy'],
  update: settleInk,
  html: `
    ${row(1, appear(0.04, 0.08, COPY.day), 'dp-day')}
    ${row(2, appear(0.08, 0.16, COPY.l1))}
    ${row(3, appear(0.16, 0.23, COPY.l2))}
    ${row(4, appear(0.23, 0.26, COPY.l3))}
    ${row(5, tick(0.3) + appear(0.27, 0.31, COPY.steps[0]))}
    ${row(6, tick(0.36) + appear(0.32, 0.37, COPY.steps[1]))}
    ${row(7, tick(0.42) + appear(0.38, 0.43, COPY.steps[2]) + ' ' + appear(0.43, 0.46, COPY.howFar))}
    ${row(8, cross(0.52) + appear(0.46, 0.51, COPY.steps[3]))}
    ${svg(`
      ${ink(0.54, 0.66, kid(20, 80, 0.64, { armR: 52, armL: 14, extra: SIGN }))}
      ${ink(0.6, 0.72, dog(52, 80))}
      ${ink(0.68, 0.74, hope(66, 44))}
      ${ink(0.62, 0.72, `<path d="M8,80.6 L72,80.6" stroke="${INK}" stroke-width=".5" fill="none"/>`)}
    `)}
    ${row(21, appear(0.7, 0.76, COPY.end))}
  `,
}

export const flipFast: DiaryPage = {
  id: 'flip-fast',
  side: 'r',
  update: settleInk,
  html: `
    ${row(10, appear(0.74, 0.78, COPY.flip), 'dp-grey dp-center')}
    ${svg(`
      ${ink(0.76, 0.79, label(20, 58, COPY.watch, 3.4, 'start', '#7a7a7a'))}
      ${ink(0.77, 0.8, arrow(36, 60.6, 52.4, 76, -0.3))}
    `)}
  `,
}
