import type { SceneMeta } from '../../engine/types'
import { ENTRY_IDS, TRANSITION_COLORS } from './config'

/** Tiny and eager: the shell may read this without loading the scene itself (see shell/registry.ts). */
export const meta: SceneMeta = {
  id: 'ch1-walk',
  chapter: 1,
  duration: 15,
  entryIds: [...ENTRY_IDS],
  // Click-to-advance: rests at the end of each text box (art, chess, science, robot, olympiads); the walk to the door
  // and the break into Chapter 2 play out on the last click.
  stops: [0.15, 0.29, 0.45, 0.56, 0.79].map((f) => f * 15),
}

/** Palette for the pixelate transition out of this chapter (the shell can read this export). */
export const transitionColors: readonly string[] = TRANSITION_COLORS
