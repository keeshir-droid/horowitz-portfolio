/**
 * Chapter 2 in arcade mode (HANDOFF §6b, v2 after Risheek's review): select screen -> STAGE 1 card -> karate fight ->
 * STAGE 2 card -> stage bow -> STAGE 3 card -> council speech -> ALL STAGES CLEAR -> NEXT LEVEL. No walking, no
 * ladders: the stage cards are the transitions. Every timing window, every on-screen word and the photo slots live
 * here. All achievement text is read from src/content/entries.ts at import time; this file adds only generic game
 * words (STAGE 1, ROUND 1, FIGHT!, K.O., ALL STAGES CLEAR, NEXT LEVEL) and the three stage names.
 */
import { chapters, entries } from '../../../content/entries'

export type BeatKey = 'karate' | 'stage' | 'council'
export const BEATS: readonly BeatKey[] = ['karate', 'stage', 'council']
export const ENTRY_OF: Record<BeatKey, string> = {
  karate: 'martial-arts',
  stage: 'performing-arts',
  council: 'student-council',
}
/** Robotics was dropped from Chapter 2 (lead decision, session 2). */
export const ENTRY_IDS = ['martial-arts', 'performing-arts', 'student-council'] as const

export const TRANSITION_COLORS: readonly string[] = ['#0a0a12', '#e0343c', '#ffd84a']

/**
 * Real photos, one per beat (e.g. karate: '/media/ch2-select/karate.jpg'). Empty = the illustrated stand-in with a
 * "PHOTO COMING" tag. A loaded photo is cover-fitted into the same gold frame and colour-graded to the chapter palette.
 */
export const PHOTOS: Record<BeatKey, string> = { karate: '', stage: '', council: '' }

/** Seconds of scroll-time; meta.duration. Every window below is in seconds and converted with `w()`. */
export const DUR = 11.7
const w = (a: number, b: number): readonly [number, number] => [a / DUR, b / DUR] as const
export const sec = (s: number): number => s / DUR

/** Scroll-seconds per fight-second: the choreography (moves.ts, 5.7 fight-seconds) plays a little faster than real time. */
export const FS = 0.85

export const T = {
  select: w(0, 1.0),
  card1: w(1.0, 1.45),
  fight: w(1.45, 6.9),
  card2: w(6.9, 7.35),
  stage: w(7.35, 8.6),
  card3: w(8.6, 9.05),
  council: w(9.05, 10.3),
  end: w(10.3, DUR),
}

/** Seconds inside the select beat. */
export const SEL = { cursor: [0.28, 0.42, 0.56] as const, lock: 0.66, out: 0.8 }

/** Stage cards: [window, title, stage name]. Seconds inside a card: slam at SLAM, exit wipe from OUT. */
export const CARDS = [
  { win: T.card1, title: 'STAGE 1', name: 'KARATE' },
  { win: T.card2, title: 'STAGE 2', name: 'STAGE' },
  { win: T.card3, title: 'STAGE 3', name: 'COUNCIL' },
] as const
export const CARD = { inEnd: 0.1, slam: 0.09, out: 0.36 }

/** Ending, seconds inside T.end. */
export const END = { slam: 0.07, chips: [0.2, 0.28, 0.36] as const, next: 0.68, barFrom: 0.8, barTo: 1.08 }

/** Pop-up windows (progress). Each appears at its moment and holds until the next card wipes over it. */
export const POP: Record<BeatKey, readonly [number, number]> = {
  karate: [sec(1.45 + 5.0 * FS), T.fight[1]], // just after the K.O.
  stage: [sec(7.35 + 0.15), T.stage[1]], // at the bow
  council: [sec(9.05 + 0.15), T.council[1]], // during the speech
}
/** When each beat's photo drops in beside him (progress), while its pop-up is up. */
export const PHOTO_AT: Record<BeatKey, number> = {
  karate: sec(1.45 + 5.35 * FS), // after the K.O., as he bows
  stage: sec(7.35 + 0.35),
  council: sec(9.05 + 0.35),
}
/** Seconds a photo takes to drop and settle. */
export const PHOTO_DROP = 0.32
/** Fraction of a pop-up window spent typing (Chapter 1 behaviour: one page, typed once, then held). */
export const TYPE_SECONDS = 0.38

const entry = (id: string) => {
  const e = entries.find((x) => x.id === id)
  if (!e) throw new Error(`ch2-select: missing entry ${id}`)
  return e
}

export interface PopCopy {
  /** Small kicker (entry category). */
  kicker: string
  /** Big stat in the gold block (entry stat.value). */
  stat: string
  /** Headline (entry title). */
  head: string
  /** One supporting line (entry stat.label or blurb). */
  sub: string
}

const KAR = entry(ENTRY_OF.karate)
const STG = entry(ENTRY_OF.stage)
const CNC = entry(ENTRY_OF.council)
/** Bebas Neue has no arrow glyph: "Grade 5 → 10" is drawn as "Grade 5 to 10" (pop-up) or "Grade 5–10" (chip). */
const glyphSafe = (s: string, by = ' to '): string => s.replace(/\s*→\s*/g, by)

export const COPY: Record<BeatKey, PopCopy> = {
  karate: { kicker: KAR.category, stat: KAR.stat?.value ?? '', head: KAR.title, sub: KAR.stat?.label ?? KAR.blurb },
  stage: { kicker: STG.category, stat: STG.stat?.value ?? '', head: STG.title, sub: STG.blurb },
  council: { kicker: CNC.category, stat: glyphSafe(CNC.stat?.value ?? ''), head: CNC.title, sub: CNC.stat?.label ?? CNC.blurb },
}

/** Result chips on the ALL STAGES CLEAR screen: the three stats, straight from entries.ts. */
export const RESULTS: Record<BeatKey, string> = {
  karate: KAR.stat?.value ?? '',
  stage: STG.stat?.value ?? '',
  council: glyphSafe(CNC.stat?.value ?? '', '–'),
}

/** Audience counter target, parsed from the performing-arts stat ("2,000"). */
export const AUDIENCE = Number((STG.stat?.value ?? '0').replace(/[^0-9]/g, '')) || 0
export const AUDIENCE_LABEL = STG.stat?.label ?? ''

/** Council badges: grade numbers parsed from the student-council title ("grade 5 to grade 10"). */
const grades = (CNC.title.match(/\d+/g) ?? []).map(Number)
const g0 = grades[0] ?? 5
const g1 = grades[1] ?? g0
export const GRADES: readonly number[] = Array.from({ length: Math.max(1, g1 - g0 + 1) }, (_, i) => g0 + i)

/** Labels (chapter eras from src/content, generic game words otherwise). */
export const TXT = {
  select: 'SELECT YOUR FIGHTER',
  name: 'RISHEEK',
  era: chapters[2].era.toUpperCase(),
  nextEra: chapters[3].era.toUpperCase(),
  floors: { karate: 'KARATE', stage: 'STAGE', council: 'COUNCIL' } as Record<BeatKey, string>,
  opponent: 'OPPONENT',
  photoComing: 'PHOTO COMING',
  allClear: 'ALL STAGES CLEAR',
  nextLevel: 'NEXT LEVEL',
}
