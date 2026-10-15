// OWNER: page agent B. Spread 1, right: head of the carbon-neutral project.
// A cartoon CO2 meter drops as you read (or as you drag its handle); the little campus responds.
import type { DiaryPage } from '../types'
import { GREY, INK, appear, entry, ink, label, needed, row, svg } from '../kit'

/** All narration on this page. Draft wording: edit here. */
const COPY = {
  day: 'Thursday',
  l1: 'New job: head of the carbon-neutral project.',
  l2: 'Translation: make the school carbon-neutral.',
  co2: 'CO<tspan font-size="2.3" dy=".7">2</tspan>',
  pull: 'pull',
  result: 'Result:',
  resultNeeded: 'tonnes / what changed',
} as const

// Fact this page shows (throws in dev if the id is wrong).
const FACT = entry('carbon-neutral')

// ───────────────────────── geometry ─────────────────────────
const TUBE = { x: 11, w: 6, top: 23, bot: 56 }
const BULB = { cx: 14, cy: 59.75, r: 4.8 }
/** Mercury top at p = 0 and p = 1. */
const LVL_HI = 26
const LVL_LO = 51.5
const GROUND = 60.4

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const seg = (u: number, a: number, b: number): number => clamp01((u - a) / (b - a))
const smooth = (x: number): number => x * x * (3 - 2 * x)

// ───────────────────────── the meter ─────────────────────────
const meter = `<g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M${TUBE.x},${TUBE.bot} L${TUBE.x},${TUBE.top} A3,3 0 0 1 ${TUBE.x + TUBE.w},${TUBE.top} L${TUBE.x + TUBE.w},${TUBE.bot} A${BULB.r},${BULB.r} 0 1 1 ${TUBE.x},${TUBE.bot} Z" fill="#fff" stroke-width=".6"/>
  ${[0, 1, 2, 3, 4, 5, 6]
    .map((i) => {
      const y = LVL_HI + i * ((LVL_LO - LVL_HI) / 6)
      return `<path d="M${TUBE.x - (i % 3 === 0 ? 2.6 : 1.6)},${y.toFixed(2)} L${TUBE.x - 0.4},${y.toFixed(2)}" stroke-width=".3"/>`
    })
    .join('')}
  ${label(TUBE.x + TUBE.w + 1.6, 23.4, COPY.co2, 3.4)}
</g>`
const mercury = `<circle cx="${BULB.cx}" cy="${BULB.cy}" r="3.3" fill="${INK}" stroke="none"/>
  <rect class="cb-col" x="${BULB.cx - 1.3}" y="${LVL_HI}" width="2.6" height="${BULB.cy - LVL_HI}" fill="${INK}" stroke="none"/>`
const handle = `<g class="cb-handle" transform="translate(0 ${LVL_HI})">
  <path d="M${TUBE.x + TUBE.w + 0.4},0 L${TUBE.x + TUBE.w + 3.4},-1.7 L${TUBE.x + TUBE.w + 3.4},1.7 Z" fill="#fff" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>
  ${label(TUBE.x + TUBE.w + 4.2, 0.9, COPY.pull, 2.4, 'start', GREY)}
</g>`

// ───────────────────────── the campus ─────────────────────────
const windows = [30, 35, 45, 50]
  .map((x) => `<rect x="${x - 1.6}" y="47" width="3.2" height="3.4" fill="#fff" stroke-width=".35"/><path d="M${x},47 L${x},50.4" stroke-width=".2"/>`)
  .join('')
const campus = `<g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22,${GROUND} L77.4,${GROUND}" stroke-width=".5"/>
  <rect x="47" y="34.4" width="3.6" height="9.8" fill="#fff" stroke-width=".5"/>
  <path d="M46.4,34.4 L51.2,34.4" stroke-width=".6"/>
  <rect x="26.6" y="44" width="27" height="${GROUND - 44}" fill="#fff" stroke-width=".6"/>
  <path d="M25.8,44 L54.4,44" stroke-width=".7"/>
  ${windows}
  <path d="M37.6,${GROUND} L37.6,53.2 Q40.1,51.4 42.6,53.2 L42.6,${GROUND}" fill="#fff" stroke-width=".45"/>
  <path d="M33,${GROUND} L33,55.2 M47.4,${GROUND} L47.4,55.2" stroke-width=".25"/>
</g>`

/** A puff of smoke: three overlapping circles. Scaled by update() around its own centre. */
const puff = (cx: number, cy: number, r: number, k: number): string => {
  const c = `<circle cx="${cx - r * 0.5}" cy="${cy + r * 0.15}" r="${r * 0.62}"/><circle cx="${cx + r * 0.5}" cy="${cy + r * 0.1}" r="${r * 0.6}"/><circle cx="${cx}" cy="${cy - r * 0.25}" r="${r * 0.7}"/>`
  // Outlines first (double width), then white discs on top: only the outer edge of the union stays inked.
  return `<g class="cb-puff" data-k="${k}" data-cx="${cx}" data-cy="${cy}"><g stroke="${INK}" stroke-width=".8" fill="none">${c}</g><g fill="#fff" stroke="none">${c}</g></g>`
}
const smoke = puff(49.6, 31.2, 2.4, 0) + puff(53, 26.4, 3.2, 1) + puff(57.6, 21.4, 3.9, 2)

/** Things that grow as the meter drops: each one inks itself in between p = t and p = t + 0.16. */
const grow = (t: number, inner: string): string =>
  `<g class="cb-grow" data-p="${t}" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
const dash = 'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" fill-opacity="0"'
const tree = (x: number, s = 1): string =>
  `<path ${dash} d="M${x},${GROUND} L${x},${GROUND - 5.4 * s}" stroke-width=".5" fill="none"/>
   <path ${dash} d="M${x - 3 * s},${GROUND - 5.2 * s} Q${x - 4.4 * s},${GROUND - 8.4 * s} ${x - 1.8 * s},${GROUND - 9.4 * s} Q${x - 1 * s},${GROUND - 12.2 * s} ${x + 1.4 * s},${GROUND - 10.8 * s} Q${x + 4.4 * s},${GROUND - 10.6 * s} ${x + 3.4 * s},${GROUND - 7.4 * s} Q${x + 4.4 * s},${GROUND - 4.6 * s} ${x + 1},${GROUND - 5 * s} Q${x - 1},${GROUND - 3.8 * s} ${x - 3 * s},${GROUND - 5.2 * s} Z" fill="#fff" stroke-width=".45"/>`
const panel = (x: number): string =>
  `<path ${dash} d="M${x},44 L${x + 0.6},41.6 M${x + 5.4},44 L${x + 5.6},42" stroke-width=".3" fill="none"/>
   <path ${dash} d="M${x - 0.6},42 L${x + 1.2},38.4 L${x + 7.2},38.4 L${x + 5.4},42 Z" fill="url(#dp-hatch)" stroke-width=".4"/>`
const sun = `<circle ${dash} cx="69" cy="24" r="3.2" fill="#fff" stroke-width=".45"/>
  <path ${dash} d="${[0, 1, 2, 3, 4, 5, 6, 7]
    .map((i) => {
      const a = (i * Math.PI) / 4
      const c = Math.cos(a)
      const sn = Math.sin(a)
      return `M${(69 + c * 4.6).toFixed(2)},${(24 + sn * 4.6).toFixed(2)} L${(69 + c * 6.4).toFixed(2)},${(24 + sn * 6.4).toFixed(2)}`
    })
    .join(' ')}" stroke-width=".4" fill="none"/>`
const growers =
  grow(0.12, panel(28.6)) +
  grow(0.3, tree(61, 1)) +
  grow(0.45, panel(36.4)) +
  grow(0.6, tree(69, 1.15)) +
  grow(0.72, sun) +
  grow(0.84, tree(75.2, 0.8))

// ───────────────────────── behaviour ─────────────────────────
interface State {
  drag: number
  u: number
}
const STATE = new WeakMap<HTMLElement, State>()
const stateOf = (root: HTMLElement): State => {
  let s = STATE.get(root)
  if (!s) {
    s = { drag: 0, u: 0 }
    STATE.set(root, s)
  }
  return s
}

/** Meter progress: scrolling lowers it between u = 0.5 and 0.74; dragging can lower it further (never raise it). */
const progress = (s: State): number => Math.max(smooth(seg(s.u, 0.5, 0.74)), s.drag)

/** Hides ink groups that haven't started yet (round caps of an undrawn stroke otherwise leave dots). Pure in u. */
const hideUndrawn = (root: HTMLElement, u: number): void =>
  root.querySelectorAll<SVGGElement>('.dp-draw').forEach((g) => {
    g.style.visibility = u <= Number(g.dataset.a) ? 'hidden' : ''
  })

function render(root: HTMLElement, s: State): void {
  const p = progress(s)
  const lvl = LVL_HI + (LVL_LO - LVL_HI) * p
  const col = root.querySelector<SVGRectElement>('.cb-col')
  if (col) {
    col.setAttribute('y', lvl.toFixed(2))
    col.setAttribute('height', (BULB.cy - lvl).toFixed(2))
  }
  root.querySelector<SVGGElement>('.cb-handle')?.setAttribute('transform', `translate(0 ${lvl.toFixed(2)})`)
  // Smoke: the far puff goes first; the one at the chimney shrinks last, to a small puff (no number is claimed).
  root.querySelectorAll<SVGGElement>('.cb-puff').forEach((g) => {
    const k = Number(g.dataset.k)
    const cx = Number(g.dataset.cx)
    const cy = Number(g.dataset.cy)
    const sc = k === 0 ? 1 - 0.55 * smooth(seg(p, 0.45, 1)) : 1 - smooth(seg(p, k === 2 ? 0 : 0.2, k === 2 ? 0.55 : 0.8))
    g.setAttribute('transform', `translate(${cx} ${cy}) scale(${Math.max(sc, 0.001).toFixed(3)}) translate(${-cx} ${-cy})`)
    g.style.opacity = sc < 0.03 ? '0' : '1'
  })
  root.querySelectorAll<SVGGElement>('.cb-grow').forEach((g) => {
    const pr = seg(p, Number(g.dataset.p), Number(g.dataset.p) + 0.16)
    g.style.visibility = pr <= 0 ? 'hidden' : ''
    g.querySelectorAll<SVGElement>('path, circle').forEach((el) => {
      el.style.strokeDashoffset = String(1 - pr)
      el.style.fillOpacity = String(clamp01((pr - 0.5) / 0.5))
    })
  })
}

export const carbon: DiaryPage = {
  id: 'carbon',
  side: 'r',
  entryIds: ['carbon-neutral'],
  css: `.dp-carbon .dp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }`,
  html: `${row(1, appear(0.37, 0.4, `<span class="dp-day">${COPY.day}</span>`))}
    ${row(2, appear(0.4, 0.45, COPY.l1))}
    ${row(3, appear(0.45, 0.5, COPY.l2))}
    ${svg(ink(0.44, 0.5, campus + smoke) + ink(0.46, 0.51, meter + mercury + handle) + growers + `<rect class="dp-hit cb-hit" x="5" y="17" width="22" height="50" fill="transparent"/>`)}
    ${row(17, appear(0.74, 0.79, `${COPY.result} ${needed(COPY.resultNeeded)}`))}
    <div class="dp-sr"><p>${FACT.title}. ${FACT.blurb}</p></div>`,
  update(root, u) {
    const s = stateOf(root)
    s.u = u
    hideUndrawn(root, u)
    render(root, s)
  },
  bind(root) {
    const hit = root.querySelector<SVGRectElement>('.cb-hit')
    const host = hit?.ownerSVGElement
    if (!hit || !host) return () => {}
    const s = stateOf(root)
    let dragging = false
    const toP = (e: PointerEvent): number => {
      const r = host.getBoundingClientRect()
      const y = ((e.clientY - r.top) / (r.height || 1)) * 96
      return clamp01((y - LVL_HI) / (LVL_LO - LVL_HI))
    }
    const down = (e: PointerEvent): void => {
      dragging = true
      hit.setPointerCapture(e.pointerId)
      s.drag = toP(e)
      render(root, s)
      e.preventDefault()
      e.stopPropagation()
    }
    const move = (e: PointerEvent): void => {
      if (!dragging) return
      s.drag = toP(e)
      render(root, s)
      e.preventDefault()
    }
    const up = (e: PointerEvent): void => {
      dragging = false
      if (hit.hasPointerCapture(e.pointerId)) hit.releasePointerCapture(e.pointerId)
    }
    hit.addEventListener('pointerdown', down)
    hit.addEventListener('pointermove', move)
    hit.addEventListener('pointerup', up)
    hit.addEventListener('pointercancel', up)
    return () => {
      hit.removeEventListener('pointerdown', down)
      hit.removeEventListener('pointermove', move)
      hit.removeEventListener('pointerup', up)
      hit.removeEventListener('pointercancel', up)
    }
  },
}
