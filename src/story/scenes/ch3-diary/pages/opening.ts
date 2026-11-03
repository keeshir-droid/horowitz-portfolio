// OWNER: page agent B. Spread 0: the inside front cover (left) and the first diary page (right).
import type { DiaryPage } from '../types'
import { INK, appear, bubble, entry, hl, ink, kid, label, row, svg, tick } from '../kit'

/** All narration on these two pages. Draft wording: edit here. */
const COPY = {
  belongs: 'THIS JOURNAL BELONGS TO:',
  name: 'Risheek',
  ifFound: 'if found: do NOT read.',
  month: 'SEPTEMBER',
  ok: '...OK.',
  lessonPlans: 'Lesson plans, with teachers',
  bestIn: 'Best-in-subject awards',
  esports: "School's esports tournament",
  sheetTitle: 'SIGN UP FOR EVERYTHING',
  sheetName: 'Risheek',
  teaser: '(+ two honor societies. next page.)',
} as const

// Facts this page shows (throws in dev if an id is wrong).
const FACTS = ['boarding-school', 'lesson-plans', 'subject-awards', 'esports-tournament'].map(entry)

/** Hides ink groups that haven't started yet (round caps of an undrawn stroke otherwise leave dots). Pure in u. */
const hideUndrawn = (root: HTMLElement, u: number): void =>
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    g.style.visibility = u <= Number(g.dataset.a) ? 'hidden' : ''
  })

const srOnly = (ids: readonly { blurb: string }[], cls: string): string =>
  `<div class="${cls}">${ids.map((e) => `<p>${e.blurb}</p>`).join('')}</div>`

// ───────────────────────── inside front cover ─────────────────────────
const padlock = `<g transform="translate(0 8)" stroke="${INK}" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="M37.2,55.6 L37.2,52.8 Q37.2,49.4 40,49.4 Q42.8,49.4 42.8,52.8 L42.8,55.6"/>
  <rect x="35.4" y="55.6" width="9.2" height="7.2" rx="1" fill="#fff"/>
  <circle cx="40" cy="58.6" r=".9" fill="${INK}" stroke="none"/><path d="M40,59.2 L40,60.8"/>
  <path d="M33.2,52.4 L31.4,51.2 M32.6,55.2 L30.6,55.2 M46.8,52.4 L48.6,51.2 M47.4,55.2 L49.4,55.2"/>
</g>`

export const endpaper: DiaryPage = {
  id: 'endpaper',
  side: 'l',
  html: `${row(8, COPY.belongs, 'dp-month', 'font-size:calc(var(--unit) * 3)')}
    ${row(10, COPY.name, 'dp-month', 'font-size:calc(var(--unit) * 7.2);letter-spacing:.04em')}
    ${row(13, COPY.ifFound, 'dp-grey dp-center')}
    ${svg(`<path d="M22,48.2 Q34,46.6 46,47.8 T58.6,47.4" fill="none" stroke="${INK}" stroke-width=".5" stroke-linecap="round"/>${padlock}`)}`,
}

// ───────────────────────── first diary page ─────────────────────────
// Kid with suitcase (small, quick beat), feet at (64, 31).
const suitcase = `<rect x="8" y="-15" width="12" height="9" rx="1.4" fill="#fff"/><path d="M12,-15 Q14,-18 16,-15" fill="none"/><path d="M14,-12.6 L14,-8.4" fill="none" stroke-width=".8"/>`
const movingKid = `${kid(68, 31, 0.4, { armR: 12, extra: suitcase })}<path d="M60,31.4 L79,31.4" stroke="${INK}" stroke-width=".45"/>`

// The sign-up sheet: every line is the same name.
const SHEET = { x: 9, y: 58, w: 38, h: 20.4 }
const sheet = (() => {
  const { x, y, w, h } = SHEET
  const lines = [0, 1, 2, 3]
    .map((i) => {
      const ly = y + 8.8 + i * 3.3
      return `<path d="M${x + 3},${ly + 0.8} L${x + w - 3},${ly + 0.8}" stroke="${INK}" stroke-width=".22"/>${label(x + 3.4, ly, `${i + 1}. ${COPY.sheetName}`, 2.7)}`
    })
    .join('')
  return `<g stroke="${INK}" stroke-linejoin="round">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.4" fill="#fff" stroke-width=".6" transform="rotate(-2 ${x + w / 2} ${y + h / 2})"/>
    <rect x="${x + w / 2 - 5}" y="${y - 1.6}" width="10" height="3.4" rx=".8" fill="${INK}" stroke-width=".4"/>
    <g transform="rotate(-2 ${x + w / 2} ${y + h / 2})">${label(x + w / 2, y + 6.4, COPY.sheetTitle, 3, 'middle')}${lines}</g>
  </g>`
})()

export const september: DiaryPage = {
  id: 'september',
  side: 'r',
  entryIds: ['boarding-school', 'lesson-plans', 'subject-awards', 'esports-tournament'],
  css: `.dp-september .dp-ind { padding-left: 1.3em; }
    .dp-september .dp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }`,
  html: `${row(1, COPY.month, 'dp-month')}
    ${row(3, appear(0.03, 0.1, `Moved to ${hl('boarding school', 'y')}.`), 'dp-big')}
    ${svg(ink(0.12, 0.2, movingKid) + ink(0.19, 0.23, bubble(68, 6.4, COPY.ok, 67.4, 10.4, 3)))}
    ${row(10, appear(0.26, 0.31, tick(0.32) + COPY.lessonPlans))}
    ${row(11.4, appear(0.36, 0.41, tick(0.42) + COPY.bestIn))}
    ${row(12.8, appear(0.46, 0.51, tick(0.52) + `${hl('First', 'pink')} esports tournament`))}
    ${svg(ink(0.56, 0.7, sheet))}
    ${row(21, appear(0.72, 0.78, COPY.teaser), 'dp-grey dp-small')}
    ${srOnly(FACTS, 'dp-sr')}`,
  update: hideUndrawn,
}
