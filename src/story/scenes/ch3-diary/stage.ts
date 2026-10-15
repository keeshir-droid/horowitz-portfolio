/**
 * Chapter 3 book engine, DOM part: builds the desk/book/cover/arcade elements once, then `paint()` applies a
 * FrameState (book.ts). Pages are mounted into slots by key (a slot's DOM is only rebuilt when its page changes),
 * inked with kit.applyInk + page.update every paint, and bound for interaction only in the settled slots while the
 * scene is active. ENGINE-owned.
 */
import './diary.css'
import './book.css'
import { OPEN } from './config'
import { ARCADE_HTML, COVER_HTML } from './cover'
import { curlStyles } from './curl'
import { pageOf, seg, type FrameState, type PageRef } from './book'
import { DEFS_SVG, applyInk, corner, prepInk } from './kit'
import type { DiaryPage, Spread } from './types'

export type BookModeName = 'one' | 'two'

export interface StageLayout {
  w: number
  h: number
  mode: BookModeName
  /** Page width/height in px (exactly 80:96). */
  pw: number
  ph: number
  /** Book box (open book: two pages, or one page) in scene px. */
  x: number
  y: number
  bw: number
}

type SlotName = 'left' | 'leftFade' | 'under' | 'front' | 'flap' | 'rightFade' | 'coverBack'
/** Slots whose page is settled and readable: the only ones that get page.bind(). */
const INTERACTIVE: ReadonlySet<SlotName> = new Set<SlotName>(['left', 'under'])

interface Slot {
  name: SlotName
  el: HTMLElement
  key: string
  ref: PageRef | null
  page: DiaryPage | null
  root: HTMLElement | null
  u: number
  off: (() => void) | null
}

/** Blank paper: the back of a page while it curls (single-page mode), and the reduced-motion crossfade layers. */
const BLANK = 'blank-l'
const BLANK_R = 'blank-r'
const BLANK_L = BLANK
type Blank = typeof BLANK | typeof BLANK_R
const N_PUFFS = 8
const injectedCss = new Set<string>()

function injectCss(p: DiaryPage): void {
  if (!p.css || injectedCss.has(p.id) || document.getElementById(`dp-css-${p.id}`)) return
  injectedCss.add(p.id)
  const st = document.createElement('style')
  st.id = `dp-css-${p.id}`
  st.textContent = p.css
  document.head.appendChild(st)
}

const div = (cls: string, parent?: HTMLElement): HTMLDivElement => {
  const d = document.createElement('div')
  d.className = cls
  parent?.appendChild(d)
  return d
}

export class DiaryStage {
  private spreads: readonly Spread[]
  private htmlCache = new Map<string, string>()
  private slots: Record<SlotName, Slot>
  private layout: StageLayout | null = null
  private reduced = false
  private el: {
    root: HTMLElement
    arcade: HTMLElement
    dots: HTMLElement
    bar: HTMLElement[]
    world: HTMLElement
    dodge: HTMLElement
    wrap: HTMLElement
    shadow: HTMLElement
    book: HTMLElement
    front: HTMLElement
    flap: HTMLElement
    shadeU: HTMLElement
    frontShade: HTMLElement
    flapShade: HTMLElement
    cover: HTMLElement
    black: HTMLElement
    puffs: HTMLElement[]
  }

  constructor(host: HTMLElement, spreads: readonly Spread[]) {
    this.spreads = spreads
    const root = div('c3-root c3-two', host)
    const defs = div('', root)
    defs.innerHTML = DEFS_SVG
    const world = div('c3-world', root)
    const dodge = div('c3-dodge', world)
    const wrap = div('c3-wrap dp-book', dodge)
    const shadow = div('c3-shadow', wrap)
    const book = div('c3-book', wrap)
    const hl = div('c3-half c3-l', book)
    const left = div('c3-slot', hl)
    const leftFade = div('c3-slot c3-fadeL', hl)
    const hr = div('c3-half c3-r', book)
    const under = div('c3-slot c3-under', hr)
    const shadeU = div('c3-shadeU', hr)
    const front = div('c3-front', hr)
    const frontPage = div('c3-slot', front)
    const frontShade = div('c3-shade', front)
    const flap = div('c3-flap', hr)
    const flapPage = div('c3-slot', flap)
    const flapShade = div('c3-shade', flap)
    const rightFade = div('c3-slot c3-fadeR', hr)
    const cover = div('c3-cover', book)
    const cfront = div('c3-face c3-cfront', cover)
    cfront.innerHTML = COVER_HTML
    const cback = div('c3-face c3-cback', cover)
    const coverBack = div('c3-slot', cback)
    const puffs = Array.from({ length: N_PUFFS }, () => div('c3-puff', wrap))
    const arcade = div('c3-arcade', root)
    arcade.innerHTML = ARCADE_HTML
    const black = div('c3-black', root)
    this.el = {
      root,
      arcade,
      dots: arcade.querySelector('.c3-arc-dots') as HTMLElement,
      bar: [...arcade.querySelectorAll<HTMLElement>('.c3-arc-bar i')],
      world,
      dodge,
      wrap,
      shadow,
      book,
      front,
      flap,
      shadeU,
      frontShade,
      flapShade,
      cover,
      black,
      puffs,
    }
    const mk = (name: SlotName, el: HTMLElement): Slot => ({ name, el, key: '', ref: null, page: null, root: null, u: NaN, off: null })
    this.slots = {
      left: mk('left', left),
      leftFade: mk('leftFade', leftFade),
      under: mk('under', under),
      front: mk('front', frontPage),
      flap: mk('flap', flapPage),
      rightFade: mk('rightFade', rightFade),
      coverBack: mk('coverBack', coverBack),
    }
  }

  get rootEl(): HTMLElement {
    return this.el.root
  }

  setLayout(L: StageLayout, reduced: boolean): void {
    const o = this.layout
    if (o && o.w === L.w && o.h === L.h && o.mode === L.mode && o.pw === L.pw && this.reduced === reduced) return
    this.layout = L
    this.reduced = reduced
    const { root, wrap } = this.el
    root.classList.toggle('c3-one', L.mode === 'one')
    root.classList.toggle('c3-two', L.mode === 'two')
    root.classList.toggle('c3-reduced', reduced)
    wrap.style.setProperty('--pw', `${L.pw}px`)
    wrap.style.left = `${L.x}px`
    wrap.style.top = `${L.y}px`
    wrap.style.width = `${L.bw}px`
    wrap.style.height = `${L.ph}px`
    wrap.style.perspective = `${Math.round(L.pw * 5)}px`
    const ps = Math.round(L.pw * 0.09)
    for (const p of this.el.puffs) {
      p.style.width = `${ps}px`
      p.style.height = `${ps}px`
    }
    // ink depends on nothing layout-related, but force a refresh of every mounted page anyway
    for (const s of Object.values(this.slots)) s.u = NaN
  }

  /** CSS transform for the toast-dodge wrapper ('' = none). */
  setDodge(transform: string): void {
    this.el.dodge.style.transform = transform
  }

  private pageHtml(r: PageRef): string {
    let h = this.htmlCache.get(r.key)
    if (h === undefined) {
      const p = pageOf(this.spreads, r)
      const n = r.s * 2 + (r.side === 'r' ? 1 : 0)
      h = `<div class="dp-page ${p.side} dp-${p.id}">${p.html}${r.side === 'r' ? corner(r.s, this.spreads.length) : ''}${n > 0 ? `<div class="dp-pno">${n}</div>` : ''}</div>`
      this.htmlCache.set(r.key, h)
    }
    return h
  }

  /** Put page `r` (or blank paper, or nothing) into a slot. No-op when it is already there. */
  private mount(name: SlotName, r: PageRef | null | Blank): void {
    const s = this.slots[name]
    const key = typeof r === 'string' ? r : r ? r.key : ''
    if (s.key === key) return
    this.unbind(s)
    s.key = key
    s.u = NaN
    if (!r) {
      s.el.innerHTML = ''
      s.ref = s.page = s.root = null
      return
    }
    if (typeof r === 'string') {
      s.el.innerHTML = `<div class="dp-page ${r === BLANK_R ? 'r' : 'l'} c3-blank"></div>`
      s.ref = s.page = s.root = null
      return
    }
    s.el.innerHTML = this.pageHtml(r)
    s.ref = r
    s.page = pageOf(this.spreads, r)
    s.root = s.el.firstElementChild as HTMLElement
    injectCss(s.page)
    prepInk(s.root)
  }

  private unbind(s: Slot): void {
    if (!s.off) return
    try {
      s.off()
    } catch {
      /* a page's cleanup must never break the book */
    }
    s.off = null
  }

  paint(st: FrameState, t: number, uOf: (r: PageRef) => number, active: boolean): void {
    const L = this.layout
    if (!L) return
    const E = this.el
    const two = L.mode === 'two'

    // arcade frame
    E.arcade.style.opacity = String(st.arcade)
    E.arcade.style.display = st.arcade <= 0.001 ? 'none' : ''
    if (st.arcade > 0) {
      E.dots.textContent = '.'.repeat(Math.floor(t * 3.2) % 4)
      const on = Math.floor(seg(t, 0.1, OPEN.fall) * E.bar.length + 1e-6)
      E.bar.forEach((b, i) => b.classList.toggle('on', i < on))
    }

    // drop, shake, slide
    E.world.style.transform = st.shakeX || st.shakeY ? `translate(${st.shakeX.toFixed(3)}%, ${st.shakeY.toFixed(3)}%)` : ''
    E.wrap.style.opacity = String(st.bookOpacity)
    E.wrap.style.visibility = st.bookOpacity <= 0.001 ? 'hidden' : ''
    E.wrap.style.transform =
      st.dropY || st.dropRot || st.dropScale !== 1 ? `translateY(${st.dropY.toFixed(2)}%) rotate(${st.dropRot.toFixed(3)}deg) scale(${st.dropScale.toFixed(4)})` : ''
    const closedOff = two ? 25 * (1 - st.shift) : 0
    E.book.style.transform = two && closedOff > 0.001 ? `translateX(${(-closedOff).toFixed(3)}%)` : ''
    E.shadow.style.left = `${closedOff - 1}%`
    E.shadow.style.right = `${closedOff - 1}%`

    // dust: puffs spread out from both bottom corners of the closed book
    E.puffs.forEach((d, i) => {
      if (st.dust < 0) {
        d.style.opacity = '0'
        return
      }
      const pr = st.dust
      const side = i < N_PUFFS / 2 ? -1 : 1
      const edge = two ? (side < 0 ? 25 : 75) : side < 0 ? 0 : 100
      const x = edge + side * pr * (6 + (i % 4) * 4) * (two ? 1 : 2)
      d.style.left = `calc(${x.toFixed(2)}% - ${L.pw * 0.045}px)`
      d.style.top = `calc(${(100 - pr * (3 + (i % 3) * 2.5)).toFixed(2)}% - ${L.pw * 0.045}px)`
      d.style.opacity = String(pr > 0 && pr < 1 ? (1 - pr) * 0.7 : 0)
      d.style.transform = `scale(${(0.6 + pr * (1.4 + (i % 2))).toFixed(3)})`
    })

    // cover
    E.cover.style.display = st.coverOn ? '' : 'none'
    E.cover.style.transform = st.coverOn ? `rotateY(${(-st.coverAngle).toFixed(2)}deg)` : ''
    this.mount('coverBack', st.coverOn ? st.coverBack : null)

    // slots
    this.mount('left', two ? st.left : null)
    this.mount('under', st.under)
    this.mount('leftFade', two && st.leftBlankO > 0 ? BLANK_L : null)
    this.slots.leftFade.el.style.opacity = String(st.leftBlankO)
    this.mount('rightFade', st.rightBlankO > 0 ? BLANK_R : null)
    this.slots.rightFade.el.style.opacity = String(st.rightBlankO)

    // the turning page
    const cs = st.turn ? curlStyles(st.turn.f, st.turn.lift, L.pw, L.ph) : null
    if (st.turn && cs) {
      this.mount('front', st.turn.front)
      this.mount('flap', st.turn.back ?? BLANK)
      E.front.style.clipPath = cs.frontClip
      E.frontShade.style.background = cs.frontShade
      E.shadeU.style.clipPath = cs.underShadeClip
      E.shadeU.style.background = cs.underShade
      E.flap.style.transform = cs.flapTransform
      E.flap.style.clipPath = cs.flapClip
      E.flapShade.style.background = cs.flapShade
      E.front.style.display = E.flap.style.display = E.shadeU.style.display = ''
    } else {
      E.front.style.display = E.flap.style.display = E.shadeU.style.display = 'none'
      this.mount('front', null)
      this.mount('flap', null)
    }

    // ink + per-page update + interaction binding
    for (const s of Object.values(this.slots)) {
      if (!s.page || !s.root || !s.ref) continue
      const u = uOf(s.ref)
      if (u !== s.u) {
        s.u = u
        applyInk(s.root, u)
        try {
          s.page.update?.(s.root, u)
        } catch (e) {
          if (import.meta.env.DEV) console.warn(`[ch3-diary] page "${s.page.id}" update threw`, e)
        }
      }
      const want = active && INTERACTIVE.has(s.name) && !!s.page.bind
      if (want && !s.off) {
        try {
          s.off = s.page.bind?.(s.root) ?? null
        } catch (e) {
          if (import.meta.env.DEV) console.warn(`[ch3-diary] page "${s.page.id}" bind threw`, e)
        }
      } else if (!want && s.off) this.unbind(s)
    }

    E.black.style.opacity = String(st.black)
  }

  destroy(): void {
    for (const s of Object.values(this.slots)) this.unbind(s)
    this.el.root.remove()
  }
}
