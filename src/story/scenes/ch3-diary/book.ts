/**
 * Chapter 3 book engine, pure part: which page sits in which slot, how far a page has curled, every page's reading
 * progress u, the sound cues and the unlock schedule. Everything here is a pure function of the scroll-time t
 * (seconds), the layout mode and the reduced-motion flag. No DOM. ENGINE-owned.
 *
 * Two layouts share one timeline (config.ts):
 *  - 'two' (landscape): the open book shows a spread; a turn peels the right page over to the left.
 *  - 'one' (portrait/phone): one page at a time in reading order (left page, then right page); every step peels the
 *    current page away and its back is blank paper. Each read spread's dwell is split: left page, a short mid turn,
 *    right page. Riffle and final left pages (scribbled backs) are skipped.
 */
import { CLOSE, LIFT, MID_TURN, OPEN, PHONE_SHOW_LEFT, UNLOCK_AT, buildBookTimeline, type BookTimeline } from './config'
import type { DiaryPage, Spread } from './types'

export type BookMode = 'two' | 'one'

/** One page of the book: spread index + side. `key` is unique per page ("3l", "3r"). */
export interface PageRef {
  s: number
  side: 'l' | 'r'
  key: string
}
const ref = (s: number, side: 'l' | 'r'): PageRef => ({ s, side, key: `${s}${side}` })

/** What is on screen while the book is open: a spread (two) or a single page (one). */
export interface View {
  left: PageRef | null
  right: PageRef
  /** Dwell [a, b]; then a turn of `turn` seconds into the next view. */
  a: number
  b: number
  turn: number
  lift: number
  /** A riffle turn (quick, linear, quiet). */
  riffle: boolean
}

export interface Window {
  a: number
  b: number
  /** u at the start of the window (single-page mode skips a page's leading blank time). */
  lo: number
}

export interface Book {
  mode: BookMode
  spreads: readonly Spread[]
  tl: BookTimeline
  views: View[]
  win: Map<string, Window>
  /** Total seconds (t = progress * total). */
  total: number
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a || 1e-6))
export const ease = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/** Earliest ink/appear/tick start in a page's HTML (0 if none). */
function inkStart(p: DiaryPage): number {
  let lo = 1
  for (const m of p.html.matchAll(/data-[at]="([\d.]+)"/g)) lo = Math.min(lo, Number(m[1]))
  return lo >= 1 ? 0 : lo
}

/** Tick times (u) in a page's HTML. */
export function tickTimes(p: DiaryPage): number[] {
  return [...p.html.matchAll(/class="dp-tick" data-t="([\d.]+)"/g)].map((m) => Number(m[1]))
}

export const pageOf = (spreads: readonly Spread[], r: PageRef): DiaryPage => (r.side === 'l' ? spreads[r.s].left : spreads[r.s].right)

export function buildBook(spreads: readonly Spread[], mode: BookMode): Book {
  const tl = buildBookTimeline(spreads)
  const views: View[] = []
  const win = new Map<string, Window>()
  tl.spreads.forEach((st, k) => {
    const riffle = st.lift === LIFT.riffle
    win.set(`${k}l`, { a: st.a, b: st.b, lo: 0 })
    win.set(`${k}r`, { a: st.a, b: st.b, lo: 0 })
    if (mode === 'two') {
      views.push({ left: ref(k, 'l'), right: ref(k, 'r'), a: st.a, b: st.b, turn: st.turn, lift: st.lift, riffle })
      return
    }
    const lo = (side: 'l' | 'r'): number => Math.max(0, inkStart(pageOf(spreads, ref(k, side))) - 0.04)
    if (PHONE_SHOW_LEFT[st.kind]) {
      const d = st.b - st.a
      const mid = Math.min(MID_TURN, d * 0.3)
      const half = (d - mid) / 2
      views.push({ left: null, right: ref(k, 'l'), a: st.a, b: st.a + half, turn: mid, lift: LIFT.read, riffle: false })
      views.push({ left: null, right: ref(k, 'r'), a: st.b - half, b: st.b, turn: st.turn, lift: st.lift, riffle })
      win.set(`${k}l`, { a: st.a, b: st.a + half, lo: lo('l') })
      win.set(`${k}r`, { a: st.b - half, b: st.b, lo: lo('r') })
    } else {
      views.push({ left: null, right: ref(k, 'r'), a: st.a, b: st.b, turn: st.turn, lift: st.lift, riffle })
      win.set(`${k}r`, { a: st.a, b: st.b, lo: lo('r') })
    }
  })
  return { mode, spreads, tl, views, win, total: tl.total }
}

/** Reading progress of a page at time t. Reduced motion: every page is shown fully drawn. */
export function uOf(book: Book, r: PageRef, t: number, reduced: boolean): number {
  if (reduced) return 1
  const w = book.win.get(r.key)
  if (!w) return 1
  return w.lo + (1 - w.lo) * seg(t, w.a, w.b)
}

// ───────────────────────── frame state ─────────────────────────
export interface TurnState {
  front: PageRef
  /** null = the blank back of the paper (single-page mode). */
  back: PageRef | null
  /** 0..1 eased curl progress. */
  f: number
  lift: number
}

export interface FrameState {
  /** Arcade "SAVING…" frame opacity. */
  arcade: number
  /** Book group opacity (and the drop: % of book height, degrees, scale). */
  bookOpacity: number
  dropY: number
  dropRot: number
  dropScale: number
  /** Screen shake, % of the scene. */
  shakeX: number
  shakeY: number
  /** Dust puff progress 0..1, or -1 for none. */
  dust: number
  /** Two-page only: 0 = closed book centred (shifted half a page left), 1 = open book centred. */
  shift: number
  /** Cover rotation, 0 closed .. 180 fully open. */
  coverOn: boolean
  coverAngle: number
  /** Page printed on the inside of the cover (two-page: endpaper on opening, last left page on closing). */
  coverBack: PageRef | null
  left: PageRef | null
  under: PageRef | null
  turn: TurnState | null
  /** Reduced motion: opacity of a blank-paper layer over the left / right page (a dip-to-paper crossfade). */
  leftBlankO: number
  rightBlankO: number
  /** Final fade to black. */
  black: number
}

export function frameAt(book: Book, t: number, reduced: boolean): FrameState {
  const { views, tl, mode } = book
  const two = mode === 'two'
  const first = views[0]
  const last = views[views.length - 1]
  const s: FrameState = {
    arcade: 0,
    bookOpacity: 1,
    dropY: 0,
    dropRot: 0,
    dropScale: 1,
    shakeX: 0,
    shakeY: 0,
    dust: -1,
    shift: 1,
    coverOn: false,
    coverAngle: 180,
    coverBack: null,
    left: null,
    under: null,
    turn: null,
    leftBlankO: 0,
    rightBlankO: 0,
    black: seg(t, tl.fade, tl.total),
  }

  // ── opening: arcade frame, drop, thud ──
  const cf = ease(seg(t, OPEN.cover[0], OPEN.cover[1]))
  const cc = ease(seg(t, tl.close, tl.close + CLOSE))
  if (reduced) {
    // the arcade frame fades to the desk, then the resting book fades in
    const mid = (OPEN.fall + OPEN.rest) / 2
    s.arcade = 1 - seg(t, OPEN.fall, mid)
    s.bookOpacity = seg(t, mid, OPEN.rest)
  } else {
    s.arcade = 1 - seg(t, OPEN.arcadeFade[0], OPEN.arcadeFade[1])
    s.bookOpacity = t < OPEN.fall ? 0 : 1
    const dp = seg(t, OPEN.fall, OPEN.land)
    const fall = dp * dp
    const bounce = t > OPEN.land ? Math.sin(seg(t, OPEN.land, OPEN.land + OPEN.bounce) * Math.PI) * 1.6 : 0
    s.dropY = -150 * (1 - fall) - bounce
    s.dropRot = -9 * (1 - fall) - 1.6 * (1 - cf + cc)
    s.dropScale = 1.12 - 0.12 * fall
    if (t > OPEN.land && t < OPEN.land + OPEN.shake) {
      const k = Math.sin(t * 140) * (1 - seg(t, OPEN.land, OPEN.land + OPEN.shake)) * 0.5
      s.shakeX = k
      s.shakeY = k * 0.7
    }
    if (t > OPEN.land && t < OPEN.land + OPEN.dust) s.dust = seg(t, OPEN.land, OPEN.land + OPEN.dust)
  }

  // ── cover (opening) ──
  if (t < OPEN.cover[1]) {
    s.coverOn = true
    s.under = first.right
    if (reduced) {
      // dip crossfade: closed book fades out, open book fades in
      const x = seg(t, OPEN.cover[0], OPEN.cover[1])
      if (x < 0.5) {
        s.coverAngle = 0
        s.shift = 0
        s.bookOpacity *= 1 - 2 * x
      } else {
        s.coverOn = false
        s.left = first.left
        s.bookOpacity *= 2 * x - 1
      }
      return s
    }
    s.coverAngle = 180 * cf
    s.shift = cf
    s.coverBack = two ? first.left : null
    return s
  }

  // ── closing ──
  if (t >= tl.close) {
    s.under = last.right
    if (reduced) {
      const x = seg(t, tl.close, tl.close + CLOSE)
      if (x < 0.5) {
        s.left = last.left
        s.bookOpacity = 1 - 2 * x
      } else {
        s.coverOn = true
        s.coverAngle = 0
        s.shift = 0
        s.bookOpacity = 2 * x - 1
      }
      return s
    }
    if (cc <= 0) {
      s.left = last.left
      return s
    }
    s.coverOn = true
    s.coverAngle = 180 * (1 - cc)
    s.shift = 1 - cc
    s.coverBack = two ? last.left : null
    return s
  }

  // ── reading: dwell or turn ──
  for (let i = 0; i < views.length; i++) {
    const v = views[i]
    const next = views[i + 1]
    if (t < v.b || !next) {
      s.left = v.left
      s.under = v.right
      return s
    }
    if (t < v.b + v.turn) {
      const x = seg(t, v.b, v.b + v.turn)
      if (reduced) {
        // the old page fades to blank paper, then the new page fades in from it
        const out = x < 0.5
        s.left = out ? v.left : next.left
        s.under = out ? v.right : next.right
        s.rightBlankO = out ? 2 * x : 2 - 2 * x
        s.leftBlankO = two ? s.rightBlankO : 0
        return s
      }
      s.left = v.left
      s.under = next.right
      s.turn = { front: v.right, back: two ? next.left : null, f: v.riffle ? x : ease(x), lift: v.lift }
      return s
    }
  }
  s.left = last.left
  s.under = last.right
  return s
}

// ───────────────────────── sound cues + unlock schedule ─────────────────────────
export type CueKind = 'impact' | 'open' | 'whoosh' | 'riffle' | 'blip' | 'thud' | 'applause' | 'laugh'

/**
 * Audience cues on the stage comic page (pages/stage.ts, page id 'stage'), as that page's reading progress u:
 * applause once the "1. SOLO" panel and its caption are inked (u 0.09..0.19), a laugh once the stand-up panel's
 * "AHEM." bubble lands (u 0.39..0.41).
 */
const AUDIENCE_CUES: Readonly<Record<string, readonly { u: number; kind: CueKind }[]>> = {
  stage: [
    { u: 0.2, kind: 'applause' },
    { u: 0.42, kind: 'laugh' },
  ],
}
export interface Cue {
  t: number
  kind: CueKind
  /** Priority cues may follow another cue sooner than the normal rate cap. */
  pri: boolean
}

/** Time at which a page reaches reading progress u (inverse of uOf). */
function timeAtU(book: Book, r: PageRef, u: number): number {
  const w = book.win.get(r.key)
  if (!w) return Infinity
  const x = u <= w.lo ? 0 : (u - w.lo) / (1 - w.lo || 1e-6)
  return w.a + clamp01(x) * (w.b - w.a)
}

export function buildCues(book: Book): Cue[] {
  const out: Cue[] = [
    { t: OPEN.land, kind: 'impact', pri: true },
    { t: OPEN.cover[0] + 0.05, kind: 'open', pri: false },
    { t: book.tl.close + CLOSE * 0.86, kind: 'thud', pri: true },
  ]
  book.views.forEach((v, i) => {
    // every riffle turn gets its own (short, recorded) flick; the sound engine caps overlap and rate
    if (v.turn > 0 && i < book.views.length - 1) out.push({ t: v.b + (v.riffle ? 0.01 : 0.02), kind: v.riffle ? 'riffle' : 'whoosh', pri: false })
    for (const r of [v.left, v.right]) {
      if (!r) continue
      const page = pageOf(book.spreads, r)
      for (const at of tickTimes(page)) out.push({ t: timeAtU(book, r, at), kind: 'blip', pri: false })
      for (const c of AUDIENCE_CUES[page.id] ?? []) out.push({ t: timeAtU(book, r, c.u), kind: c.kind, pri: true })
    }
  })
  return out.sort((a, b) => a.t - b.t)
}

export interface UnlockStep {
  t: number
  ids: readonly string[]
}

/**
 * When each page's entries unlock: two-page = both pages of a spread once its u passes UNLOCK_AT (left page first);
 * single-page = each shown page once its own window passes UNLOCK_AT (entries of skipped pages ride with the right page).
 */
export function buildUnlocks(book: Book): UnlockStep[] {
  const out: UnlockStep[] = []
  book.spreads.forEach((sp, k) => {
    const L = sp.left.entryIds ?? []
    const R = sp.right.entryIds ?? []
    const at = (side: 'l' | 'r'): number => {
      const w = book.win.get(`${k}${side}`)
      return w ? w.a + UNLOCK_AT * (w.b - w.a) : Infinity
    }
    if (book.mode === 'two') {
      if (L.length) out.push({ t: at('l'), ids: L })
      if (R.length) out.push({ t: at('r') + 1e-6, ids: R })
      return
    }
    const leftShown = book.views.some((v) => v.right.key === `${k}l`)
    if (leftShown) {
      if (L.length) out.push({ t: at('l'), ids: L })
      if (R.length) out.push({ t: at('r'), ids: R })
    } else if (L.length || R.length) out.push({ t: at('r'), ids: [...L, ...R] })
  })
  return out.sort((a, b) => a.t - b.t)
}
