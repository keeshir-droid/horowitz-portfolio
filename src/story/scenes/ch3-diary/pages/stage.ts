// OWNER: page agent C. Spread 3 (left): the stage, as a three-panel strip: solo, music, a brand-new field.
import { GREY, INK, appear, bubble, entry, ink, kid, label, panel, row, svg } from '../kit'
import type { DiaryPage } from '../types'

// Fact sources (entries.ts). Throw if an id is renamed.
//  music:         "Played in multiple musical performances, overcoming stage fright and a fear of music."
//  standup-paper: "Wrote a research paper on stand-up comedy."
const MUSIC = entry('music')
const STANDUP = entry('standup-paper')

/** All wording on this page (draft; Risheek edits here). */
const COPY = {
  day: 'Saturday',
  heading: 'Things I had never done before:',
  tag1: '1. SOLO',
  cap1: ['Just me.', 'Nothing to hide behind.'],
  tag2: '2. MUSIC',
  cap2: ['Was scared of music.', 'Did it anyway.'],
  tag3: '3. A NEW FIELD',
  ahem: 'AHEM.',
  paper: ['RESEARCH PAPER:', 'STAND-UP COMEDY'],
  field: 'New field: stand-up comedy.',
  paperLine: 'So naturally, I wrote a research paper on it.',
  aside: '(stage fright tagged along. I let it watch.)',
} as const

const r2 = (v: number): string => v.toFixed(2)

/**
 * A finer, darker-reading hatch than the shared one, for the unlit stage around the spotlight. Same idea as
 * url(#dp-hatch), local id. (Defined per mount; duplicate identical ids are harmless.)
 */
const DARK = 'st-dark-hatch'
const DARK_DEFS = `<defs><pattern id="${DARK}" width="1.5" height="1.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 L0,1.5" stroke="${INK}" stroke-width=".42"/></pattern></defs>`
const S = `stroke="${INK}" stroke-linejoin="round"`

/** Comic caption box (white, inked) with caps text, top-left at (x, y); anchored right if `right`. */
function tag(x: number, y: number, text: string, right = false): string {
  const w = text.length * 1.42 + 3
  const x0 = right ? x - w : x
  return `<rect x="${r2(x0)}" y="${y}" width="${r2(w)}" height="4.4" fill="#fff" stroke="${INK}" stroke-width=".6"/>${label(x0 + 1.5, y + 3.25, text, 2.8)}`
}

/** A single quaver: tilted filled head, stem, flag. */
const note = (x: number, y: number): string =>
  `<ellipse cx="${x}" cy="${y}" rx="1.05" ry=".72" transform="rotate(-22 ${x} ${y})" fill="${INK}" stroke="${INK}" stroke-width=".3"/>` +
  `<path d="M${r2(x + 0.95)},${r2(y - 0.2)} L${r2(x + 0.95)},${r2(y - 3.8)} Q${r2(x + 2.6)},${r2(y - 3)} ${r2(x + 2.3)},${r2(y - 1.3)}" fill="none" stroke="${INK}" stroke-width=".42"/>`
/** Two beamed quavers. */
const notes2 = (x: number, y: number): string =>
  `<ellipse cx="${x}" cy="${y}" rx="1.05" ry=".72" transform="rotate(-22 ${x} ${y})" fill="${INK}" stroke="${INK}" stroke-width=".3"/>` +
  `<ellipse cx="${x + 3.4}" cy="${y - 0.8}" rx="1.05" ry=".72" transform="rotate(-22 ${x + 3.4} ${y - 0.8})" fill="${INK}" stroke="${INK}" stroke-width=".3"/>` +
  `<path d="M${r2(x + 0.95)},${r2(y - 0.2)} L${r2(x + 0.95)},${r2(y - 3.9)} L${r2(x + 4.35)},${r2(y - 4.7)} L${r2(x + 4.35)},${r2(y - 1)}" fill="none" stroke="${INK}" stroke-width=".42"/>` +
  `<path d="M${r2(x + 0.95)},${r2(y - 3.9)} L${r2(x + 4.35)},${r2(y - 4.7)}" fill="none" stroke="${INK}" stroke-width="1"/>`

/** Captions under a panel: two short centred lines. */
const caption = (cx: number, lines: readonly string[]): string =>
  lines.map((t, i) => label(cx, 42 + i * 3.4, t, 2.8, 'middle')).join('')

// ───────────────────────── panel 1: SOLO (alone in a spotlight) ─────────────────────────
function panelSolo(): string {
  const [x, y, w, h] = [7, 13, 31.5, 25.5]
  const cx = x + w / 2
  return [
    ink(0.09, 0.13, `${panel(x, y, w, h)}<g ${S}>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${DARK})" stroke="none"/>
      <path d="M${cx - 2.6},${y} L${cx + 2.6},${y} L${cx + 9.6},${y + 22} L${cx - 9.6},${y + 22} Z" fill="#fff" stroke-width=".45"/>
      <ellipse cx="${cx}" cy="${y + 22}" rx="9.6" ry="2.1" fill="#fff" stroke-width=".45"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke-width="1.1"/></g>`),
    ink(0.12, 0.16, kid(cx, y + 22.6, 0.38, { armL: 9, armR: 9, legL: 4, legR: 4 })),
    ink(0.15, 0.17, tag(x, y, COPY.tag1)),
    ink(0.16, 0.19, caption(cx, COPY.cap1)),
  ].join('')
}

// ───────────────────────── panel 2: MUSIC (notes, a music stand; no specific instrument) ─────────────────────────
function panelMusic(): string {
  const [x, y, w, h] = [41.5, 13, 31.5, 25.5]
  const fy = y + 22.8
  const sx = 64.6 // music stand
  return [
    ink(0.19, 0.22, `${panel(x, y, w, h)}<g ${S} fill="none">
      <path d="M${x},${fy} L${x + w},${fy}" stroke-width=".45"/>
      <path d="M${sx - 2.6},${fy} L${sx},${fy - 4.4} L${sx + 2.6},${fy} M${sx},${fy - 4.4} L${sx},${fy - 10.8}" stroke-width=".55"/>
      <path d="M${sx - 5.6},${fy - 10.4} L${sx + 5.6},${fy - 10.4} L${sx + 4.6},${fy - 16.6} L${sx - 4.6},${fy - 16.6} Z" fill="#fff" stroke-width=".6"/>
      <path d="M${sx - 4},${fy - 14.6} L${sx + 3.7},${fy - 14.6} M${sx - 4.2},${fy - 13.4} L${sx + 3.9},${fy - 13.4} M${sx - 4.4},${fy - 12.2} L${sx + 4.1},${fy - 12.2}" stroke-width=".22"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" stroke-width="1.1"/></g>`),
    ink(0.21, 0.25, kid(52.4, fy + 0.5, 0.38, { armL: 24, armR: 46, legL: 6, legR: 9 })),
    ink(0.24, 0.27, `${note(45.6, 25.6)}${notes2(58.6, 19.4)}${note(70.2, 17.8)}`),
    ink(0.25, 0.27, tag(x, y, COPY.tag2)),
    ink(0.26, 0.29, caption(x + w / 2, COPY.cap2)),
  ].join('')
}

// ───────────────────────── panel 3: A NEW FIELD (stand-up, with the research paper) ─────────────────────────
function panelStandup(): string {
  const [x, y, w, h] = [7, 48, 66, 26]
  const fy = 69.5 // stage floor
  // brick wall (the stand-up club cliché), thin, behind everything
  const courses = [51.5, 55, 58.5, 62, 65.5]
  let bricks = courses.map((by) => `M${x},${by} L${x + w},${by}`).join(' ')
  ;[y, ...courses].forEach((by, i) => {
    const nextY = i < courses.length ? courses[i] : fy
    if (nextY <= by) return
    for (let bx = x + (i % 2 ? 3.5 : 7); bx < x + w; bx += 7) bricks += ` M${r2(bx)},${by} L${r2(bx)},${nextY}`
  })
  const mx = 29.6 // mic stand
  const px = 44.4 // paper
  const py = 53.6
  return [
    ink(0.29, 0.32, `${panel(x, y, w, h)}`),
    ink(0.31, 0.34, `<g ${S} fill="none">
      <path d="${bricks}" stroke="${GREY}" stroke-width=".22"/>
      <path d="M${x},${fy} L${x + w},${fy}" stroke-width=".7"/></g>`),
    // mic stand: tripod, pole, mic angled at him
    ink(0.32, 0.35, `<g ${S} fill="none">
      <path d="M${mx - 2.4},${fy} L${mx},${fy - 2.8} L${mx + 2.4},${fy} M${mx},${fy - 2.8} L${mx},${fy - 12}" stroke-width=".6"/>
      <path d="M${mx},${fy - 12} L${mx + 1.2},${fy - 12.6}" stroke-width=".6"/>
      <path d="M${mx + 1.2},${fy - 12.6} L${mx + 3.2},${fy - 13.6}" stroke-width="1.5" stroke-linecap="round"/></g>`),
    ink(0.33, 0.37, kid(37.4, fy, 0.38, { armL: 62, armR: 84, legL: 6, legR: 6 })),
    // the paper he is holding up
    ink(0.36, 0.4, `<g ${S}>
      <path d="M${px},${py} L${px + 21.4},${py} L${px + 23.6},${py + 2.2} L${px + 23.6},${py + 15.6} L${px},${py + 15.6} Z" fill="#fff" stroke-width=".6"/>
      <path d="M${px + 21.4},${py} L${px + 21.4},${py + 2.2} L${px + 23.6},${py + 2.2}" fill="none" stroke-width=".4"/>
      ${label(px + 11.6, py + 4.2, COPY.paper[0], 2.55, 'middle')}
      ${label(px + 11.6, py + 7.4, COPY.paper[1], 2.55, 'middle')}
      <path d="M${px + 2.4},${py + 10.2} L${px + 21},${py + 10.2} M${px + 2.4},${py + 12} L${px + 19},${py + 12} M${px + 2.4},${py + 13.8} L${px + 15.4},${py + 13.8}" fill="none" stroke="#9a9a9a" stroke-width=".3"/></g>`),
    ink(0.39, 0.41, bubble(23.2, 52.8, COPY.ahem, 31.2, 56.4, 2.8)),
    ink(0.38, 0.4, tag(x + w, y, COPY.tag3, true)),
    // redraw the frame on top so the edges stay crisp over the bricks
    ink(0.29, 0.32, `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="1.1"/>`),
  ].join('')
}

/** Same pathLength=1 workaround as motor.ts: hide unstarted ink, drop the dash once finished. Pure in u. */
function inkFix(root: HTMLElement, u: number): void {
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    g.style.visibility = u <= Number(g.dataset.a) ? 'hidden' : ''
    const done = u >= Number(g.dataset.b)
    g.querySelectorAll<SVGElement>('[pathLength]').forEach((el) => {
      el.style.strokeDasharray = done ? 'none' : '1'
    })
  })
}

export const stage: DiaryPage = {
  id: 'stage',
  side: 'l',
  entryIds: [MUSIC.id, STANDUP.id],
  html: `
    ${row(1, appear(0.02, 0.04, COPY.day), 'dp-day')}
    ${row(2, appear(0.04, 0.09, COPY.heading))}
    ${svg(DARK_DEFS + panelSolo() + panelMusic() + panelStandup())}
    ${row(19, appear(0.41, 0.45, COPY.field))}
    ${row(20, appear(0.45, 0.5, COPY.paperLine))}
    ${row(21, appear(0.5, 0.54, COPY.aside), 'dp-grey dp-small')}`,
  update: inkFix,
}
