// OWNER: page agent B. Spread 1, left: the two honor societies (NEHS: the only chapter; SNHS: the first one).
import type { DiaryPage } from '../types'
import { GREY, INK, appear, arrow as kitArrow, entry, ink, kid, label, row, svg } from '../kit'

/** All narration on this page. Draft wording: edit here. */
const COPY = {
  day: 'Wednesday',
  l1: "Some clubs didn't exist yet.",
  l2: 'So we started them.',
  country: 'the whole country',
  nehs1: 'NEHS chapters in',
  nehs2: 'the country:',
  nehsCount: '1.',
  nehsOurs: '(ours.)',
  snhs1: 'SNHS: the first',
  snhs2: 'one in the country.',
  snhsOurs: '(also ours.)',
  myTitle: 'My title, in the English one:',
  plate: 'FOUNDING VICE PRESIDENT',
  plateNote1: 'title: longer',
  plateNote2: 'than me.',
  science: '(the Science one: I was on the board.)',
} as const

// Facts this page shows (throws in dev if an id is wrong). NEHS = English, SNHS = Science, per entries.ts.
const FACTS = [entry('english-honor-society'), entry('science-honor-society')]

/** The kit arrow, with a slightly finer pen to match this page's line weight. */
const arrow = (x1: number, y1: number, x2: number, y2: number, bend: number): string =>
  kitArrow(x1, y1, x2, y2, bend).replace('stroke-width=".7"', 'stroke-width=".5"')

/** Hides ink groups that haven't started yet (round caps of an undrawn stroke otherwise leave dots). Pure in u. */
const hideUndrawn = (root: HTMLElement, u: number): void =>
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    g.style.visibility = u <= Number(g.dataset.a) ? 'hidden' : ''
  })

// ── cartoon 1: a generic hand-drawn "country" (deliberately not a real map) with one pin, two arrows.
const PIN = { x: 27, y: 30 }
const country = `<g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14,20.4 C18,15.6 25,17.6 30,16.6 C36,15.4 42,17.2 45,21.6 C47.6,26 44.2,29.6 46,34.4 C47.6,39.4 42,45 36,43.8 C31,43 29.6,46.8 24.6,45.8 C18.6,44.8 12,44.2 10.8,38.4 C9.8,33.4 13,31.2 11.2,27 C10,23.4 11.4,22.2 14,20.4 Z" fill="#fff" stroke-width=".42"/>
  ${label(28, 41.2, COPY.country, 2.6, 'middle', GREY)}
</g>`
const pin = `<g stroke="${INK}" stroke-linecap="round">
  <ellipse cx="${PIN.x}" cy="${PIN.y + 0.3}" rx="1.8" ry=".6" fill="none" stroke-width=".3"/>
  <path d="M${PIN.x},${PIN.y} L${PIN.x},${PIN.y - 4.6}" stroke-width=".45"/>
  <circle cx="${PIN.x}" cy="${PIN.y - 5.8}" r="1.5" fill="${INK}" stroke-width=".4"/>
</g>`
const nehsNote = `${label(49, 20, COPY.nehs1, 3)}${label(49, 24, COPY.nehs2, 3)}
  ${label(49.4, 31, COPY.nehsCount, 6.4)}${label(55.6, 30.6, COPY.nehsOurs, 3, 'start', GREY)}
  ${arrow(48.4, 28.6, PIN.x + 2.2, PIN.y - 5, 0.18)}`
const snhsNote = `${label(49, 37.6, COPY.snhs1, 3)}${label(49, 41.6, COPY.snhs2, 3)}${label(49, 45.6, COPY.snhsOurs, 3, 'start', GREY)}
  ${arrow(48.4, 39, PIN.x + 2, PIN.y - 2.6, -0.16)}`

// ── cartoon 2: me behind a desk, with a nameplate wider than I am.
const desk = `${kid(27, 84, 0.5, { armL: 30, armR: 30 })}
  <g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8,77 L46,77 L46,82.6 L8,82.6 Z" fill="#fff" stroke-width=".45"/>
    <path d="M10,82.6 L10,87.4 M44,82.6 L44,87.4" stroke-width=".45"/>
    <path d="M9.6,77 L11.6,71.2 L42.4,71.2 L44.4,77 Z" fill="#fff" stroke-width=".45"/>
    ${label(27, 75.2, COPY.plate, 2.55, 'middle')}
  </g>`
const plateNote = `${label(55, 64.4, COPY.plateNote1, 2.8, 'start', GREY)}${label(55, 68, COPY.plateNote2, 2.8, 'start', GREY)}
  ${arrow(56, 69.6, 45.2, 72.6, -0.2)}`

export const honors: DiaryPage = {
  id: 'honors',
  side: 'l',
  entryIds: ['english-honor-society', 'science-honor-society'],
  css: `.dp-honors .dp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }`,
  html: `${row(1, COPY.day, 'dp-day')}
    ${row(2, appear(0.03, 0.07, COPY.l1))}
    ${row(3, appear(0.07, 0.1, COPY.l2))}
    ${svg(
      ink(0.1, 0.15, country) +
        ink(0.15, 0.17, pin) +
        ink(0.17, 0.21, nehsNote) +
        ink(0.21, 0.25, snhsNote) +
        ink(0.28, 0.34, desk) +
        ink(0.34, 0.37, plateNote),
    )}
    ${row(12, appear(0.25, 0.28, COPY.myTitle))}
    ${row(22, appear(0.36, 0.4, COPY.science), 'dp-grey dp-small')}
    <div class="dp-sr">${FACTS.map((e) => `<p>${e.blurb}</p>`).join('')}</div>`,
  update: hideUndrawn,
}
