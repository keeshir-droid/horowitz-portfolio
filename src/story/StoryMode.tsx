import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { chapters } from '../content/entries'
import type { ChapterId } from '../content/types'
import { prefersReducedMotion, useApp } from '../store'
import { audio, music } from './engine/audio'
import Hud from './engine/Hud'
import { locate } from './engine/timeline'
import PixelateTransition from './engine/transitions/pixelate'
import { buildPlan, CHAPTER_IDS, nextStop, prevStop, rateAt, slideIndexFor, viewAt, type Plan } from './shell/plan'
import { SlideView } from './shell/parts'
import ClickCue from './shell/ClickCue'
import { loadRegistry, type SceneEntry } from './shell/registry'
import './shell/shell.css'

/**
 * Story shell: hosts scenes from the auto-registry (see shell/registry.ts) on one timeline.
 * Risheek (2026-11-03): scrolling was too fast / too slow to feel meaningful, so the story is CLICK-driven. The playhead
 * (total progress 0..1) rests at each scene's `meta.stops`; a click plays to the next one at the designed pace.
 * Only declared `meta.scrollZones` (the flipbook) are scrolled. Progress -> active scene + local progress as before.
 * Conventions: shell/registry.ts (how to add a scene) and shell/plan.ts (stops, zones, weights, transitions).
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

/** Playhead state (a ref: it changes every frame; React state `p` only mirrors what is on screen). */
interface Head {
  p: number
  /** idle = resting; play = running to `target`; scroll = following the wheel / swipe inside a scroll zone. */
  mode: 'idle' | 'play' | 'scroll'
  target: number
  speed: number
  scrollTo: number | null
  lastClick: number
}

/**
 * Scroll zones only: input may not run more than MAX_LEAD scene-seconds ahead of the screen, the screen never plays
 * faster than MAX_SPEED x the designed pace, one wheel event is at most one ordinary notch, and 100 px = 0.8 s.
 */
const MAX_SPEED = 3
const MAX_LEAD = 2.5
const WHEEL_STEP = 100
const SEC_PER_PX = 0.008

/** Short chapter names for the dock on narrow screens (the full era names do not fit beside four other segments). */
const SEG_SHORT: Record<ChapterId, string> = { 1: 'Primary', 2: 'Middle', 3: 'High school', 4: 'Builder', 5: 'SF' }

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
  // Start position (Index 'focus' link, then #/story/<id> deep link, else the top) is resolved before the first
  // render so the URL-sync effect never overwrites a deep link with the first scene.
  const [initialP] = useState(() => {
    let i = slideIndexFor(plan, useApp.getState().focus)
    if (i < 0) i = slideIndexFor(plan, sceneIdFromHash())
    return i >= 0 ? plan.slideEntry[i] : 0
  })
  /** What is on screen (total progress 0..1). Everything else about the playhead lives in `head`. */
  const [p, setP] = useState(initialP)
  const [resting, setResting] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const planRef = useRef(plan)
  const displayRef = useRef(0)
  const audioReadyRef = useRef(false)
  const head = useRef<Head>({ p: initialP, mode: 'idle', target: initialP, speed: 1, scrollTo: null, lastClick: 0 })

  useLayoutEffect(() => {
    planRef.current = plan
  })

  /** Put the playhead on `to` (no animation) and, with `play`, carry on to the next rest. */
  const place = useCallback(
    (to: number, play: boolean) => {
      const h = head.current
      const pl = planRef.current
      h.p = clamp01(to)
      h.scrollTo = null
      h.speed = 1
      const nxt = nextStop(pl, h.p)
      if (play && nxt !== undefined) {
        if (reduced) {
          h.p = nxt
          h.mode = 'idle'
        } else {
          h.target = nxt
          h.mode = 'play'
        }
      } else h.mode = 'idle'
      setP(h.p)
      setResting(h.mode === 'idle')
    },
    [reduced],
  )

  /** One click / tap / key: play on to the next rest (a second, later click while playing fast-forwards). */
  const advance = useCallback(() => {
    const h = head.current
    if (!audioReadyRef.current) return
    const now = performance.now()
    if (h.mode === 'play') {
      if (now - h.lastClick > 500) h.speed = 3
      h.lastClick = now
      return
    }
    if (nextStop(planRef.current, h.p) === undefined) return
    h.lastClick = now
    place(h.p, true)
  }, [place])

  const back = useCallback(() => {
    place(prevStop(planRef.current, head.current.p), false)
  }, [place])

  const jump = useCallback((progress: number) => place(progress, true), [place])

  // ── lifecycle: playhead loop, input, listeners. Everything is undone on unmount. ──
  useLayoutEffect(() => {
    document.documentElement.classList.add('story-active')
    if (useApp.getState().focus) useApp.setState({ focus: undefined })

    let raf = 0
    let last = 0
    const loop = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60
      last = t
      const h = head.current
      const pl = planRef.current
      if (audioReadyRef.current && h.mode !== 'idle') {
        const rate = rateAt(pl, h.p, locate(pl.timeline, h.p).sceneIndex)
        let next = h.p
        if (h.mode === 'play') {
          next = Math.min(h.target, h.p + rate * h.speed * dt)
          if (next >= h.target - 1e-9) {
            next = h.target
            h.mode = 'idle'
            h.speed = 1
          }
        } else if (h.mode === 'scroll' && h.scrollTo !== null) {
          const step = rate * MAX_SPEED * dt
          const d = h.scrollTo - h.p
          next = Math.abs(d) <= step ? h.scrollTo : h.p + Math.sign(d) * step
          if (next === h.scrollTo) {
            h.mode = 'idle'
            h.scrollTo = null
          }
        }
        if (next !== h.p) {
          h.p = next
          setP(next)
        }
        if (h.mode === 'idle') setResting(true)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // Scroll zones (the flipbook): wheel / swipe / arrows move the playhead directly, at most MAX_LEAD seconds ahead
    // of the screen and never faster than MAX_SPEED x the designed pace. Anywhere else, scrolling does nothing.
    const zoneAt = (x: number) => planRef.current.scrollZones.find((z) => x >= z.a - 1e-6 && x <= z.b + 1e-6)
    const scrollBySeconds = (sec: number): boolean => {
      const h = head.current
      const pl = planRef.current
      if (!audioReadyRef.current || h.mode === 'play') return false
      const z = zoneAt(h.p)
      if (!z) return false
      const rate = rateAt(pl, h.p, locate(pl.timeline, Math.min(h.p, z.b - 1e-6)).sceneIndex)
      const base = h.scrollTo ?? h.p
      const lead = MAX_LEAD * rate
      const want = Math.max(z.a, Math.min(z.b, base + sec * rate))
      h.scrollTo = Math.max(h.p - lead, Math.min(h.p + lead, want))
      h.mode = 'scroll'
      setResting(false)
      return true
    }
    const onWheel = (e: WheelEvent) => {
      if (isEditable(e.target)) return
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 600 : 1
      const dy = Math.max(-WHEEL_STEP, Math.min(WHEEL_STEP, e.deltaY * unit))
      if (scrollBySeconds(dy * SEC_PER_PX)) e.preventDefault()
    }
    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null || e.touches.length !== 1) return
      const y = e.touches[0].clientY
      const moved = scrollBySeconds((touchY - y) * SEC_PER_PX * 1.4)
      touchY = y
      if (moved) e.preventDefault()
    }
    const onTouchEnd = () => {
      touchY = null
    }

    // A click or tap anywhere on the story (not on a button, link or on-page control) = continue.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return
      const el = e.target instanceof Element ? e.target : null
      if (!el || !el.closest('.story-root')) return
      if (el.closest('a, button, input, textarea, select, summary, label, [role="button"], .dp-hit, [data-no-advance], .story-dock, .hud')) return
      advance()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
        case ' ':
        case 'PageDown':
          if (isInteractive(e.target) && (e.key === 'Enter' || e.key === ' ')) return // they activate the focused control
          e.preventDefault()
          advance()
          return
        case 'ArrowDown':
          e.preventDefault()
          if (!scrollBySeconds(1.2)) advance()
          return
        case 'ArrowUp':
          e.preventDefault()
          if (!scrollBySeconds(-1.2)) back()
          return
        case 'ArrowLeft':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault()
          back()
          return
        case 'Home':
          e.preventDefault()
          place(0, true)
          return
        case 'End':
          e.preventDefault()
          place(1, false)
          return
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)

    // Back/forward or a manually edited hash: follow #/story/<id>.
    const onHash = () => {
      const i = slideIndexFor(planRef.current, sceneIdFromHash())
      if (i >= 0 && i !== displayRef.current) place(planRef.current.slideEntry[i], true)
    }
    window.addEventListener('hashchange', onHash)

    // Index -> Story links while Story is already mounted.
    const unsub = useApp.subscribe((s) => {
      if (!s.focus) return
      const i = slideIndexFor(planRef.current, s.focus)
      useApp.setState({ focus: undefined })
      if (i >= 0) place(planRef.current.slideEntry[i], true)
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
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('pointerdown', arm, true)
      window.removeEventListener('keydown', arm, true)
      unsub()
      music.stop(0.15)
      document.documentElement.classList.remove('story-active')
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [advance, back, place])

  // Scenes mount only after the menu click's resume() has settled (or 600 ms), so their first sounds are not dropped.
  // The story then starts itself: the first beat plays without a click (the viewer just clicked START).
  useEffect(() => {
    let dead = false
    let started = false
    const done = () => {
      if (dead || started) return
      started = true
      audioReadyRef.current = true
      setAudioReady(true)
      window.setTimeout(() => {
        if (!dead && head.current.mode === 'idle') place(head.current.p, true)
      }, 350)
    }
    const t = window.setTimeout(done, 600)
    void audio.whenRunning().then(done)
    return () => {
      dead = true
      window.clearTimeout(t)
    }
  }, [place])


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
  const hasNext = nextStop(plan, p) !== undefined
  const zone = plan.scrollZones.find((z) => p >= z.a - 1e-6 && p <= z.b + 1e-6)
  const canGoBack = p > 0.002
  const stopAt = plan.stops.findIndex((s) => Math.abs(s - p) < 1e-5)
  const cueLabel = stopAt >= 0 ? plan.stopCues[stopAt] : undefined

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
    <div className={`story-root${resting && hasNext ? ' can-advance' : ''}`}>
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
                    <b className="seg-long"> {chapters[c].era}</b>
                    <b className="seg-short"> {SEG_SHORT[c]}</b>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <button type="button" className="story-btn" onClick={back} disabled={!canGoBack} aria-label="Back one step">
          ◀ BACK
        </button>
        <span className="story-next-wrap">
          {audioReady && (
            <ClickCue
              rest={resting && hasNext ? Math.round(p * 1e5) : null}
              chapter={chapter}
              label={cueLabel}
              accent={chapters[chapter].accent}
              scrollHint={zone && p < zone.b - 1e-6 ? zone.hint : null}
              hidden={view.pixelate !== null && view.pixelate > 0.03 && view.pixelate < 0.97}
            />
          )}
          <button
            type="button"
            className={`story-btn story-next${resting && hasNext ? ' is-ready' : ''}`}
            onClick={advance}
            disabled={!hasNext}
            aria-label="Continue"
          >
            NEXT ▶
          </button>
        </span>
        <button type="button" className="story-btn story-skip" onClick={skipChapter}>
          {chapter < 5 ? 'SKIP ▶▶' : 'INDEX ▶▶'}
        </button>
      </nav>
    </div>
  )
}
