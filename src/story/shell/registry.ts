import { lazy } from 'react'
import type { SceneComponent, SceneMeta, SceneModule } from '../engine/types'

/**
 * Scene auto-registry. To add a scene, create `src/story/scenes/<id>/index.tsx` (default-exported component +
 * named `meta`). Nothing else needs editing. Folders starting with `_` are ignored (except `_demo` in DEV).
 *
 * Laziness: scene code is only ever reached through the lazy loaders below. Metas are needed up front to lay out
 * the timeline, so a scene folder MAY add a tiny `meta.ts` (`export const meta: SceneMeta = {...}`, re-exported
 * from index.tsx with `export { meta } from './meta'`): it is read eagerly and the scene stays lazy. A scene
 * without `meta.ts` still works: its module is loaded once when Story opens to read `meta` (still only inside
 * Story chunks, never the menu/Index chunk). Prefer `meta.ts` for heavy scenes (it avoids loading them all up front).
 */
const sceneLoaders = import.meta.glob<SceneModule>(['../scenes/*/index.tsx', '!../scenes/_*/index.tsx'])
// DEV-only harness scene; the whole branch is dead code (and the chunk is not emitted) in production builds.
const demoLoaders = import.meta.env.DEV ? import.meta.glob<SceneModule>('../scenes/_demo/index.tsx') : {}
const metaFiles = import.meta.glob<SceneMeta>(['../scenes/*/meta.ts', '!../scenes/_*/meta.ts'], {
  eager: true,
  import: 'meta',
})

export interface SceneEntry {
  meta: SceneMeta
  folder: string
  load: () => Promise<SceneModule>
  Component: SceneComponent
}

const folderOf = (path: string): string => path.split('/').slice(-2)[0]

let cached: Promise<SceneEntry[]> | null = null

export function loadRegistry(): Promise<SceneEntry[]> {
  if (cached) return cached
  const useDemo =
    import.meta.env.DEV && (Object.keys(sceneLoaders).length === 0 || window.location.search.includes('demo'))
  const loaders: Record<string, () => Promise<SceneModule>> = { ...sceneLoaders, ...(useDemo ? demoLoaders : {}) }
  const metaByFolder = new Map<string, SceneMeta>()
  for (const [path, meta] of Object.entries(metaFiles)) metaByFolder.set(folderOf(path), meta)

  const p = Promise.all(
    Object.entries(loaders).map(async ([path, load]): Promise<SceneEntry> => {
      const folder = folderOf(path)
      const meta = metaByFolder.get(folder) ?? (await load()).meta
      if (import.meta.env.DEV && meta.id !== folder) {
        console.warn(`[story] scene folder "${folder}" has meta.id "${meta.id}"; they must match (Index links and deep links use the id).`)
      }
      return { meta, folder, load, Component: lazy(load) }
    }),
  ).then((list) =>
    list.sort(
      (a, b) =>
        a.meta.chapter - b.meta.chapter ||
        (a.meta.order ?? 0) - (b.meta.order ?? 0) ||
        (a.folder < b.folder ? -1 : a.folder > b.folder ? 1 : 0),
    ),
  )
  cached = p
  // A failed scene import must not poison later attempts (e.g. re-entering Story).
  p.catch(() => {
    if (cached === p) cached = null
  })
  return p
}
