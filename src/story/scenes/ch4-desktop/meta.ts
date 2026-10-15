import type { SceneMeta } from '../../engine/types'
import { DUR, ENTRY_IDS, SCENE_ID, TRANSITION_COLORS } from './config'

/** Tiny and eager: the shell reads this without loading the scene. */
export const meta: SceneMeta = {
  id: SCENE_ID,
  chapter: 4,
  duration: DUR,
  entryIds: [...ENTRY_IDS],
}

/** Palette for the pixelate transition out of this chapter (sky, peach, gold, skyline). */
export const transitionColors: readonly string[] = TRANSITION_COLORS
