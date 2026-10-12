import type { SceneMeta } from '../../engine/types'
import { ENTRY_IDS, TRANSITION_COLORS } from './config'

/** Tiny and eager: the shell may read this without loading the scene itself (see shell/registry.ts). */
export const meta: SceneMeta = {
  id: 'ch1-walk',
  chapter: 1,
  duration: 15,
  entryIds: [...ENTRY_IDS],
}

/** Palette for the pixelate transition out of this chapter (the shell can read this export). */
export const transitionColors: readonly string[] = TRANSITION_COLORS
