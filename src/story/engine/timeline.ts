import type { SceneMeta } from './types'

export interface TimelineSlot {
  /** Total-progress range [start, end) this scene owns. */
  start: number
  end: number
}

export interface Timeline {
  slots: readonly TimelineSlot[]
}

export interface TimelinePos {
  sceneIndex: number
  sceneProgress: number
}

function countInChapter(scenes: readonly SceneMeta[], chapter: number): number {
  let n = 0
  for (const s of scenes) if (s.chapter === chapter) n++
  return n
}

/**
 * Lay scenes out on 0..1. Each chapter present gets weight[chapter] / sum(weights of chapters present);
 * inside a chapter, scenes share the span in proportion to `duration`. Scenes must be ordered.
 * Build once; call `locate` per frame (it allocates only its small result object).
 */
export function buildTimeline(scenes: readonly SceneMeta[], weights: Readonly<Record<number, number>>): Timeline {
  const chapterDur = new Map<number, number>()
  for (const s of scenes) chapterDur.set(s.chapter, (chapterDur.get(s.chapter) ?? 0) + Math.max(0, s.duration))
  let totalWeight = 0
  for (const ch of chapterDur.keys()) totalWeight += Math.max(0, weights[ch] ?? 0)
  const slots: TimelineSlot[] = []
  if (scenes.length === 0) return { slots }

  // Fallback if every weight is 0: weight chapters by raw duration.
  const useDuration = totalWeight <= 0
  let totalDuration = 0
  if (useDuration) for (const d of chapterDur.values()) totalDuration += d
  const denom = (useDuration ? totalDuration : totalWeight) || 1

  let cursor = 0
  for (const s of scenes) {
    const cd = chapterDur.get(s.chapter) ?? 0
    const chShare = (useDuration ? cd : Math.max(0, weights[s.chapter] ?? 0)) / denom
    const frac = cd > 0 ? Math.max(0, s.duration) / cd : 1 / countInChapter(scenes, s.chapter)
    const span = chShare * frac
    slots.push({ start: cursor, end: cursor + span })
    cursor += span
  }
  // Snap the last slot to exactly 1 to absorb float error.
  slots[slots.length - 1].end = 1
  return { slots }
}

/** Map total progress -> scene + local progress. Clamps outside 0..1. Zero-length slots are skipped. */
export function locate(tl: Timeline, total: number): TimelinePos {
  const { slots } = tl
  if (slots.length === 0) return { sceneIndex: 0, sceneProgress: 0 }
  const p = Number.isNaN(total) || total < 0 ? 0 : total > 1 ? 1 : total
  for (let i = 0; i < slots.length; i++) {
    const { start, end } = slots[i]
    const last = i === slots.length - 1
    if (end > start && (p < end || last)) {
      const sp = (p - start) / (end - start)
      return { sceneIndex: i, sceneProgress: sp < 0 ? 0 : sp > 1 ? 1 : sp }
    }
  }
  return { sceneIndex: slots.length - 1, sceneProgress: 1 }
}

/** Convenience one-shot mapping (builds the timeline each call; prefer buildTimeline + locate). */
export function mapProgress(
  scenes: readonly SceneMeta[],
  weights: Readonly<Record<number, number>>,
  total: number,
): TimelinePos {
  return locate(buildTimeline(scenes, weights), total)
}
