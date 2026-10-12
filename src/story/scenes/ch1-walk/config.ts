/**
 * Everything you would change to re-theme / re-time Chapter 1 lives here (top-down linear walk, docs/CHAPTER1.md).
 *
 * KEYS maps scene progress -> distance along the one route (world.ts ROUTE). Flat stretches are the stops.
 * BOXES are the Pokemon-style text boxes (data only). Each types out across its progress window `at`.
 */
export type PropKind = 'easel' | 'chess' | 'science' | 'robot'

export interface PropDef {
  id: string
  kind: PropKind
  label: string
  /** Top-left of the prop in world pixels. */
  x: number
  y: number
  /** Progress window during which the prop plays its own little animation (0..1 across it). */
  play: readonly [number, number]
  /** Side of the path the prop stands on, seen from the kid: -1 left, 1 right (kid turns to face it). */
  side: -1 | 1
  /** Kid pauses here (progress window), used to face the prop. */
  pause: readonly [number, number]
}

/** [progress, distance along route]. Linear interpolation between keys. */
export const KEYS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.07, 130], // easel
  [0.15, 130],
  [0.21, 300], // chess
  [0.29, 300],
  [0.35, 470], // science
  [0.45, 470],
  [0.51, 630], // robot
  [0.56, 630],
  [0.64, 740], // house, below the window shelf
  [0.79, 740],
  [0.83, 824], // door
  [1, 824],
]

export const PROPS: readonly PropDef[] = [
  { id: 'easel', kind: 'easel', label: 'Easel: add some paint', x: 122, y: 626, side: 1, pause: [0.07, 0.15], play: [0.03, 0.13] },
  { id: 'chess', kind: 'chess', label: 'Chess table: hop the knight', x: 124, y: 510, side: -1, pause: [0.21, 0.29], play: [0.215, 0.285] },
  { id: 'science', kind: 'science', label: 'Science bench: make bubbles', x: 122, y: 388, side: 1, pause: [0.35, 0.45], play: [0.355, 0.445] },
  { id: 'robot', kind: 'robot', label: 'Toy robot: say beep boop', x: 126, y: 274, side: -1, pause: [0.51, 0.56], play: [0.51, 0.56] },
]

/** One-shot text boxes: a single page, typed during the first TYPE_FRAC of the window, then held with the blinking arrow. */
export interface BoxDef {
  id: string
  text: string
  at: readonly [number, number]
  /** Entries unlocked when the box has finished typing. */
  entries?: readonly string[]
}
export const TYPE_FRAC = 0.25
/**
 * KEEP IN SYNC with src/content/entries.ts. `science-talent` says "top positions" and carries a `verify` note,
 * so the science line must NOT claim "top rank" until Risheek confirms the exam and result.
 * Each text must fit two lines of 28 characters (landscape font).
 */
export const BOXES: readonly BoxDef[] = [
  { id: 'art', text: 'Won a national art\ncompetition.', at: [0.075, 0.15], entries: ['national-art'] },
  { id: 'chess', text: 'School chess champion,\nGrade 5!', at: [0.215, 0.29], entries: ['chess'] },
  { id: 'science', text: 'Top positions in a national\nscience talent search.', at: [0.355, 0.45], entries: ['science-talent'] },
  { id: 'robot', text: 'BEEP BOOP.', at: [0.515, 0.56] },
  { id: 'olympiads', text: 'Won academic Olympiads, plus\na small award most years.', at: [0.65, 0.78], entries: ['olympiads', 'every-year'] },
]

export const BANNER = { line1: 'CHAPTER 1', line2: 'PRIMARY SCHOOL', in: [0, 0.015], out: [0.05, 0.07] } as const

/** The Chapter 2 break. */
export const BREAK = {
  flash: [0.85, 0.87] as readonly [number, number],
  wipe: [0.87, 0.93] as readonly [number, number],
  title: [0.93, 1] as readonly [number, number],
  line1: 'CHAPTER 2',
  line2: 'CHOOSE YOUR',
  line3: 'FIGHTER',
}

/**
 * Photo slot: a small framed picture on the house wall. Leave `src` undefined to hide it; set it
 * (for example '/media/ch1-walk/childhood.jpg') and it renders as a dithered four-tone picture.
 */
export const PHOTO: { src?: string; label: string } = {
  src: undefined,
  label: 'photo: childhood, add in public/media/ch1-walk/',
}

export const ENTRY_IDS = ['national-art', 'olympiads', 'science-talent', 'every-year', 'chess'] as const

/** Colours for the shell's pixelate transition out of this chapter (black and white, matching the break). */
export const TRANSITION_COLORS = ['#000000', '#ffffff'] as const
