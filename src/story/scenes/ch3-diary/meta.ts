import type { SceneMeta } from '../../engine/types'
import { DUR, ENTRY_IDS, TRANSITION_COLORS } from './config'

/** Tiny and eager: the shell reads this without loading the scene (or its pages). */
export const meta: SceneMeta = {
  id: 'ch3-diary',
  chapter: 3,
  duration: DUR,
  entryIds: [...ENTRY_IDS],
}

/** Palette for the pixelate transition out of this chapter (paper, ink, cover blue). */
export const transitionColors: readonly string[] = TRANSITION_COLORS
