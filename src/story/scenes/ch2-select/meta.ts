import type { SceneMeta } from '../../engine/types'
import { ENTRY_IDS, SCROLL_DUR, STOP_CUES, STOPS, TRANSITION_COLORS } from './config'

/** Tiny and eager: the shell may read this without loading the scene itself. */
export const meta: SceneMeta = {
  id: 'ch2-select',
  chapter: 2,
  duration: SCROLL_DUR,
  entryIds: [...ENTRY_IDS],
  stops: STOPS,
  stopCues: STOP_CUES,
}

/** Palette for the pixelate transition out of this chapter. */
export const transitionColors: readonly string[] = TRANSITION_COLORS
