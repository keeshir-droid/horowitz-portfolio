/**
 * Shared drawing kit for the Chapter 3 diary. Everything returns SVG/HTML strings in the page coordinate system:
 * a page is 80 units wide and 96 units tall; one ruled row is 4 units (24 rows, row r spans y = 4r .. 4r + 4).
 * Lead-owned: page modules and the engine import from here but do not edit it (propose changes in your handoff).
 */
import { getEntry } from '../../engine/unlocks'
import type { Entry } from '../../../content/types'
import type { DiaryPage } from './types'

export const INK = '#161616'
/** Light-brown skin, kept light so the black-and-white line-art look survives (Risheek's avatar rule). */
export const SKIN = '#f3d6bb'
export const GREY = '#8a8a8a'
/** Self-hosted (public/fonts/GochiHand.ttf). Use this family name in CSS and SVG <text>. */
export const FONT = 'DiaryHand'
export const PAGE_W = 80
export const PAGE_H = 96
export const ROWS = 24
/** id of the shared diagonal hatch <pattern> (the engine/harness injects it once): fill="url(#dp-hatch)". */
export const HATCH = 'dp-hatch'

/** The only way pages should read achievement facts. Throws on a typo so a broken id fails loudly in dev. */
export function entry(id: string): Entry {
  const e = getEntry(id)
  if (!e) throw new Error(`[ch3-diary] unknown entry id "${id}"`)
  return e
}

// ───────────────────────── the character ─────────────────────────
export interface Pose {
  /** Degrees outward from straight down (0 = hanging, 90 = sideways, 160 = up). */
  armL?: number
  armR?: number
  legL?: number
  legR?: number
  /** Extra SVG drawn in the character's local space (feet at y = 0, head top at y ≈ -51), e.g. a held object. */
  extra?: string
}

/**
 * The same character as every chapter: big head, short black hair, round glasses, black jacket, light-brown skin.
 * Drawn at (x, y) = feet position, scale s (s = 1 is ~51 units tall).
 */
export function kid(x: number, y: number, s: number, o: Pose = {}): string {
  const { armL = 22, armR = 22, legL = 7, legR = 7, extra = '' } = o
  const pt = (sx: number, sy: number, a: number, len: number, side: number): [number, number] => {
    const r = (a * Math.PI) / 180
    return [+(sx + side * Math.sin(r) * len).toFixed(2), +(sy + Math.cos(r) * len).toFixed(2)]
  }
  const [alx, aly] = pt(-6, -25, armL, 12, -1)
  const [arx, ary] = pt(6, -25, armR, 12, 1)
  const [llx, lly] = pt(-3, -10, legL, 10, -1)
  const [lrx, lry] = pt(3, -10, legR, 10, 1)
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-3,-10 L${llx},${lly} M3,-10 L${lrx},${lry}" fill="none" stroke-width="1.5"/>
    <ellipse cx="${llx - 1.3}" cy="${lly}" rx="2.5" ry="1.3" fill="${INK}"/><ellipse cx="${lrx + 1.3}" cy="${lry}" rx="2.5" ry="1.3" fill="${INK}"/>
    <path d="M-6,-26 L6,-26 L7.5,-10 L-7.5,-10 Z" fill="${INK}"/>
    <path d="M-2.2,-26 L0,-22.4 L2.2,-26 Z" fill="#fff" stroke-width=".8"/>
    <path d="M-6,-25 L${alx},${aly} M6,-25 L${arx},${ary}" fill="none" stroke-width="2.6"/>
    <circle cx="${alx}" cy="${aly}" r="1.6" fill="${SKIN}" stroke-width="1"/><circle cx="${arx}" cy="${ary}" r="1.6" fill="${SKIN}" stroke-width="1"/>
    <ellipse cx="0" cy="-38" rx="11" ry="12" fill="${SKIN}"/>
    <path d="M-11,-40 Q-11.6,-51 0,-50.6 Q11.6,-51 11,-40 L9,-43.2 L6.8,-41 L4,-44 L1.2,-41.8 L-2,-44.4 L-5,-41.8 L-8,-44 Z" fill="${INK}"/>
    <circle cx="-4.4" cy="-37" r="3.6" fill="#fff"/><circle cx="4.4" cy="-37" r="3.6" fill="#fff"/><path d="M-0.8,-37 L0.8,-37" fill="none"/>
    <circle cx="-4.2" cy="-36.8" r=".95" fill="${INK}" stroke="none"/><circle cx="4.6" cy="-36.8" r=".95" fill="${INK}" stroke="none"/>
    <path d="M-2.4,-30.6 Q0,-29.4 2.4,-30.6" fill="none" stroke-width="1"/>
    ${extra}
  </g>`
}

/** A generic other person (teacher, classmate, audience): same proportions, no glasses, plain shirt, simple hair. */
export function person(x: number, y: number, s: number, o: Pose & { hair?: 'short' | 'long' | 'none'; shirt?: string } = {}): string {
  const { armL = 18, armR = 18, legL = 6, legR = 6, extra = '', hair = 'short', shirt = '#fff' } = o
  const pt = (sx: number, sy: number, a: number, len: number, side: number): [number, number] => {
    const r = (a * Math.PI) / 180
    return [+(sx + side * Math.sin(r) * len).toFixed(2), +(sy + Math.cos(r) * len).toFixed(2)]
  }
  const [alx, aly] = pt(-6, -25, armL, 12, -1)
  const [arx, ary] = pt(6, -25, armR, 12, 1)
  const [llx, lly] = pt(-3, -10, legL, 10, -1)
  const [lrx, lry] = pt(3, -10, legR, 10, 1)
  const hairPath =
    hair === 'long'
      ? `<path d="M-11.5,-34 Q-13,-52 0,-51 Q13,-52 11.5,-34 L9.5,-42 Q0,-46 -9.5,-42 Z" fill="${INK}"/>`
      : hair === 'short'
        ? `<path d="M-10.5,-42 Q-9,-51 0,-50.4 Q9,-51 10.5,-42 Q0,-46 -10.5,-42 Z" fill="${INK}"/>`
        : ''
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-3,-10 L${llx},${lly} M3,-10 L${lrx},${lry}" fill="none" stroke-width="1.5"/>
    <path d="M-6,-26 L6,-26 L7.5,-10 L-7.5,-10 Z" fill="${shirt}"/>
    <path d="M-6,-25 L${alx},${aly} M6,-25 L${arx},${ary}" fill="none" stroke-width="1.5"/>
    <ellipse cx="0" cy="-38" rx="11" ry="12" fill="#fff"/>
    ${hairPath}
    <circle cx="-4" cy="-37" r=".95" fill="${INK}" stroke="none"/><circle cx="4" cy="-37" r=".95" fill="${INK}" stroke="none"/>
    <path d="M-2.2,-31 L2.2,-31" fill="none" stroke-width="1"/>
    ${extra}
  </g>`
}

// ───────────────────────── comic furniture ─────────────────────────
/** Rounded speech bubble centred at (x, y) with a tail to (tx, ty). Text is set in caps by convention. */
export function bubble(x: number, y: number, text: string, tx: number, ty: number, fs = 3.2): string {
  const w = text.length * fs * 0.5 + 5
  const h = fs * 1.9
  return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" stroke="${INK}" stroke-width=".9"/>
    <path d="M${x - 2},${y + h / 2 - 0.4} L${tx},${ty} L${x + 2},${y + h / 2 - 0.4}" fill="#fff" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M${x - 1.6},${y + h / 2 - 0.5} L${x + 1.6},${y + h / 2 - 0.5}" stroke="#fff" stroke-width="1.4"/>
    <text x="${x}" y="${y + fs * 0.36}" text-anchor="middle" font-family="${FONT}" font-size="${fs}" fill="${INK}" stroke="none">${text}</text></g>`
}

/** A comic panel frame (for strips). */
export const panel = (x: number, y: number, w: number, h: number): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="1.1"/>`

/** SVG text in the diary hand. */
export const label = (x: number, y: number, str: string, size = 3.6, anchor: 'start' | 'middle' | 'end' = 'start', fill = INK): string =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" fill="${fill}" stroke="none">${str}</text>`

/** A hand-drawn arrow from (x1,y1) curving to (x2,y2) with a head at the end. */
export function arrow(x1: number, y1: number, x2: number, y2: number, bend = 0.25, width = 0.7): string {
  const mx = (x1 + x2) / 2 + (y2 - y1) * bend
  const my = (y1 + y2) / 2 - (x2 - x1) * bend
  const ang = Math.atan2(y2 - my, x2 - mx)
  const h = 2.4
  const a1 = ang + Math.PI - 0.45
  const a2 = ang + Math.PI + 0.45
  return `<path d="M${x1},${y1} Q${mx.toFixed(2)},${my.toFixed(2)} ${x2},${y2} M${x2},${y2} L${(x2 + Math.cos(a1) * h).toFixed(2)},${(y2 + Math.sin(a1) * h).toFixed(2)} M${x2},${y2} L${(x2 + Math.cos(a2) * h).toFixed(2)},${(y2 + Math.sin(a2) * h).toFixed(2)}" fill="none" stroke="${INK}" stroke-width="${width}" stroke-linecap="round"/>`
}

/** Graduation cap centred at (cx, cy). */
export const gradCap = (cx: number, cy: number): string =>
  `<path d="M${cx - 6},${cy} L${cx},${cy - 2.4} L${cx + 6},${cy} L${cx},${cy + 2.4} Z" fill="${INK}"/><path d="M${cx},${cy} L${cx + 4.6},${cy + 0.6} L${cx + 5},${cy + 4.6}" fill="none" stroke="${INK}" stroke-width=".6"/>`

// ───────────────────────── page layout helpers ─────────────────────────
/** A line of handwriting sitting on ruled row r (0..23). Classes: dp-month, dp-day, dp-grey, dp-caps, dp-center. */
export const row = (r: number, html: string, cls = '', style = ''): string =>
  `<div class="dp-row ${cls}" style="top:calc(var(--lh) * ${r});${style}">${html}</div>`

/** Wraps HTML that should "write itself" left to right between u = a and u = b of the spread. */
export const appear = (a: number, b: number, html: string): string => `<span class="dp-appear" data-a="${a}" data-b="${b}">${html}</span>`

/** A full-page SVG overlay in page units. Add class 'dp-hit' to children that take pointer input. */
export const svg = (inner: string, cls = ''): string => `<svg class="dp-doodle ${cls}" viewBox="0 0 80 96" aria-hidden="true">${inner}</svg>`

/** Ink that draws itself (stroke dash) between u = a and u = b; fills and <text> fade in at the end. */
export const ink = (a: number, b: number, inner: string): string => `<g class="dp-draw" data-a="${a}" data-b="${b}">${inner}</g>`

/** An inline checkbox whose tick is drawn at u = at (put inside a row). */
export const tick = (at: number): string =>
  `<svg class="dp-cb" viewBox="0 0 10 10" aria-hidden="true"><rect x=".6" y=".6" width="8.4" height="8.4" fill="none" stroke="${INK}" stroke-width="1"/><path class="dp-tick" data-t="${at}" d="M1.8,5 L4.2,8 L10.5,-1.5" pathLength="1" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`

/** A placeholder for a fact Risheek has not given yet. Shown grey, never invented. */
export const needed = (what: string): string => `<span class="dp-needed">[${what}]</span>`

/** Illegible "handwriting" squiggles on rows r0.., for filler pages. Deterministic per seed. */
export function scribbles(r0: number, n: number, seed: number, maxW = 62, x0 = 7): string {
  let sd = seed * 7919 + 13
  const rnd = (): number => (sd = (sd * 16807) % 2147483647) / 2147483647
  const lines: string[] = []
  for (let i = 0; i < n; i++) {
    const w = 22 + rnd() * (maxW - 22)
    let d = `M${x0},${4 * (r0 + i) + 2.9}`
    let x = x0
    while (x < x0 + w) {
      const k = 0.8 + rnd() * 1.2
      d += ` q${(k / 2).toFixed(2)},${(-(0.4 + rnd() * 1.1)).toFixed(2)} ${k.toFixed(2)},0`
      x += k
      if (rnd() < 0.12) {
        x += 1.6
        d += ' m1.6,0'
      }
    }
    lines.push(`<path d="${d}" fill="none" stroke="#9a9a9a" stroke-width=".32"/>`)
  }
  return svg(lines.join(''))
}

/** Right page index (spread index) where the flipbook animation starts: the "flip fast" page. Before it the doodle idles. */
export const FLIP_FROM = 4

/**
 * The flipbook corner doodle for the right page of spread j (of `total` spreads). Every right page carries one frame in
 * the same box, so riffling the pages animates it. Before FLIP_FROM: a small grade-9 you, idle. From FLIP_FROM on:
 * a 4-frame walk cycle across the box while you grow (the grade label ticks 9 → 12), then you stop, the cap goes on,
 * arms up, and the cap flies. Frames are deterministic in j.
 */
export function corner(j: number, total: number): string {
  const last = Math.max(FLIP_FROM + 1, total - 1)
  const f = j < FLIP_FROM ? 0 : (j - FLIP_FROM) / (last - FLIP_FROM)
  const grade = f < 0.25 ? 9 : f < 0.5 ? 10 : f < 0.75 ? 11 : 12
  const s = 0.4 + 0.12 * Math.min(1, f / 0.78)
  const WALK_END = 0.78
  const x = j < FLIP_FROM ? 12 : 9 + 17 * Math.min(1, f / WALK_END)
  let y = 35.4
  let o: Pose = { legL: 7, legR: 7, armL: 16, armR: 16 }
  let extra = ''
  const top = (yy: number): number => yy - 50.6 * s
  if (j >= FLIP_FROM && f < WALK_END) {
    // walk cycle: stride L, pass, stride R, pass (with a little bob on the passing frames)
    const k = (j - FLIP_FROM) % 4
    const stride = [24, 6, 24, 6][k]
    const leftLead = k === 0
    o = k % 2 === 0
      ? { legL: leftLead ? stride : 4, legR: leftLead ? 4 : stride, armL: leftLead ? 6 : 30, armR: leftLead ? 30 : 6 }
      : { legL: 7, legR: 7, armL: 16, armR: 16 }
    if (k % 2 === 1) y -= 0.8
  } else if (f >= WALK_END && f < 0.87) {
    extra = gradCap(x, top(y) - 0.9)
  } else if (f >= 0.87 && f < 0.99) {
    o = { legL: 10, legR: 10, armL: 150, armR: 150 }
    y -= 1.2
    const k = (f - 0.87) / 0.12
    extra = gradCap(x + 1 + k * 3, top(y) - 4 - k * 7)
  } else if (f >= 0.99) {
    o = { legL: 12, legR: 12, armL: 162, armR: 162 }
    y -= 2
    extra = `<g transform="rotate(-18 ${x + 6} 2.8)">${gradCap(x + 6, 2.8)}</g><path d="M${x + 0.5},6.5 l-1,-2.6 M${x + 3},5.6 l0,-2.6 M${x + 11.5},6 l2.4,-1.6" stroke="${INK}" stroke-width=".55" stroke-linecap="round"/>`
  }
  const big = j >= FLIP_FROM ? ' dp-corner-big' : ''
  return `<svg class="dp-corner${big}" viewBox="0 0 40 40" aria-hidden="true"><path d="M2,36.4 L38,36.4" stroke="${INK}" stroke-width=".8"/>${kid(x, y, s, o)}${extra}<text x="2.4" y="39.6" font-family="${FONT}" font-size="3.1" fill="#6b6b6b">gr. ${grade}</text></svg>`
}

/** Stand-in page used until a page module is written. */
export const placeholderPage = (id: string, side: 'l' | 'r', title: string): DiaryPage => ({
  id,
  side,
  html: `${row(1, title, 'dp-month')}${row(4, '(page coming)', 'dp-grey dp-center')}`,
})

// ───────────────────────── ink animation (used by the engine and the harness) ─────────────────────────
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const seg = (u: number, a: number, b: number): number => clamp01((u - a) / (b - a || 1e-6))

/** Call once after mounting a page's HTML: prepares stroke-dash drawing on `.dp-draw` descendants. */
export function prepInk(root: HTMLElement): void {
  root.querySelectorAll<SVGElement>('.dp-draw *').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'g' || tag === 'text' || tag === 'tspan' || tag === 'pattern') return
    el.setAttribute('pathLength', '1')
    el.style.strokeDasharray = '1'
  })
}

/** Sets every ink/tick/appear element under root to its state at spread progress u (0..1). Pure in u. */
export function applyInk(root: HTMLElement, u: number): void {
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    const pr = seg(u, Number(g.dataset.a), Number(g.dataset.b))
    g.querySelectorAll<SVGElement>('*').forEach((el) => {
      const tag = el.tagName.toLowerCase()
      if (tag === 'g' || tag === 'pattern') return
      if (tag === 'text' || tag === 'tspan') el.style.opacity = String(pr)
      else {
        // A zero-length dash with a round cap still paints a dot, so hide strokes that haven't started.
        el.style.visibility = pr <= 0 ? 'hidden' : ''
        // Closed shapes keep a visible seam with pathLength=1 dashes, so drop the dash once fully drawn.
        el.style.strokeDasharray = pr >= 1 ? 'none' : '1'
        el.style.strokeDashoffset = String(1 - pr)
        // Respect an authored fill-opacity attribute (e.g. a transparent hit-area) instead of overriding it.
        const authored = el.getAttribute('fill-opacity')
        el.style.fillOpacity = String(clamp01((pr - 0.6) / 0.4) * (authored === null ? 1 : Number(authored)))
      }
    })
  })
  root.querySelectorAll<SVGPathElement>('.dp-tick').forEach((el) => {
    const a = Number(el.dataset.t)
    el.style.strokeDashoffset = String(1 - seg(u, a, a + 0.04))
  })
  root.querySelectorAll<HTMLElement>('.dp-appear').forEach((el) => {
    const pr = seg(u, Number(el.dataset.a), Number(el.dataset.b))
    el.style.clipPath = pr >= 1 ? 'none' : `inset(-20% ${((1 - pr) * 100).toFixed(1)}% -20% 0)`
  })
}

/** Loads the self-hosted diary font once (resolves even on failure; CSS falls back to a cursive face). */
let fontPromise: Promise<void> | null = null
export function loadDiaryFont(): Promise<void> {
  if (fontPromise) return fontPromise
  fontPromise = (async () => {
    try {
      const face = new FontFace(FONT, `url(${import.meta.env.BASE_URL}fonts/GochiHand.ttf)`)
      await face.load()
      document.fonts.add(face)
    } catch {
      /* fall back silently */
    }
  })()
  return fontPromise
}

/** The shared <defs> (hatch pattern). Inject once per document. */
export const DEFS_SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="${HATCH}" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 L0,2.2" stroke="${INK}" stroke-width=".7"/></pattern></defs></svg>`
