import { chapters, entries } from '../../content/entries'
import type { ChapterId } from '../../content/types'
import type { SceneMeta } from '../engine/types'
import { buildTimeline, type Timeline } from '../engine/timeline'
import type { SceneEntry } from './registry'

/**
 * Missing chapters: each gets ONE labelled 'coming soon' card. Its weight is min(real weight, SOON_WEIGHT) so an
 * empty 44% chapter does not become 44% of the scroll. Chapters that have scenes keep their exact real weights, so
 * the ratio between present chapters is always 5:6:38:44:7 (and with all five present the total matches exactly).
 */
export const SOON_WEIGHT = 3
export const PX_PER_SECOND = 100
const DEFAULT_SECONDS_PER_WEIGHT = 3.6 // 360 s story / 100 weight units
/** Half-width of a transition zone in total progress (zone = 4%), clamped to 40% of each neighbouring slot. */
const ZONE_HALF = 0.02
/**
 * ...and never longer than this many scroll-seconds per side, so a transition doesn't grow as chapters are added
 * (Risheek, 2026-10-14: the Ch1->Ch2 pixelate swallowed Ch2's whole select screen).
 */
const ZONE_SECONDS = 0.9

export interface Slide {
  meta: SceneMeta
  /** null = the 'coming soon' card for a chapter without scenes. */
  entry: SceneEntry | null
}

export interface Zone {
  /** Boundary between slide k and k+1, in total progress. */
  center: number
  half: number
  cross: boolean
}

export interface Plan {
  slides: readonly Slide[]
  timeline: Timeline
  zones: readonly Zone[]
  /** Total scroll-time of the whole story in seconds (scroll px = this * PX_PER_SECOND). */
  scrollSeconds: number
  /** Total progress where each chapter is fully entered, and the same per slide. */
  chapterStart: Readonly<Record<ChapterId, number>>
  slideEntry: readonly number[]
  /**
   * Per slide, the part of its slot NOT covered by a transition zone. A scene's local progress runs 0..1 across this
   * window only (frozen at 0 / 1 while a transition covers it), so every scene plays its first and last frames in
   * full view instead of losing them under the pixelate.
   */
  windows: readonly { a: number; b: number }[]
}

export const soonId = (ch: ChapterId): string => `coming-soon-ch${ch}`
export const CHAPTER_IDS: readonly ChapterId[] = [1, 2, 3, 4, 5]

export function buildPlan(registry: readonly SceneEntry[]): Plan {
  const slides: Slide[] = []
  const weights: Record<number, number> = {}
  for (const ch of CHAPTER_IDS) {
    const here = registry.filter((s) => s.meta.chapter === ch)
    if (here.length) {
      weights[ch] = chapters[ch].weight
      for (const entry of here) slides.push({ meta: entry.meta, entry })
    } else {
      weights[ch] = Math.min(chapters[ch].weight, SOON_WEIGHT)
      slides.push({ meta: { id: soonId(ch), chapter: ch, duration: 1, entryIds: [] }, entry: null })
    }
  }
  const timeline = buildTimeline(
    slides.map((s) => s.meta),
    weights,
  )
  const { slots } = timeline

  // Runtime: seconds-per-weight-unit measured from the real scenes (so partial stories keep their pace).
  let realSeconds = 0
  let realWeight = 0
  for (const ch of CHAPTER_IDS) {
    const here = registry.filter((s) => s.meta.chapter === ch)
    if (!here.length) continue
    realSeconds += here.reduce((n, s) => n + Math.max(0, s.meta.duration), 0)
    realWeight += chapters[ch].weight
  }
  const perWeight = realWeight > 0 && realSeconds > 0 ? realSeconds / realWeight : DEFAULT_SECONDS_PER_WEIGHT
  const totalWeight = CHAPTER_IDS.reduce((n, ch) => n + weights[ch], 0)

  const scrollSeconds = perWeight * totalWeight
  const secondsCap = scrollSeconds > 0 ? ZONE_SECONDS / scrollSeconds : ZONE_HALF

  const zones: Zone[] = []
  for (let k = 0; k < slides.length - 1; k++) {
    const left = slots[k].end - slots[k].start
    const right = slots[k + 1].end - slots[k + 1].start
    zones.push({
      center: slots[k].end,
      half: Math.max(0, Math.min(ZONE_HALF, secondsCap, left * 0.4, right * 0.4)),
      cross: slides[k].meta.chapter !== slides[k + 1].meta.chapter && !slides[k + 1].meta.softEntry,
    })
  }
  const slideEntry = slides.map((_, i) => (i === 0 ? 0 : Math.min(1, zones[i - 1].center + zones[i - 1].half + 1e-6)))

  const chapterStart = {} as Record<ChapterId, number>
  for (const ch of CHAPTER_IDS) {
    chapterStart[ch] = slideEntry[slides.findIndex((s) => s.meta.chapter === ch)]
  }
  const windows = slides.map((_, i) => {
    const a = slots[i].start + (i > 0 ? zones[i - 1].half : 0)
    const b = slots[i].end - (i < zones.length ? zones[i].half : 0)
    return b > a ? { a, b } : { a: slots[i].start, b: slots[i].end }
  })
  return { slides, timeline, zones, scrollSeconds, chapterStart, slideEntry, windows }
}

/** Resolve a deep-link / Index-focus id to a slide index: exact scene id, else the first scene of the entry's chapter. */
export function slideIndexFor(plan: Plan, id: string | undefined): number {
  if (!id) return -1
  const exact = plan.slides.findIndex((s) => s.meta.id === id)
  if (exact >= 0) return exact
  const ch = entries.find((e) => e.scene === id)?.chapter
  return ch ? plan.slides.findIndex((s) => s.meta.chapter === ch) : -1
}

export interface View {
  display: number
  /** Slides to keep mounted (at most two), with opacity 0..1 and local progress. */
  mounted: { index: number; opacity: number; progress: number }[]
  /** Pixelate progress when inside a cross-chapter zone (and motion is allowed). */
  pixelate: number | null
  /** Slide the pixelate transition is leaving (for per-scene colours). */
  from: number
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

export function viewAt(plan: Plan, p: number, reduced: boolean, locateIndex: number): View {
  const local = (i: number): number => {
    const { a, b } = plan.windows[i]
    return b > a ? clamp01((p - a) / (b - a)) : 1
  }
  let k = -1
  if (locateIndex > 0) {
    const z = plan.zones[locateIndex - 1]
    if (z.half > 0 && p < z.center + z.half) k = locateIndex - 1
  }
  if (k < 0 && locateIndex < plan.zones.length) {
    const z = plan.zones[locateIndex]
    if (z.half > 0 && p > z.center - z.half) k = locateIndex
  }
  if (k < 0) {
    return { display: locateIndex, mounted: [{ index: locateIndex, opacity: 1, progress: local(locateIndex) }], pixelate: null, from: locateIndex }
  }
  const z = plan.zones[k]
  const t = clamp01((p - (z.center - z.half)) / (2 * z.half))
  const display = t < 0.5 ? k : k + 1
  if (z.cross && !reduced) {
    return { display, mounted: [{ index: display, opacity: 1, progress: local(display) }], pixelate: t, from: k }
  }
  return {
    display,
    mounted: [
      { index: k, opacity: 1, progress: local(k) },
      { index: k + 1, opacity: t, progress: local(k + 1) },
    ],
    pixelate: null,
    from: k,
  }
}
