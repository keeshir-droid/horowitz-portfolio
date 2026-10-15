// OWNER: page agent D. Right page of spread 3 ("stage-java"): the hand-written Java inventory + ordering system.
import { INK, appear, entry, ink, kid, label, needed, row, svg } from '../kit'
import type { DiaryPage } from '../types'

const E = entry('java-inventory')

/** All narration on this page (draft wording; Risheek edits here). Facts come from entries.ts only. */
const COPY = {
  day: 'Wednesday',
  l1: 'A local business needed an inventory system,',
  l2: 'plus a way to take morning and lunch orders.',
  l3: 'So I built both. In Java.',
  /** Big line, built from the entry's stat: "0 AI. Every line written by hand." */
  big: `${E.stat?.value ?? '0 AI'}. ${cap(E.stat?.label ?? 'every line written by hand')}.`,
  joke: '(I checked.)',
  business: `Business: ${needed('name, if shareable')}`,
  inUse: `In use for: ${needed('how long it ran')}`,
  /** Plausible hand-typed Java on the screen (illustrative, not a quote from the real code). */
  code: ['class Inventory {', '  void order(Item i, int qty) {', '    i.stock -= qty;', '    orders.add(i, qty);', '  }', '}'],
  slip: { title: 'ORDERS', morning: 'MORNING', lunch: 'LUNCH' },
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── geometry (page units, 80 x 96) ──
const SCR = { x: 22, y: 23.6, w: 32, h: 19 } // inner screen
const CODE_X = SCR.x + 1.6
const CODE_Y = SCR.y + 0.9
const CODE_LH = 2.9

/** A chunky laptop: thick lid, inner screen, wedge base with a few keys and a touchpad. */
function laptop(): string {
  const { x, y, w, h } = SCR
  const keys: string[] = []
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < 9; k++) {
      const kx = x - 0.6 + r * -1.2 + k * 3.6
      keys.push(`<rect x="${kx.toFixed(2)}" y="${(y + h + 3.2 + r * 1.3).toFixed(2)}" width="2.6" height=".8" rx=".2" fill="none" stroke="${INK}" stroke-width=".4"/>`)
    }
  }
  return `
    <rect x="${x - 2.6}" y="${y - 2.6}" width="${w + 5.2}" height="${h + 5}" rx="2.2" fill="#fff" stroke="${INK}" stroke-width="1.3"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" fill="#fff" stroke="${INK}" stroke-width=".7"/>
    <circle cx="${x + w / 2}" cy="${y - 1.3}" r=".45" fill="${INK}" stroke="none"/>
    <path d="M${x - 2.6},${y + h + 2.4} L${x + w + 2.6},${y + h + 2.4} L${x + w + 6},${y + h + 7.6} L${x - 6},${y + h + 7.6} Z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
    ${keys.join('')}
    <rect x="${x + w / 2 - 4}" y="${y + h + 5.75}" width="8" height="1.2" rx=".3" fill="none" stroke="${INK}" stroke-width=".45"/>`
}

/** The desk the laptop sits on, plus a floor line and a mug. */
const desk = (): string => `
  <path d="M13,51.6 L76,51.6" stroke="${INK}" stroke-width="1.1" fill="none"/>
  <path d="M13,53.2 L76,53.2" stroke="${INK}" stroke-width=".6" fill="none"/>
  <path d="M17,53.2 L17,58.6 M72,53.2 L72,58.6" stroke="${INK}" stroke-width="1" fill="none"/>
  <path d="M4,58.8 L76,58.8" stroke="${INK}" stroke-width=".5" fill="none"/>
  <path d="M65,45 L65,51.4 L70.4,51.4 L70.4,45 Z" fill="#fff" stroke="${INK}" stroke-width=".8"/>
  <path d="M70.4,46.4 Q73,46.6 72.6,48.4 Q72.2,50 70.4,49.8" fill="none" stroke="${INK}" stroke-width=".7"/>`

/** The order slip taped to the wall: MORNING / LUNCH columns with illegible entries and tally marks. */
function slip(): string {
  const x = 58.5
  const y = 21
  const w = 17.5
  const h = 21.5
  const cells: string[] = []
  // Deterministic little squiggles + tally strokes in each cell.
  const tallies = [2, 3, 1, 3, 2, 1]
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const cx = x + 1.2 + c * (w / 2)
      const cy = y + 12.8 + r * 3.3
      const n = tallies[r * 2 + c]
      cells.push(`<path d="M${cx},${cy} q.6,-.8 1.2,0 q.6,-.8 1.2,0 q.5,-.7 1,0" fill="none" stroke="${INK}" stroke-width=".35"/>`)
      for (let t = 0; t < n; t++) {
        const tx = cx + 4.7 + t * 0.75
        cells.push(`<path d="M${tx},${cy + 0.5} L${tx + 0.15},${cy - 1.4}" fill="none" stroke="${INK}" stroke-width=".4"/>`)
      }
    }
  }
  return `<g transform="rotate(3 ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width=".8"/>
    <rect x="${x + w / 2 - 3.5}" y="${y - 1.6}" width="7" height="3" fill="url(#dp-hatch)" stroke="${INK}" stroke-width=".4" transform="rotate(-6 ${x + w / 2} ${y})"/>
    <path d="M${x + 2},${y + 5.6} L${x + w - 2},${y + 5.6}" stroke="${INK}" stroke-width=".5" fill="none"/>
    <path d="M${x + 0.6},${y + 9.8} L${x + w - 0.6},${y + 9.8} M${x + w / 2},${y + 7} L${x + w / 2},${y + h - 1}" stroke="${INK}" stroke-width=".5" fill="none"/>
    ${cells.join('')}
    ${label(x + w / 2, y + 4.6, COPY.slip.title, 3.2, 'middle')}
    ${label(x + w / 4, y + 9, COPY.slip.morning, 1.75, 'middle')}
    ${label(x + (3 * w) / 4, y + 9, COPY.slip.lunch, 1.75, 'middle')}
  </g>`
}

/**
 * Workaround (proposed for kit.applyInk): once a .dp-draw group is fully drawn, drop the stroke dash so closed
 * shapes (rects, circles) render without the small seam Chrome leaves at pathLength=1 / dasharray=1; before it
 * starts, hide it so round line caps don't leave dots. Pure in u.
 */
export function settleInk(root: HTMLElement, u: number): void {
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    const done = u >= Number(g.dataset.b)
    // Not started yet: hide, so round caps on zero-length dashes don't leave stray dots.
    g.style.visibility = u <= Number(g.dataset.a) ? 'hidden' : 'visible'
    g.querySelectorAll<SVGElement>('*').forEach((el) => {
      const tag = el.tagName.toLowerCase()
      if (tag === 'g' || tag === 'text' || tag === 'tspan' || tag === 'pattern') return
      el.style.strokeDasharray = done ? 'none' : '1'
    })
  })
}

const CSS = `
.dp-java .jv-code { font-size: calc(var(--unit) * 2.05); line-height: calc(var(--unit) * ${CODE_LH}); white-space: pre; right: auto; }
.dp-java .jv-big { font-size: calc(var(--unit) * 4.3); }
`

const codeRows = COPY.code
  .map((line, i) => {
    const a = 0.4 + i * 0.035
    return row((CODE_Y + i * CODE_LH) / 4, appear(a, a + 0.032, line), 'jv-code', `left:${((CODE_X / 80) * 100).toFixed(2)}%`)
  })
  .join('')

export const java: DiaryPage = {
  id: 'java',
  side: 'r',
  entryIds: ['java-inventory'],
  css: CSS,
  update: settleInk,
  html: `
    ${row(1, appear(0.04, 0.08, COPY.day), 'dp-day')}
    ${row(2, appear(0.08, 0.16, COPY.l1))}
    ${row(3, appear(0.16, 0.24, COPY.l2))}
    ${row(4, appear(0.24, 0.3, COPY.l3))}
    ${svg(`
      ${ink(0.29, 0.4, laptop() + desk())}
      ${ink(0.32, 0.42, kid(9.5, 58.6, 0.52, { armR: 72, armL: 14 }))}
      ${ink(0.6, 0.68, slip())}
    `)}
    ${codeRows}
    ${row(15, appear(0.66, 0.74, COPY.big), 'jv-big')}
    ${row(16.25, appear(0.74, 0.76, COPY.joke), 'dp-grey dp-small')}
    ${row(18, appear(0.76, 0.79, COPY.business), 'dp-small')}
    ${row(19, appear(0.78, 0.8, COPY.inUse), 'dp-small')}
  `,
}
