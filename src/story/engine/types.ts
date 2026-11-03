import type { ComponentType } from 'react'
import type { ChapterId } from '../../content/types'

/** Named export `meta` of every scene folder (src/story/scenes/<id>/index.tsx). */
export interface SceneMeta {
  id: string
  chapter: ChapterId
  /** Seconds of scroll-time this scene occupies (relative weight inside its chapter). */
  duration: number
  /** Entries this scene proves; the engine unlocks them when the scene plays. */
  entryIds: string[]
  /** Optional sort key inside the chapter (ascending; ties and missing values fall back to the folder name). */
  order?: number
  /**
   * Enter this scene with a crossfade instead of the cross-chapter pixelate (for a chapter that continues the previous
   * one's camera move, e.g. Ch4's push through the window into Ch5's city).
   */
  softEntry?: boolean
  /**
   * Click-to-advance: scene-local seconds (same unit as `duration`) where the story rests and waits for a click.
   * A click plays on to the next stop at the designed pace, across scene and chapter boundaries. The last stop of the
   * whole story is its end. No stops = the scene plays straight through to its end in one click.
   */
  stops?: readonly number[]
  /** Optional cue text per stop (same order as `stops`; undefined = the default "Click to go forward"). */
  stopCues?: readonly (string | undefined)[]
  /**
   * Scene-local second ranges [from, to] where the viewer scrolls (wheel / swipe) instead of clicking, e.g. the
   * flipbook. The range's start and end are rests; a click inside a zone plays it through at normal pace.
   */
  scrollZones?: readonly (readonly [number, number])[]
  /** What the cue says in this scene's scroll zones ("flip the pages"). */
  scrollHint?: string
}

/** Props every scene component receives. Scenes are pure of global state. */
export interface SceneProps {
  /** 0..1 through the scene. */
  progress: number
  /** True while this scene is the current one (mount heavy things only when active). */
  active: boolean
}

export type SceneComponent = ComponentType<SceneProps>

/** Shape of a scene module as loaded by the registry. */
export interface SceneModule {
  default: SceneComponent
  meta: SceneMeta
  /** Optional: CSS hex colours for the pixelate transition leaving this scene (falls back to chapter accent colours). */
  transitionColors?: readonly string[]
}
