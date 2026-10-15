/**
 * Chapter 5 "San Francisco" (the ending): timeline, palette and copy. Light on purpose: meta.ts imports it eagerly.
 * Every time is in seconds of scroll-time (meta.duration = DUR). The scene is a pure function of t = progress * DUR.
 *
 *   0          first frame = Chapter 4's last frame (its camera pushed through the window into this sky)
 *   CRANE      the camera cranes up over the bay: towers and the bridge rise into view, the sun lowers, lights come on
 *   CARD       the Adobe card rises in (the chapter's proof; unlocks `adobe`)
 *   SAVE       a Game Boy dialog: "Do you want to save your progress?" ▶YES blinks, SAVING…, PROGRESS SAVED.
 *   FINAL      "<N> ACHIEVEMENTS UNLOCKED", the ask, and the contact buttons; it stays up to the end of the scroll
 */
import { entries } from '../../../content/entries'

export const SCENE_ID = 'ch5-sf'

/** Entries this scene proves (all entries whose `scene` is this one; today just `adobe`). */
export const ENTRY_IDS: readonly string[] = entries.filter((e) => e.scene === SCENE_ID).map((e) => e.id)

/** "N ACHIEVEMENTS UNLOCKED": every entry the story itself unlocks (entries that have a scene). */
export const ACHIEVEMENT_COUNT: number = entries.filter((e) => !!e.scene).length

/** Seconds of scroll-time for the whole chapter (weight 7 vs Ch3's 38 at ~63 s, plus a generous final hold). */
export const DUR = 12.5

export const T = {
  /** Camera crane (ease in-out). */
  crane: [0.15, 7.2] as const,
  /** Sun lowers over the whole scene. */
  sun: [0, DUR] as const,
  /** Window lights switch on one by one. */
  lights: [2.2, 9.5] as const,
  /** Adobe card: rises in, holds, fades out. */
  cardIn: [1.3, 2.0] as const,
  cardOut: [5.6, 6.1] as const,
  /** Save dialog. */
  saveIn: [6.1, 6.4] as const,
  /** ▶YES blinks (selected), then SAVING…, then PROGRESS SAVED. */
  yes: [6.9, 7.6] as const,
  saving: [7.6, 8.2] as const,
  saved: 8.2,
  saveOut: [8.75, 9.0] as const,
  /** The final screen (darkening + text + buttons), then holds to DUR. */
  finalIn: [8.8, 9.6] as const,
} as const

/** Unlock time for this scene's entries (forward or deep link: everything up to the current time). */
export const UNLOCK_AT = 1.6

export type CueName = 'whoosh' | 'card' | 'save' | 'saved' | 'chord'
/** Sound cues, fired once when scrolling forward past them. */
export const CUES: readonly { t: number; cue: CueName }[] = [
  { t: 0.2, cue: 'whoosh' },
  { t: 1.4, cue: 'card' },
  { t: 6.15, cue: 'save' },
  { t: 8.2, cue: 'saved' },
  { t: 8.9, cue: 'chord' },
]

/** Space kept clear for the story HUD bar (top) and the chapter dock (bottom), CSS px (same as Chapters 2 and 3). */
export const SAFE_TOP = 84
export const safeBottom = (w: number): number => (w <= 640 ? 132 : 80)

/**
 * The hand-over palette. Chapter 4 ends on exactly this sky through its window; keep both in sync.
 * Sky top→bottom, water from WATER_Y down, sun disk at SUN (fractions of the viewport), skyline silhouette.
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
/** How far the sun sinks over the scene (fraction of the viewport height). */
export const SUN_DROP = 0.055
export const SKYLINE = '#6a3446'

/** Scene copy that is not an achievement claim (the achievement text comes from src/content/entries.ts). */
export const COPY = {
  save: 'Do you want to save your progress?',
  yes: 'YES',
  no: 'NO',
  saving: 'SAVING',
  saved: 'PROGRESS SAVED.',
  unlocked: 'ACHIEVEMENTS UNLOCKED',
  ask: 'Next level: the Horowitz Academy founding class.',
} as const
