/**
 * Chapter 5 "San Francisco": the ending. It opens on exactly the golden sky Chapter 4's camera pushed into (soft
 * entry = crossfade), cranes up over the bay as the sun lowers and the city lights come on, shows the Adobe card
 * (the chapter's proof, from src/content), asks "Do you want to save your progress?" in a Game Boy dialog, and ends
 * on "<N> ACHIEVEMENTS UNLOCKED", the ask, and real contact links that stay up at the end of the scroll.
 * Pure function of `progress`. Files: config.ts (timeline/copy/palette), skyline.ts (geometry), City.tsx (SVG).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { chapters, person } from '../../../content/entries'
import { useApp } from '../../../store'
import { SAMPLE_SETS, audio, music, sfx } from '../../engine/audio'
import type { SceneProps } from '../../engine/types'
import { getEntry, unlock, unlockGroup, useUnlocks } from '../../engine/unlocks'
import City, { type CityFrame } from './City'
import { ACHIEVEMENT_COUNT, COPY, CUES, DUR, ENTRY_IDS, SAFE_TOP, SUN, SUN_DROP, T, UNLOCK_AT, safeBottom } from './config'
import { buildSkyline } from './skyline'
import './city.css'

export { meta } from './meta'

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const easeInOut = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const easeOut = (x: number): number => 1 - Math.pow(1 - x, 3)

const reducedSubscribe = (cb: () => void): (() => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const reducedNow = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * DEV-only debug params (ignored in production builds):
 *   ?ch5p=0.5       render the scene at a fixed progress (overrides scroll)
 *   ?ch5reduced=1   force the reduced-motion version
 */
const dbg = (() => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { p: undefined as number | undefined, reduced: false }
  const q = new URLSearchParams(window.location.search)
  const v = Number(q.get('ch5p'))
  return { p: q.has('ch5p') && Number.isFinite(v) ? clamp01(v) : undefined, reduced: q.get('ch5reduced') === '1' }
})()

// The pixel font for the save dialog and the final count (self-hosted, loaded once).
let pixelFont: Promise<void> | null = null
function loadPixelFont(): Promise<void> {
  if (!pixelFont) {
    pixelFont = (async () => {
      try {
        const face = new FontFace('Ch5Pixel', `url(${import.meta.env.BASE_URL}fonts/PressStart2P.ttf)`)
        await face.load()
        document.fonts.add(face)
      } catch {
        /* falls back to the page's pixel font */
      }
    })()
  }
  return pixelFont
}

/** Index mode, then its contact section (heading focused for keyboard / screen-reader users). */
function goContact(): void {
  useApp.getState().setMode('index')
  const t0 = performance.now()
  const tick = (): void => {
    const sec = document.getElementById('contact')
    if (sec) {
      // let Story's unmount and Index's mount (both scroll to the top) settle first
      window.setTimeout(() => {
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        sec.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
        const head = document.getElementById('contact-title') ?? sec
        if (!head.hasAttribute('tabindex')) head.setAttribute('tabindex', '-1')
        head.focus({ preventScroll: true })
      }, 90)
      return
    }
    if (performance.now() - t0 < 3000) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
const onContact = (e: MouseEvent<HTMLAnchorElement>): void => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  goContact()
}
const onIndex = (e: MouseEvent<HTMLAnchorElement>): void => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  useApp.getState().setMode('index')
}

/** Phone = the compact group card (like Chapter 3), wider screens = the entry's own headline card. */
function unlockScene(compact: boolean): void {
  if (!ENTRY_IDS.length) return
  if (compact) unlockGroup(ENTRY_IDS, ENTRY_IDS.map((id) => getEntry(id)?.title ?? id).join(' · '))
  else for (const id of ENTRY_IDS) unlock(id)
}

const ADOBE = getEntry('adobe')
const ERA = chapters[5].era

const ARIA = `Chapter 5, ${ERA}: a golden-hour view over the bay. ${ADOBE ? `${ADOBE.title}. ` : ''}${ACHIEVEMENT_COUNT} ${COPY.unlocked.toLowerCase()}.`

type SavePhase = 'ask' | 'yes' | 'saving' | 'saved'

export default function Ch5City({ progress: rawProgress, active }: SceneProps) {
  const progress = dbg.p ?? rawProgress
  const reducedMq = useSyncExternalStore(reducedSubscribe, reducedNow, () => false)
  const reduced = reducedMq || dbg.reduced
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const t = clamp01(progress) * DUR

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = () => setSize({ w: host.clientWidth, h: host.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    void loadPixelFont()
    return () => ro.disconnect()
  }, [])

  const sk = useMemo(() => (size.w > 1 && size.h > 1 ? buildSkyline(size.w, size.h) : null), [size])
  const compact = size.w > 0 && size.w <= 640

  // ── frame: everything below is a pure function of t (and reduced motion) ──
  const crane = reduced ? 1 : easeInOut(seg(t, T.crane[0], T.crane[1]))
  const fr: CityFrame = {
    t,
    crane,
    sunY: SUN.y + (reduced ? 0 : SUN_DROP * seg(t, T.sun[0], T.sun[1])),
    lights: seg(t, T.lights[0], T.lights[1]),
    dusk: 0.85 * seg(t, 2, DUR),
    reduced,
  }
  const cardIn = seg(t, T.cardIn[0], T.cardIn[1])
  const card = cardIn * (1 - seg(t, T.cardOut[0], T.cardOut[1]))
  const cardRise = reduced ? 0 : (1 - easeOut(cardIn)) * 28 + seg(t, T.cardOut[0], T.cardOut[1]) * -10
  const save = seg(t, T.saveIn[0], T.saveIn[1]) * (1 - seg(t, T.saveOut[0], T.saveOut[1]))
  const phase: SavePhase = t < T.yes[0] ? 'ask' : t < T.saving[0] ? 'yes' : t < T.saved ? 'saving' : 'saved'
  const dots = '.'.repeat(1 + Math.min(2, Math.floor(seg(t, T.saving[0], T.saving[1]) * 3)))
  const fin = easeOut(seg(t, T.finalIn[0], T.finalIn[1]))

  // DEV: expose the timeline so a verifier can compute progress points.
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __ch5?: unknown }).__ch5 = { DUR, T, CUES, UNLOCK_AT }
  }, [])

  // ── audio: recorded city music while current (after the first gesture), samples preloaded ──
  useEffect(() => {
    if (active) audio.preload(SAMPLE_SETS.ch5)
  }, [active])
  useEffect(() => {
    if (!active) return
    let dead = false
    const start = () => {
      if (!audio.isUnlocked()) return
      void audio.whenRunning().then((ok) => {
        if (ok && !dead) music.play('city', 1.6)
      })
    }
    start()
    const off = audio.subscribe(start)
    return () => {
      dead = true
      off()
      music.stopIf('city', 0.8)
    }
  }, [active])

  // ── unlock: idempotent, never while inactive; deep links past the moment unlock too ──
  const unlocked = useRef(false)
  useEffect(() => {
    if (!active || unlocked.current || t < UNLOCK_AT || size.w < 1) return
    unlocked.current = true
    unlockScene(compact)
  }, [active, t, compact, size.w])

  // ── sound cues: forward crossings only, small steps only, each fired once ──
  const snd = useRef({ t: -1, fired: new Set<string>() })
  useEffect(() => {
    const s = snd.current
    const prev = s.t
    s.t = t
    if (!active || prev < 0) return
    const d = t - prev
    if (d <= 0 || d > 3) return
    for (const c of CUES) {
      if (c.t <= prev || c.t > t || s.fired.has(c.cue)) continue
      if (reduced && c.cue === 'whoosh') continue
      s.fired.add(c.cue)
      sfx.city(c.cue)
    }
  }, [t, active, reduced])

  // ── keep the dialog / final screen clear of the unlock card while one is showing ──
  const toastId = useUnlocks((s) => s.toastQueue[0])
  const [toastBottom, setToastBottom] = useState(0)
  useEffect(() => {
    if (!active || !toastId) {
      const tm = window.setTimeout(() => setToastBottom(0), toastId ? 0 : 900)
      return () => window.clearTimeout(tm)
    }
    const run = () => {
      const el = document.querySelector('.hud-toast')
      const host = hostRef.current
      if (!el || !host) return
      const r = el.getBoundingClientRect()
      const o = host.getBoundingClientRect()
      setToastBottom(r.width > 2 ? Math.round(r.bottom - o.top) : 0)
    }
    const raf = requestAnimationFrame(run)
    const tm = window.setTimeout(run, 420)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(tm)
    }
  }, [toastId, active, size])

  const top = Math.max(SAFE_TOP, toastBottom ? toastBottom + 12 : 0)
  const bottom = safeBottom(size.w)
  const showFinal = fin > 0.01

  return (
    <div ref={hostRef} className={`c5-root${reduced ? ' is-reduced' : ''}`}>
      <div className="c5-view" role="img" aria-label={ARIA}>
        {sk && <City sk={sk} fr={fr} />}
      </div>

      {/* the Adobe card: proof of the chapter, wording from src/content/entries.ts */}
      {ADOBE && card > 0.001 && (
        <div className="c5-safe" style={{ top: SAFE_TOP, bottom }} aria-hidden="true">
          <article className="c5-card" style={{ opacity: card, transform: `translateY(${cardRise.toFixed(1)}px)` }}>
            <p className="c5-card-eyebrow">{ERA.toUpperCase()}</p>
            <h2 className="c5-card-title">{ADOBE.title}</h2>
            <p className="c5-card-blurb">{ADOBE.blurb}</p>
          </article>
        </div>
      )}

      {/* the Game Boy save dialog */}
      {save > 0.001 && (
        <div className="c5-safe c5-center" style={{ top, bottom }} aria-hidden="true">
          <div className="c5-save" style={{ opacity: save }}>
            {phase === 'ask' || phase === 'yes' ? (
              <>
                <p>{COPY.save}</p>
                <p className="c5-save-opts">
                  <span className={`c5-opt is-on${phase === 'yes' && !reduced ? ' is-blink' : ''}`}>
                    <i>▶</i>
                    {COPY.yes}
                  </span>
                  <span className="c5-opt">
                    <i />
                    {COPY.no}
                  </span>
                </p>
              </>
            ) : phase === 'saving' ? (
              <p>
                {COPY.saving}
                <span className="c5-dots">{dots}</span>
              </p>
            ) : (
              <p>{COPY.saved}</p>
            )}
          </div>
        </div>
      )}

      {/* the final screen: stays up at the end of the scroll */}
      <div className="c5-dim" style={{ opacity: fin }} />
      {showFinal && (
        <div className="c5-safe c5-center" style={{ top, bottom }}>
          <section
            className="c5-final"
            aria-label="The end"
            style={{ opacity: fin, transform: reduced ? undefined : `translateY(${((1 - fin) * 14).toFixed(1)}px)` }}
          >
            <h2 className="c5-count">
              <span>{ACHIEVEMENT_COUNT}</span> {COPY.unlocked}
            </h2>
            <p className="c5-ask">{COPY.ask}</p>
            <nav className="c5-links" aria-label="Get in touch">
              <a className="c5-btn is-primary" href="#/index" onClick={onContact}>
                Contact me
              </a>
              <a className="c5-btn is-wide" href="#/index" onClick={onIndex}>
                See everything <small>(Index)</small>
              </a>
              <a className="c5-btn" href={person.contact.github} target="_blank" rel="noopener noreferrer">
                GitHub <i aria-hidden="true">↗</i>
                <span className="c5-sr"> (opens in a new tab)</span>
              </a>
              <a className="c5-btn" href={person.contact.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn <i aria-hidden="true">↗</i>
                <span className="c5-sr"> (opens in a new tab)</span>
              </a>
              <a className="c5-btn" href={person.contact.instagram} target="_blank" rel="noopener noreferrer">
                Instagram <i aria-hidden="true">↗</i>
                <span className="c5-sr"> (opens in a new tab)</span>
              </a>
              <a className="c5-btn" href={`mailto:${person.contact.email}`} title={person.contact.email}>
                Email <span className="c5-sr">{person.contact.email}</span>
              </a>
            </nav>
          </section>
        </div>
      )}
    </div>
  )
}
