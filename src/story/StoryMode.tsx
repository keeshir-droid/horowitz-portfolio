import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Lenis from 'lenis'
import { chapters } from '../content/entries'
import type { ChapterId } from '../content/types'
import { prefersReducedMotion, useApp } from '../store'
import { audio, music } from './engine/audio'
import Hud from './engine/Hud'
import { locate } from './engine/timeline'
import PixelateTransition from './engine/transitions/pixelate'
import { buildPlan, CHAPTER_IDS, PX_PER_SECOND, slideIndexFor, viewAt, type Plan } from './shell/plan'
import { SlideView } from './shell/parts'
import { loadRegistry, type SceneEntry } from './shell/registry'
import './shell/shell.css'

/**
 * Story shell: hosts scenes from the auto-registry (see shell/registry.ts) on one scroll timeline.
 * Scroll (Lenis, or native with reduced motion) -> total progress 0..1 -> active scene + local progress.
 * Conventions: shell/registry.ts (how to add a scene) and shell/plan.ts (missing chapters, weights, transitions).
 */
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)
const HASH_RE = /^#\/story\/([^/?#]+)/
const sceneIdFromHash = (): string | undefined => {
  const m = HASH_RE.exec(window.location.hash)
  return m ? decodeURIComponent(m[1]) : undefined
}
const isEditable = (t: EventTarget | null): boolean => {
  const el = t instanceof HTMLElement ? t : null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}
const isInteractive = (t: EventTarget | null): boolean => {
  const el = t instanceof HTMLElement ? t : null
  return !!el && /^(BUTTON|A|SUMMARY)$/.test(el.tagName)
}

export default function StoryMode() {
  const [state, setState] = useState<{ registry?: SceneEntry[]; failed?: boolean }>({})
  useEffect(() => {
    let dead = false
    loadRegistry()
      .then((registry) => {
        if (!dead) setState({ registry })
      })
      .catch(() => {
        if (!dead) setState({ failed: true })
      })
    return () => {
      dead = true
    }
  }, [])

  if (state.failed)
    return (
      <div className="story-fatal">
        <div className="story-card" role="alert">
          <p className="eyebrow">SOMETHING WENT WRONG</p>
          <h2>This scene couldn&apos;t load</h2>
          <p className="muted">The story could not start. Everything is still in the Index.</p>
          <button type="button" className="story-btn" onClick={() => useApp.getState().setMode('index')}>
            ☰ SEE THE INDEX
          </button>
        </div>
      </div>
    )
  if (!state.registry) return <div className="boot-fallback">LOADING…</div>
  return <Shell registry={state.registry} />
}

function Shell({ registry }: { registry: SceneEntry[] }) {
  const plan: Plan = useMemo(() => buildPlan(registry), [registry])
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const [vh, setVh] = useState(() => window.innerHeight)
  // Start position (Index 'focus' link, then #/story/<id> deep link, else the top) is resolved before the first
  // render so the URL-sync effect never overwrites a deep link with the first scene.
  const [initialY] = useState(() => {
    const px = Math.max(plan.scrollSeconds * PX_PER_SECOND, window.innerHeight * 3)
    let i = slideIndexFor(plan, useApp.getState().focus)
    if (i < 0) i = slideIndexFor(plan, sceneIdFromHash())
    return i >= 0 ? plan.slideEntry[i] * px : 0
  })
  const [y, setY] = useState(initialY)
  const [audioReady, setAudioReady] = useState(false)
  const lenisRef = useRef<Lenis | null>(null)
  const scrollPx = Math.max(plan.scrollSeconds * PX_PER_SECOND, vh * 3)
  const scrollPxRef = useRef(scrollPx)
  const planRef = useRef(plan)
  const displayRef = useRef(0)

  useLayoutEffect(() => {
    scrollPxRef.current = scrollPx
    planRef.current = plan
  })

  const jump = useCallback((progress: number) => {
    const target = clamp01(progress)
    const px = target * scrollPxRef.current
    const l = lenisRef.current
    if (l) l.scrollTo(px, { immediate: true, force: true })
    else window.scrollTo({ top: px, behavior: 'instant' })
    setY(px)
  }, [])

  // ── lifecycle: scroll engine, listeners, audio loops. Everything is undone on unmount. ──
  useLayoutEffect(() => {
    document.documentElement.classList.add('story-active')
    const prevRestoration = history.scrollRestoration
    history.scrollRestoration = 'manual'

    // Initial position: Index 'see it in the story' focus wins, then the #/story/<id> deep link, else the top.
    if (useApp.getState().focus) useApp.setState({ focus: undefined })
    window.scrollTo({ top: initialY, behavior: 'instant' })
    setY(window.scrollY)

    let lenis: Lenis | null = null
    let raf = 0
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
      lenisRef.current = lenis
      const loop = (t: number) => {
        lenis?.raf(t)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const onScroll = () => setY(window.scrollY)
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    const scrollBy = (dy: number) => {
      const l = lenisRef.current
      if (l) l.scrollTo(l.targetScroll + dy, { duration: 0.9 })
      else window.scrollBy({ top: dy, behavior: 'auto' })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return
      const page = window.innerHeight * 0.85
      let dy: number | null = null
      switch (e.key) {
        case 'ArrowDown':
          dy = 160
          break
        case 'ArrowUp':
          dy = -160
          break
        case 'PageDown':
          dy = page
          break
        case 'PageUp':
          dy = -page
          break
        case ' ':
          if (isInteractive(e.target)) return // Space activates focused buttons/links
          dy = e.shiftKey ? -page : page
          break
        case 'Home':
          e.preventDefault()
          jump(0)
          return
        case 'End':
          e.preventDefault()
          jump(1)
          return
      }
      if (dy === null) return
      e.preventDefault()
      scrollBy(dy)
    }
    window.addEventListener('keydown', onKey)

    // Back/forward or a manually edited hash: follow #/story/<id>.
    const onHash = () => {
      const i = slideIndexFor(planRef.current, sceneIdFromHash())
      if (i >= 0 && i !== displayRef.current) jump(planRef.current.slideEntry[i])
    }
    window.addEventListener('hashchange', onHash)

    // Index -> Story links while Story is already mounted.
    const unsub = useApp.subscribe((s) => {
      if (!s.focus) return
      const i = slideIndexFor(planRef.current, s.focus)
      useApp.setState({ focus: undefined })
      if (i >= 0) jump(planRef.current.slideEntry[i])
    })

    // Deep-link entries never went through the menu click: unlock audio on the first gesture (one-shot).
    const arm = () => {
      audio.unlock()
      window.removeEventListener('pointerdown', arm, true)
      window.removeEventListener('keydown', arm, true)
    }
    window.addEventListener('pointerdown', arm, true)
    window.addEventListener('keydown', arm, true)

    return () => {
      cancelAnimationFrame(raf)
      lenis?.destroy()
      lenisRef.current = null
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('pointerdown', arm, true)
      window.removeEventListener('keydown', arm, true)
      unsub()
      music.stop(0.15)
      history.scrollRestoration = prevRestoration
      document.documentElement.classList.remove('story-active')
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [plan, reduced, jump, initialY])

  // Scenes mount only after the menu click's resume() has settled (or 600 ms), so their first sounds are not dropped.
  useEffect(() => {
    let dead = false
    const done = () => {
      if (!dead) setAudioReady(true)
    }
    const t = window.setTimeout(done, 600)
    void audio.whenRunning().then(done)
    return () => {
      dead = true
      window.clearTimeout(t)
    }
  }, [])

  const p = clamp01(y / scrollPx)

  const loc = locate(plan.timeline, p)
  const view = viewAt(plan, p, reduced, loc.sceneIndex)
  const displaySlide = plan.slides[view.display]
  const chapter = displaySlide.meta.chapter

  useEffect(() => {
    displayRef.current = view.display
  })

  // Keep the URL in step with the scene (replaceState: no history spam, no hashchange loop).
  const displayId = displaySlide.meta.id
  useEffect(() => {
    if (sceneIdFromHash() === displayId) return
    history.replaceState(history.state, '', `#/story/${encodeURIComponent(displayId)}`)
  }, [displayId])

  // Preload the next scene's module when close to the boundary (and the current one right away).
  const nextIndex = loc.sceneProgress > 0.88 ? loc.sceneIndex + 1 : -1
  useEffect(() => {
    void plan.slides[loc.sceneIndex]?.entry?.load().catch(() => undefined)
    if (nextIndex >= 0) void plan.slides[nextIndex]?.entry?.load().catch(() => undefined)
  }, [plan, loc.sceneIndex, nextIndex])

  const goChapter = (c: ChapterId) => jump(plan.chapterStart[c])
  const skipChapter = () => {
    if (chapter < 5) goChapter((chapter + 1) as ChapterId)
    else useApp.getState().setMode('index')
  }

  // Per-scene opt-in: `export const transitionColors = [...]` on a scene module (read once its module has loaded).
  const [sceneColors, setSceneColors] = useState<Record<string, readonly string[]>>({})
  const fromSlide = plan.slides[view.from]
  useEffect(() => {
    let dead = false
    void fromSlide.entry
      ?.load()
      .then((m) => {
        const c = m.transitionColors
        if (!dead && c && c.length) {
          setSceneColors((prev) => (prev[fromSlide.meta.id] === c ? prev : { ...prev, [fromSlide.meta.id]: c }))
        }
      })
      .catch(() => undefined)
    return () => {
      dead = true
    }
  }, [fromSlide])
  const fromChapter = fromSlide.meta.chapter
  const pixelColors = useMemo(
    () => sceneColors[fromSlide.meta.id] ?? [chapters[fromChapter].accent, '#0e0f1a', '#161830', '#f4f1e8'],
    [sceneColors, fromSlide, fromChapter],
  )

  return (
    <div className="story-root">
      <div className="story-spacer" style={{ height: scrollPx + vh }} aria-hidden="true" />
      <main className="story-stage" aria-label={`Story: chapter ${chapter}, ${chapters[chapter].era}`}>
        {audioReady ? (
          view.mounted.map((m) => {
            const slide = plan.slides[m.index]
            return (
              <div
                key={slide.meta.id}
                className="story-layer"
                style={{ opacity: m.opacity, pointerEvents: m.index === view.display ? 'auto' : 'none' }}
              >
                <SlideView slide={slide} props={{ progress: m.progress, active: m.index === view.display }} />
              </div>
            )
          })
        ) : (
          <div className="story-loading">LOADING…</div>
        )}
      </main>
      {view.pixelate !== null && <PixelateTransition progress={view.pixelate} colors={pixelColors} />}
      <Hud chapter={chapter} />
      <p className="story-sr" aria-live="polite">
        Chapter {chapter}: {chapters[chapter].era}
      </p>
      <nav className="story-dock" aria-label="Story chapters">
        <button type="button" className="story-btn" onClick={() => useApp.getState().setMode('gate')}>
          ◀ MENU
        </button>
        <ol className="story-chapters">
          {CHAPTER_IDS.map((c) => {
            const start = plan.chapterStart[c]
            const end = c < 5 ? plan.chapterStart[(c + 1) as ChapterId] : 1
            const fill = clamp01((p - start) / Math.max(1e-6, end - start))
            return (
              <li key={c} style={{ flexGrow: Math.max(0.12, end - start) * 100 }}>
                <button
                  type="button"
                  className="story-seg"
                  aria-current={c === chapter ? 'step' : undefined}
                  aria-label={`Jump to chapter ${c}: ${chapters[c].era}`}
                  style={{ ['--accent' as string]: chapters[c].accent }}
                  onClick={() => goChapter(c)}
                >
                  <i style={{ transform: `scaleX(${c < chapter ? 1 : c === chapter ? fill : 0})` }} />
                  <span>
                    CH {c}
                    <b> {chapters[c].era}</b>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <button type="button" className="story-btn" onClick={skipChapter}>
          {chapter < 5 ? 'SKIP CHAPTER ▶▶' : 'OPEN INDEX ▶▶'}
        </button>
      </nav>
    </div>
  )
}
