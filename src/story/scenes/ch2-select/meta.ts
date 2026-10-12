import type { SceneMeta } from '../../engine/types'
import { DUR, ENTRY_IDS, TRANSITION_COLORS } from './config'

/** Tiny and eager: the shell may read this without loading the scene itself. */
export const meta: SceneMeta = {
  id: 'ch2-select',
  chapter: 2,
  duration: DUR,
  entryIds: [...ENTRY_IDS],
}

/** Palette for the pixelate transition out of this chapter. */
export const transitionColors: readonly string[] = TRANSITION_COLORS
