import { lazy, Suspense, useEffect } from 'react'
import { recordVisit } from './lib/api'
import { useApp } from './store'
import Gate from './gate/Gate'
import IndexMode from './index-mode/IndexMode'
import AppBoundary from './AppBoundary'
import { clearReloadGuard } from './chunkGuard'

// Story mode pulls in three.js scenes; keep it out of the Index bundle.
const StoryMode = lazy(() => import('./story/StoryMode'))
// Dev-only engine harness (?engine-demo). The DEV guard is statically false in production, so this is tree-shaken.
const DemoHarness = import.meta.env.DEV ? lazy(() => import('./story/engine/DemoHarness')) : null
// Dev-only Chapter 3 page preview (?ch3-pages&spread=1&u=0.6): renders one diary spread statically, no engine.
const DiaryPageHarness = import.meta.env.DEV ? lazy(() => import('./story/scenes/ch3-diary/PageHarness')) : null
// Dev-only audio audition page (?audio-demo): play every track, fire every sfx, download WAV renders.
const AudioDemo = import.meta.env.DEV ? lazy(() => import('./story/engine/AudioDemo')) : null

export default function App() {
  const mode = useApp((s) => s.mode)
  const introRun = useApp((s) => s.introRun)

  // Once the app has been healthy for a few seconds, allow a future stale-chunk auto-reload again.
  useEffect(() => {
    const t = window.setTimeout(clearReloadGuard, 8000)
    return () => window.clearTimeout(t)
  }, [])

  // Silent, de-duplicated, no-op in dev; never renders anything.
  useEffect(() => {
    recordVisit(mode)
  }, [mode])

  if (import.meta.env.DEV && DemoHarness && window.location.search.includes('engine-demo'))
    return (
      <Suspense fallback={null}>
        <DemoHarness />
      </Suspense>
    )
  if (import.meta.env.DEV && DiaryPageHarness && window.location.search.includes('ch3-pages'))
    return (
      <Suspense fallback={null}>
        <DiaryPageHarness />
      </Suspense>
    )
  if (import.meta.env.DEV && AudioDemo && window.location.search.includes('audio-demo'))
    return <Suspense fallback={null}><AudioDemo /></Suspense>
  if (mode === 'index') return <IndexMode />
  return (
    <AppBoundary resetKey={mode}>
      {mode === 'story' ? (
        <Suspense fallback={<div className="boot-fallback">LOADING…</div>}>
          <StoryMode />
        </Suspense>
      ) : (
        <Gate key={introRun} />
      )}
    </AppBoundary>
  )
}
