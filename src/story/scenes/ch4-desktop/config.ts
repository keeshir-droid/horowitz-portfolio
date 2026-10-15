/**
 * Chapter 4 "The builder years, on the family computer": timeline, geometry and copy. Light on purpose: meta.ts
 * imports it eagerly. Every time is in seconds of scroll-time (meta.duration = DUR); the scene is a pure function of
 * t = progress * DUR (pointer clicks on the 21-in-21 icons add on top).
 *
 * Beats (approved prototype docs/CHAPTER4-5-PROTOTYPE.html, re-ordered: pet brand BEFORE the décor tycoon):
 *   power on + boot → mail (admission) → visa error → screen dies → CONTINUE? 9…5 → YES / "So I started building."
 *   → setup wizard (accelerator) → pet brand sheet → Décor Tycoon → feed → chat nudge → pitch slideshow
 *   → 21 in 21 folder → Idea Tester + Ad Maker → badge + prototyping class → windows minimise
 *   → pull back (room turns golden, the window shows San Francisco at sunset) → push into the window (last frame = sky).
 */
import { entries } from '../../../content/entries'

export const SCENE_ID = 'ch4-desktop'

/** Every chapter-4 entry (all of them point at this scene in src/content/entries.ts). */
export const ENTRY_IDS: readonly string[] = entries.filter((e) => e.scene === SCENE_ID).map((e) => e.id)

/** Pixelate palette when leaving this chapter (Ch5 enters with a crossfade anyway): sky blue, peach, gold, skyline. */
export const TRANSITION_COLORS: readonly string[] = ['#3a5aa0', '#d9846a', '#ffc77a', '#6a3446']

/** Seconds of scroll-time (weight 44 vs Ch3's 38 at ~63 s). */
export const DUR = 73

type Span = readonly [number, number]

/** Beat times (seconds). [a, b] = on-screen window (opens at a, gone at b). */
export const T = {
  crtOn: 0.5,
  powerLine: [0.55, 1.05] as Span,
  boot: [1.0, 3.5] as Span,
  zoom: [1.6, 3.6] as Span,
  mailPing: 4.0,
  mail: [4.6, 12.6] as Span,
  err: 9.6,
  off: [12.6, 13.4] as Span,
  cont: [13.6, 18.6] as Span,
  /** First countdown number (9), then one per COUNT_STEP: 9, 8, 7, 6, 5. */
  count0: 13.9,
  yes: 16.9,
  build: 17.35,
  setup: [18.6, 22.8] as Span,
  setupBar: [19.2, 21.3] as Span,
  setupDone: 21.4,
  pet: [22.8, 28.2] as Span,
  /** Product-sheet diagram steps appear at these times. */
  petSteps: [23.5, 24.2, 24.9, 25.6, 26.3] as readonly number[],
  tyc: [28.2, 39.2] as Span,
  counter: [29.2, 36.6] as Span,
  interest: [32.5, 37.2] as Span,
  tycDone: 36.7,
  tycMsg: 37.6,
  feed: [39.2, 44.4] as Span,
  posts: [39.8, 43.8] as Span,
  chat: [41.2, 44.4] as Span,
  typing: 42.3,
  chatYes: 43.0,
  pitch: [44.2, 48.0] as Span,
  pitchApplause: 46.6,
  fold: [47.8, 55.0] as Span,
  /** First live icon pops in here, then one every ICON_STEP. */
  icon0: 48.6,
  locked0: 51.9,
  test: [55.0, 61.0] as Span,
  typed: [55.6, 56.9] as Span,
  variants: 57.0,
  votes: [57.4, 58.6] as Span,
  winner: 58.7,
  ad: [59.0, 61.0] as Span,
  adBar: [59.25, 60.05] as Span,
  adDone: 60.1,
  badge: [61.0, 66.0] as Span,
  badgeDrop: [61.0, 61.6] as Span,
  cls: [62.6, 66.0] as Span,
  seats: [63.6, 64.8] as Span,
  clsApplause: 65.0,
  min: [66.0, 66.7] as Span,
  pull: [66.8, 69.4] as Span,
  gold: [67.2, 69.6] as Span,
  push: [69.8, 72.3] as Span,
  sky: [71.4, 72.5] as Span,
} as const

export const COUNT_STEP = 0.6
export const COUNT_NUMBERS = [9, 8, 7, 6, 5] as const
export const ICON_STEP = 0.45
/** Décor Tycoon customers: one enters every CUSTOMER_STEP from CUSTOMER_0 and takes CUSTOMER_WALK to reach the till. */
export const CUSTOMERS = 14
export const CUSTOMER_0 = 29.3
export const CUSTOMER_STEP = 0.5
export const CUSTOMER_WALK = 2.0

/**
 * Décor brand numbers, as in src/content/entries.ts ('decor-brand': "close to $16,000 in revenue in under six months
 * from roughly $60"). The counter climbs towards REVENUE and lands on "~$16,000"; the time bar never reaches 6 months.
 */
export const DECOR = { start: 60, revenue: 16000, months: 6 } as const

/** Unlock beats (scroll seconds). Several ids in one beat share one card (tier rules in index.tsx). */
export const UNLOCKS: readonly { t: number; ids: readonly string[] }[] = [
  { t: 10.4, ids: ['visa'] },
  { t: T.setupDone, ids: ['accelerator'] },
  { t: 25.6, ids: ['pet-brand'] },
  { t: T.tycDone, ids: ['decor-brand'] },
  { t: 46.0, ids: ['content-pitch'] },
  { t: 51.6, ids: ['21-in-21'] },
  { t: T.adDone, ids: ['idea-testing-platform', 'ad-automation'] },
  { t: 61.8, ids: ['unconference'] },
  { t: 64.8, ids: ['prototyping-class'] },
]

export type DeskCueName =
  | 'crtOn'
  | 'boot'
  | 'mail'
  | 'windowOpen'
  | 'click'
  | 'error'
  | 'screenOff'
  | 'countdown'
  | 'continueYes'
  | 'installDone'
  | 'sale'
  | 'cashBig'
  | 'message'
  | 'chatNudge'
  | 'typing'
  | 'vote'
  | 'adDone'
  | 'badge'
  | 'applause'
  | 'minimise'

/** Sound cues, fired once each when scrolling forward past them. */
export const CUES: readonly { t: number; cue: DeskCueName }[] = (() => {
  const c: { t: number; cue: DeskCueName }[] = [
    { t: T.crtOn, cue: 'crtOn' },
    { t: T.boot[0] + 0.15, cue: 'boot' },
    { t: T.mailPing, cue: 'mail' },
    { t: T.mail[0] - 0.2, cue: 'click' },
    { t: T.mail[0], cue: 'windowOpen' },
    { t: T.err, cue: 'error' },
    { t: T.off[0], cue: 'screenOff' },
    ...COUNT_NUMBERS.map((_, k) => ({ t: T.count0 + k * COUNT_STEP, cue: 'countdown' as const })),
    { t: T.yes, cue: 'continueYes' },
    { t: T.setup[0], cue: 'windowOpen' },
    { t: T.setupDone - 0.1, cue: 'click' },
    { t: T.setupDone, cue: 'installDone' },
    { t: T.pet[0], cue: 'windowOpen' },
    { t: T.tyc[0], cue: 'windowOpen' },
    ...Array.from({ length: CUSTOMERS }, (_, i) => ({ t: CUSTOMER_0 + i * CUSTOMER_STEP + CUSTOMER_WALK, cue: 'sale' as const })),
    { t: T.tycDone, cue: 'cashBig' },
    { t: T.tycMsg, cue: 'message' },
    { t: T.feed[0], cue: 'windowOpen' },
    { t: T.chat[0], cue: 'chatNudge' },
    { t: T.typing, cue: 'typing' },
    { t: T.chatYes, cue: 'message' },
    { t: T.pitchApplause, cue: 'applause' },
    { t: T.fold[0], cue: 'windowOpen' },
    { t: T.test[0], cue: 'windowOpen' },
    { t: T.typed[0], cue: 'typing' },
    { t: T.votes[0], cue: 'vote' },
    { t: T.votes[0] + 0.4, cue: 'vote' },
    { t: T.votes[0] + 0.8, cue: 'vote' },
    { t: T.winner, cue: 'click' },
    { t: T.ad[0], cue: 'windowOpen' },
    { t: T.adDone, cue: 'adDone' },
    { t: T.badgeDrop[1] - 0.2, cue: 'badge' },
    { t: T.cls[0], cue: 'windowOpen' },
    { t: T.clsApplause, cue: 'applause' },
    { t: T.min[0], cue: 'minimise' },
  ]
  return c.sort((a, b) => a.t - b.t)
})()

/** Space kept clear for the story HUD bar (top) and the chapter dock (bottom), CSS px (same as Chapters 2, 3, 5). */
export const SAFE_TOP = 84
export const safeBottom = (w: number): number => (w <= 640 ? 132 : 80)
/** Viewport aspect (w / h) below which the phone layout is used. */
export const PHONE_BELOW = 1.1
/** Text scale inside the monitor on phone (the 4:3 screen is only ~280 px tall there). */
export const PHONE_TEXT = 1.62

// ───────────────────────── room geometry (room units, 1600 × 900) ─────────────────────────
export const ROOM = { w: 1600, h: 900 } as const
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
/** The CRT's visible screen (exactly 4:3). */
export const SCREEN: Rect = { x: 736, y: 252, w: 384, h: 288 }
/** The wall window's glass (a wide picture window, close to 16:9 so the push-in matches the final frame). */
export const PANE: Rect = { x: 70, y: 84, w: 560, h: 330 }

/**
 * The hand-over palette (keep in sync with ch5-sf/config.ts): sky top→bottom, water from WATER_Y down, sun disk at
 * SUN (fractions of the frame), skyline silhouette colour.
 */
export const SKY: readonly (readonly [number, string])[] = [
  [0, '#3a5aa0'],
  [0.38, '#d9846a'],
  [0.62, '#ffc77a'],
  [0.8, '#ffdf9e'],
]
export const WATER = ['#e79a5c', '#5b3a5a'] as const
export const WATER_Y = 0.77
export const SUN = { x: 0.74, y: 0.62, color: '#fffbe6' } as const
export const SKYLINE = '#6a3446'
