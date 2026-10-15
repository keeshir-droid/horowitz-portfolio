/**
 * Chapter 3 "Diary of a Boarding School Kid": the book engine's timeline and tuning. ENGINE-owned.
 * Every time here is in seconds of scroll-time (meta.duration = DUR). This file must stay light: meta.ts imports it
 * eagerly, so it never imports the page modules. PLAN mirrors pages/index.ts (keys + kinds); the engine checks the
 * real SPREADS against it in DEV and always lays out the real list.
 *
 * Shape of the chapter:
 *   0 .. OPEN.rest      the arcade "SAVING…" frame, the diary drops onto it (thud, shake, dust), the desk fades in
 *   .. OPEN.cover[0]    the closed cover rests (readable title)
 *   OPEN.cover          the cover opens, the book slides to the centre
 *   per spread          a dwell (pages ink themselves, u = 0..1), then a page turn into the next spread
 *   final               a short hold on the last page, the book closes, the screen fades to black (Ch4 starts dark)
 */
import { entries } from '../../../content/entries'

export type SpreadKind = 'read' | 'riffle' | 'final'
export interface SpreadPace {
  key: string
  kind: SpreadKind
}

/** Every chapter-3 entry (all of them point at this scene in src/content/entries.ts). */
export const ENTRY_IDS: readonly string[] = entries.filter((e) => e.scene === 'ch3-diary').map((e) => e.id)

/** Pixelate palette when leaving this chapter: paper, ink, cover blue. */
export const TRANSITION_COLORS: readonly string[] = ['#fdfcf6', '#161616', '#2f7fc0']

/** Number of flipbook pages in the riffle (must match pages/riffle.ts). */
export const RIFFLE_PAGES = 24

/** Mirror of pages/index.ts. */
export const PLAN: readonly SpreadPace[] = [
  { key: 'open', kind: 'read' },
  { key: 'honors-carbon', kind: 'read' },
  { key: 'motor', kind: 'read' },
  { key: 'stage-java', kind: 'read' },
  { key: 'pet', kind: 'read' },
  ...Array.from({ length: RIFFLE_PAGES }, (_, k): SpreadPace => ({ key: `riffle-${k}`, kind: 'riffle' })),
  { key: 'final', kind: 'final' },
]

/** Seconds of reading time per spread key (the page's u runs 0..1 across this). */
export const DWELL: Readonly<Record<string, number>> = {
  open: 7,
  'honors-carbon': 10,
  motor: 9,
  'stage-java': 10,
  pet: 6,
}
export const DWELL_DEFAULT = 8
/** Each flipbook frame holds still this long so the corner doodle is actually seen (a riffle is snap + pause). */
export const DWELL_RIFFLE = 0.2
export const DWELL_FINAL = 2.5

/** Page-turn lengths (seconds): normal, inside the riffle, and the last turn onto the final page. */
export const TURN = { read: 1.2, riffle: 0.12, toFinal: 0.7 } as const
/** How far the peeling corner lifts (fraction of page height) for a normal turn and a riffle turn. */
export const LIFT = { read: 0.3, riffle: 0.1 } as const

/**
 * Opening, seconds from the start of the chapter. The shell's cross-chapter pixelate covers the first ~1.8 s of this
 * chapter (today; it grows as chapters 4/5 are added) and deep links land right after it, so the arcade frame holds
 * under the pixelate and the drop starts just after: a deep link opens on the "SAVING…" frame, not mid-fall.
 */
export const OPEN = {
  /** The diary starts falling (the shell no longer hides scene starts under the pixelate, so no padding needed). */
  fall: 0.9,
  /** It hits the desk: thud, shake, dust. */
  land: 1.35,
  bounce: 0.28,
  shake: 0.24,
  dust: 0.7,
  /** The arcade frame fades out into the desk. */
  arcadeFade: [1.3, 1.75] as const,
  /** Everything has settled (closed cover resting). */
  rest: 2.05,
  /** The cover opens. */
  cover: [3.2, 4.4] as const,
} as const

/** End: the book closes after the final hold, then the screen fades to black. */
export const CLOSE = 1.3
export const FADE = 1.5

/** Single-page (portrait) mode: length of the mid-spread turn from the left page to the right page. */
export const MID_TURN = 1.0
/** Which pages single-page mode shows per kind (riffle and final left pages are scribble backs: skipped). */
export const PHONE_SHOW_LEFT: Readonly<Record<SpreadKind, boolean>> = { read: true, riffle: false, final: false }
/** Viewport aspect (w / h) below which the book shows one page at a time. */
export const ONE_PAGE_BELOW = 1.1

/** A spread's entries unlock once its reading progress passes this (forward only). */
export const UNLOCK_AT = 0.15

/** Space kept clear for the story HUD bar (top) and the chapter dock (bottom), CSS px (same as Chapter 2). */
export const SAFE_TOP = 84
export const safeBottom = (w: number): number => (w <= 640 ? 132 : 80)

// ───────────────────────── timeline ─────────────────────────
export interface SpreadTime {
  key: string
  kind: SpreadKind
  /** Dwell window: u = 0 at a, 1 at b. */
  a: number
  b: number
  /** Turn into the next spread: [b, b + turn]; 0 for the last spread. */
  turn: number
  lift: number
}
export interface BookTimeline {
  spreads: SpreadTime[]
  /** Book closes over [close, close + CLOSE], then fades to black over [fade, total]. */
  close: number
  fade: number
  total: number
}

const turnAfter = (k: number, list: readonly SpreadPace[]): number => {
  const next = list[k + 1]
  if (!next) return 0
  if (next.kind === 'final') return TURN.toFinal
  return next.kind === 'riffle' || list[k].kind === 'riffle' ? TURN.riffle : TURN.read
}
const dwellOf = (s: SpreadPace): number =>
  s.kind === 'riffle' ? DWELL_RIFFLE : s.kind === 'final' ? DWELL_FINAL : (DWELL[s.key] ?? DWELL_DEFAULT)

export function buildBookTimeline(list: readonly SpreadPace[]): BookTimeline {
  let t = OPEN.cover[1]
  const spreads: SpreadTime[] = list.map((s, k) => {
    const a = t
    const b = a + dwellOf(s)
    const turn = turnAfter(k, list)
    t = b + turn
    const riffly = s.kind === 'riffle' || list[k + 1]?.kind === 'riffle'
    return { key: s.key, kind: s.kind, a, b, turn, lift: riffly ? LIFT.riffle : LIFT.read }
  })
  const close = t
  const fade = close + CLOSE
  return { spreads, close, fade, total: fade + FADE }
}

/** Seconds of scroll-time for the whole chapter (≈ 63 s). */
export const DUR: number = buildBookTimeline(PLAN).total
