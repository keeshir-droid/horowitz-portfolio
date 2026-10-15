import type { SceneMeta } from '../../engine/types'
import { DUR, ENTRY_IDS, SCENE_ID } from './config'

/** Tiny and eager: the shell reads this without loading the scene. */
export const meta: SceneMeta = {
  id: SCENE_ID,
  chapter: 5,
  duration: DUR,
  entryIds: [...ENTRY_IDS],
  // Chapter 4 ends with its camera pushed through the window into this sky: crossfade, don't pixelate.
  softEntry: true,
}
