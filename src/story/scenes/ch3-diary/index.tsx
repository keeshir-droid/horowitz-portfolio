/**
 * Chapter 3 "Diary of a Boarding School Kid" (high school): a scroll-driven diary. The arcade frame from Chapter 2
 * hands over ("SAVING… DO NOT TURN OFF"), the diary drops onto the desk, the cover opens, pages ink themselves and
 * curl from the corner, a flipbook riffle runs through grades 10 to 12, then the book closes and fades to black.
 * Pure function of `progress` (pointer interactions on pages add on top). Engine files: config.ts (timeline),
 * book.ts (pure frame state), curl.ts (page-curl geometry), stage.ts (DOM), cover.ts. Page modules: pages/*.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { SAMPLE_SETS, audio, music, sfx } from '../../engine/audio'
import type { SceneProps } from '../../engine/types'
import { getEntry, tierOf, unlock, unlockGroup, useUnlocks } from '../../engine/unlocks'
import { buildBook, buildCues, buildUnlocks, frameAt, uOf, type BookMode, type Cue } from './book'
import { DUR, ENTRY_IDS, ONE_PAGE_BELOW, PLAN, SAFE_TOP, safeBottom } from './config'
import { loadDiaryFont } from './kit'
import { SPREADS } from './pages'
import { DiaryStage, type StageLayout } from './stage'

export { meta, transitionColors } from './meta'

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

const reducedSubscribe = (cb: () => void): (() => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const reducedNow = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * DEV-only debug params (ignored in production builds):
 *   ?ch3p=0.42      render the scene at a fixed progress (overrides scroll)
 *   ?ch3reduced=1   force the reduced-motion version
 */
const dbg = (() => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { p: undefined as number | undefined, reduced: false }
  const q = new URLSearchParams(window.location.search)
  const v = Number(q.get('ch3p'))
  return { p: q.has('ch3p') && Number.isFinite(v) ? clamp01(v) : undefined, reduced: q.get('ch3reduced') === '1' }
})()

if (import.meta.env.DEV) {
  const real = SPREADS.map((s) => `${s.key}:${s.kind}`).join(',')
  const plan = PLAN.map((s) => `${s.key}:${s.kind}`).join(',')
  if (real !== plan) console.warn('[ch3-diary] pages/index.ts SPREADS no longer match config.ts PLAN; meta.duration is stale. Update PLAN.')
}

// The pixel font for the arcade hand-over frame (self-hosted, loaded once).
let pixelFont: Promise<void> | null = null
function loadPixelFont(): Promise<void> {
  if (!pixelFont) {
    pixelFont = (async () => {
      try {
        const face = new FontFace('Ch3Pixel', `url(${import.meta.env.BASE_URL}fonts/PressStart2P.ttf)`)
        await face.load()
        document.fonts.add(face)
      } catch {
        /* falls back to the page's pixel font */
      }
    })()
  }
  return pixelFont
}

/** Book size and position: below the HUD bar, above the chapter dock, exact 80:96 pages. */
function layoutFor(w: number, h: number): StageLayout {
  const mode: BookMode = w / Math.max(1, h) < ONE_PAGE_BELOW ? 'one' : 'two'
  const top = SAFE_TOP
  const bot = safeBottom(w)
  const padX = mode === 'two' ? 24 : 8
  const padY = mode === 'two' ? 14 : 8
  const availW = Math.max(40, w - 2 * padX)
  const availH = Math.max(48, h - top - bot - 2 * padY)
  const raw = mode === 'two' ? Math.min(availW / 2, (availH * 80) / 96) : Math.min(availW, (availH * 80) / 96)
  const pw = Math.max(10, Math.floor(raw / 5) * 5) // multiple of 5 -> page height is a whole pixel
  const ph = (pw * 96) / 80
  const bw = mode === 'two' ? pw * 2 : pw
  return { w, h, mode, pw, ph, bw, x: Math.round((w - bw) / 2), y: Math.round(top + (h - top - bot - ph) / 2) }
}

/**
 * Keep the book clear of the unlock card: if the card overlaps the book, shrink/slide the book into the larger free
 * area (left of the card, or below it). Returns a transform for the full-scene .c3-dodge layer ('' = none).
 */
function dodgeFor(L: StageLayout, card: DOMRect | null, origin: DOMRect | null): string {
  if (!card || !origin || card.width < 2) return ''
  const pad = 14
  const c = { l: card.left - origin.left - pad, r: card.right - origin.left + pad, t: card.top - origin.top - pad, b: card.bottom - origin.top + pad }
  const b = { l: L.x, r: L.x + L.bw, t: L.y, b: L.y + L.ph }
  if (c.l >= b.r || c.r <= b.l || c.t >= b.b || c.b <= b.t) return ''
  // A: left of the card, same vertical centre, centred in the free area with even margins (not jammed to the edge)
  const sA = Math.min(1, (c.l - 72) / L.bw)
  // B: below the card, above the dock
  const floor = L.h - safeBottom(L.w) + 6
  const sB = Math.min(1, (floor - c.b) / L.ph, (L.w - 16) / L.bw)
  let s: number
  let nx: number
  let ny: number
  if (sA >= sB) {
    s = sA
    nx = Math.min(L.x, (c.l - L.bw * s) / 2)
    ny = L.y + (L.ph * (1 - s)) / 2
  } else {
    s = sB
    nx = L.x + (L.bw * (1 - s)) / 2
    ny = Math.max(L.y, c.b)
  }
  if (s < 0.3) return ''
  return `translate(${(nx - L.x * s).toFixed(1)}px, ${(ny - L.y * s).toFixed(1)}px) scale(${s.toFixed(4)})`
}

/** Tier rules (engine/unlocks.ts): A/B get their own card; several tier-C entries on a page share one toast. Compact = one group toast. */
function unlockPage(ids: readonly string[], compact: boolean): void {
  if (!ids.length) return
  const label = (list: readonly string[]): string => list.map((id) => getEntry(id)?.title ?? id).join(' · ')
  if (compact) {
    unlockGroup(ids, label(ids))
    return
  }
  const cs = ids.filter((id) => tierOf(id) === 'C')
  for (const id of ids) if (tierOf(id) !== 'C') unlock(id)
  if (cs.length > 1) unlockGroup(cs, label(cs))
  else if (cs.length === 1) unlock(cs[0])
}

/** Sound per cue kind (recorded paper/crowd samples; each falls back to a procedural voice until its file loads). */
function playCue(c: Cue): void {
  switch (c.kind) {
    case 'impact':
      sfx.bookThud()
      break
    case 'open':
      sfx.coverOpen()
      break
    case 'whoosh':
      sfx.pageTurn()
      break
    case 'riffle':
      sfx.pageTurn(true)
      break
    case 'blip':
      sfx.pencilTick()
      break
    case 'thud':
      sfx.bookThud(true)
      break
    case 'applause':
      sfx.applause(2, 0.8)
      break
    case 'laugh':
      sfx.laugh()
      break
  }
}

const ARIA = `Chapter 3, high school, told as a school diary. ${ENTRY_IDS.map((id) => getEntry(id)?.title)
  .filter(Boolean)
  .join('. ')}.`

export default function Ch3Diary({ progress: rawProgress, active }: SceneProps) {
  const progress = dbg.p ?? rawProgress
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<DiaryStage | null>(null)
  const reducedMq = useSyncExternalStore(reducedSubscribe, reducedNow, () => false)
  const reduced = reducedMq || dbg.reduced
  const [size, setSize] = useState({ w: 0, h: 0 })
  const layout = useMemo(() => layoutFor(size.w, size.h), [size])
  const mode = layout.mode
  const book = useMemo(() => buildBook(SPREADS, mode), [mode])
  const cues = useMemo(() => buildCues(book), [book])
  const unlocks = useMemo(() => buildUnlocks(book), [book])
  const t = clamp01(progress) * book.total

  // DEV: expose the timeline for verification (window.__ch3.tl.spreads[k].a / .b, total) so progress points can be computed.
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __ch3?: unknown }).__ch3 = { mode: book.mode, total: book.total, tl: book.tl, views: book.views }
  }, [book])

  // build the DOM once
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const st = new DiaryStage(host, SPREADS)
    stageRef.current = st
    const ro = new ResizeObserver(() => setSize({ w: host.clientWidth, h: host.clientHeight }))
    ro.observe(host)
    void loadDiaryFont()
    void loadPixelFont()
    if (import.meta.env.DEV && Math.abs(buildBook(SPREADS, 'two').total - DUR) > 0.01) {
      console.warn('[ch3-diary] real timeline length differs from meta.duration (DUR); update config.ts PLAN.')
    }
    return () => {
      ro.disconnect()
      st.destroy()
      stageRef.current = null
    }
  }, [])

  // paint: a pure function of progress (and size / mode / reduced motion)
  useLayoutEffect(() => {
    const st = stageRef.current
    if (!st || layout.w < 2 || layout.h < 2) return
    st.setLayout(layout, reduced)
    st.paint(frameAt(book, t, reduced), t, (r) => uOf(book, r, t, reduced), active)
  }, [t, layout, book, reduced, active])

  // recorded paper/crowd sounds + the music file: fetch + decode while this scene is current (after the first gesture)
  useEffect(() => {
    if (active) audio.preload(SAMPLE_SETS.ch3)
  }, [active])

  // music while this scene is current (the recorded 'diary' school-comedy track), only after the first user gesture has unlocked audio
  useEffect(() => {
    if (!active) return
    let dead = false
    const start = () => {
      if (!audio.isUnlocked()) return
      void audio.whenRunning().then((ok) => {
        if (ok && !dead) music.play('diary', 1.2)
      })
    }
    start()
    const off = audio.subscribe(start)
    return () => {
      dead = true
      off()
      music.stopIf('diary', 0.8)
    }
  }, [active])

  // unlocks: idempotent, never while inactive; everything up to the current time (deep links included)
  const fired = useRef(new Set<string>())
  useEffect(() => {
    if (!active) return
    for (const u of unlocks) {
      if (u.t > t) break
      const key = u.ids.join(',')
      if (fired.current.has(key)) continue
      fired.current.add(key)
      unlockPage(u.ids, mode === 'one')
    }
  }, [active, t, unlocks, mode])

  // sound cues: forward crossings only, small steps only, rate-capped (riffle whooshes thinned out)
  const snd = useRef({ t: -1, last: 0 })
  useEffect(() => {
    const s = snd.current
    const prev = s.t
    s.t = t
    if (!active || reduced || prev < 0) return
    const d = t - prev
    if (d <= 0 || d > 3) return
    let pick: Cue | null = null
    for (const c of cues) {
      if (c.t <= prev) continue
      if (c.t > t) break
      if (!pick || c.pri || !pick.pri) pick = c
    }
    if (!pick) return
    const now = performance.now()
    const gap = pick.pri ? 40 : pick.kind === 'riffle' ? 110 : 80
    if (now - s.last < gap) return
    s.last = now
    playCue(pick)
  }, [t, active, reduced, cues])

  // keep the book clear of the unlock card while one is showing
  const toastId = useUnlocks((s) => s.toastQueue[0])
  useEffect(() => {
    const st = stageRef.current
    if (!st) return
    if (!active) {
      st.setDodge('')
      return
    }
    if (!toastId) {
      // release a little later so back-to-back cards don't make the book bounce in and out
      const tm = window.setTimeout(() => st.setDodge(''), 1200)
      return () => window.clearTimeout(tm)
    }
    const run = () => {
      const card = document.querySelector('.hud-toast')
      st.setDodge(dodgeFor(layout, card ? card.getBoundingClientRect() : null, st.rootEl.getBoundingClientRect()))
    }
    const raf = requestAnimationFrame(run)
    const tm = window.setTimeout(run, 420)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(tm)
    }
  }, [toastId, active, layout])

  return <div ref={hostRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#221812' }} role="img" aria-label={ARIA} />
}
