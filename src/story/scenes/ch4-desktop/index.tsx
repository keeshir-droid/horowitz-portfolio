/**
 * Chapter 4 "The builder years, on the family computer": a beige CRT on a desk at night. The camera pushes into the
 * 4:3 screen and every venture opens as a program on a 2000s-style desktop (admission mail → visa error → the screen
 * dies → CONTINUE? → setup wizard → pet brand → Décor Tycoon → feed + chat → pitch → 21 in 21 → Idea Tester + Ad
 * Maker → badge + class), then the windows minimise, the camera pulls back into a golden-hour room and pushes through
 * the window into the San Francisco sky (Chapter 5 crossfades in from that exact sky).
 * Pure function of `progress`; the 21-in-21 icons are real links on top. Files: config.ts (timeline), room.ts (room
 * SVG + sky), desktop.ts (screen HTML), stage.ts (DOM painter), desk.css.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { SAMPLE_SETS, audio, music, sfx, type DeskCue } from '../../engine/audio'
import type { SceneProps } from '../../engine/types'
import { getEntry, tierOf, unlock, unlockGroup, useUnlocks } from '../../engine/unlocks'
import { CUES, DUR, ENTRY_IDS, PHONE_BELOW, SAFE_TOP, T, UNLOCKS, safeBottom, type DeskCueName } from './config'
import { DeskStage, type StageLayout } from './stage'
// Ch4 ends on Ch5's exact first frame (same SVG city), so the chapter boundary has nothing to dissolve.
import City from '../ch5-sf/City'
import { SUN } from '../ch5-sf/config'
import { buildSkyline } from '../ch5-sf/skyline'
import '../ch5-sf/city.css'

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
 *   ?ch4p=0.42      render the scene at a fixed progress (overrides scroll)
 *   ?ch4reduced=1   force the reduced-motion version
 */
const dbg = (() => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { p: undefined as number | undefined, reduced: false }
  const q = new URLSearchParams(window.location.search)
  const v = Number(q.get('ch4p'))
  return { p: q.has('ch4p') && Number.isFinite(v) ? clamp01(v) : undefined, reduced: q.get('ch4reduced') === '1' }
})()

// The pixel font for the CONTINUE? screen (self-hosted, loaded once).
let pixelFont: Promise<void> | null = null
function loadPixelFont(): Promise<void> {
  if (!pixelFont) {
    pixelFont = (async () => {
      try {
        const face = new FontFace('Ch4Pixel', `url(${import.meta.env.BASE_URL}fonts/PressStart2P.ttf)`)
        await face.load()
        document.fonts.add(face)
      } catch {
        /* falls back to the page's pixel font */
      }
    })()
  }
  return pixelFont
}

/** Screen target: the 4:3 CRT screen below the HUD bar and above the chapter dock. */
function layoutFor(w: number, h: number): StageLayout {
  const top = SAFE_TOP
  const bot = safeBottom(w)
  const safe = { x: 0, y: top, w, h: Math.max(60, h - top - bot) }
  const narrow = w / Math.max(1, h) < PHONE_BELOW
  const padX = narrow ? 6 : 24
  const padY = narrow ? 6 : 10
  const aw = Math.max(40, w - 2 * padX)
  const ah = Math.max(30, safe.h - 2 * padY)
  const sw = Math.min(aw, (ah * 4) / 3)
  const sh = (sw * 3) / 4
  return {
    w,
    h,
    // a short landscape screen (phone sideways) gets the phone treatment too: bigger text, full-width windows
    phone: narrow || sh < 330,
    safe,
    target: { x: (w - sw) / 2, y: top + (safe.h - sh) / 2, w: sw, h: sh },
  }
}

/**
 * Keep the screen clear of the unlock card: if the card overlaps the screen, slide/shrink the scene so the screen
 * sits left of the card or below it (whichever keeps it larger). Returns a transform for .c4-dodge ('' = none).
 */
function dodgeFor(L: StageLayout, card: DOMRect | null, origin: DOMRect | null): string {
  if (!card || !origin || card.width < 2) return ''
  const pad = 12
  const c = { l: card.left - origin.left - pad, r: card.right - origin.left + pad, t: card.top - origin.top - pad, b: card.bottom - origin.top + pad }
  const S = L.target
  if (c.l >= S.x + S.w || c.r <= S.x || c.t >= S.y + S.h || c.b <= S.y) return ''
  const margin = 12
  const sA = Math.min(1, (c.l - 2 * margin) / S.w, (L.safe.h - 8) / S.h)
  const floor = L.h - safeBottom(L.w) + 4
  const sB = Math.min(1, (floor - c.b) / S.h, (L.w - 2 * margin) / S.w)
  let s: number
  let nx: number
  let ny: number
  if (sA >= sB) {
    s = sA
    nx = Math.min(S.x, margin + (c.l - margin - S.w * s - margin) / 2)
    ny = S.y + (S.h * (1 - s)) / 2
  } else {
    s = sB
    nx = S.x + (S.w * (1 - s)) / 2
    ny = Math.max(S.y, c.b)
  }
  if (s < 0.4) return ''
  return `translate(${(nx - S.x * s).toFixed(1)}px, ${(ny - S.y * s).toFixed(1)}px) scale(${s.toFixed(4)})`
}

/** Tier rules (engine/unlocks.ts): A/B get their own card; several tier-C entries in one beat share one card. Compact (phone) = one group card per beat. */
function unlockBeat(ids: readonly string[], compact: boolean): void {
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

/** Minimum real-time gap between two plays of the same cue (ms), so fast scrolling never machine-guns a sound. */
const CUE_GAP: Partial<Record<DeskCueName, number>> = { sale: 260, vote: 160, countdown: 200, click: 90, typing: 300 }

const ARIA = `Chapter 4, the builder years, told on a 2000s family computer. ${ENTRY_IDS.map((id) => getEntry(id)?.title)
  .filter(Boolean)
  .join('. ')}.`

export default function Ch4Desktop({ progress: rawProgress, active }: SceneProps) {
  const progress = dbg.p ?? rawProgress
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<DeskStage | null>(null)
  const reducedMq = useSyncExternalStore(reducedSubscribe, reducedNow, () => false)
  const reduced = reducedMq || dbg.reduced
  const [size, setSize] = useState({ w: 0, h: 0 })
  const layout = useMemo(() => layoutFor(size.w, size.h), [size])
  const t = clamp01(progress) * DUR

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __ch4?: unknown }).__ch4 = { T, DUR, CUES, UNLOCKS }
  }, [])

  // build the DOM once
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const st = new DeskStage(host)
    stageRef.current = st
    const ro = new ResizeObserver(() => setSize({ w: host.clientWidth, h: host.clientHeight }))
    ro.observe(host)
    void loadPixelFont()
    return () => {
      ro.disconnect()
      st.destroy()
      stageRef.current = null
    }
  }, [])

  // paint: a pure function of t (and size / reduced motion)
  useLayoutEffect(() => {
    const st = stageRef.current
    if (!st || layout.w < 2 || layout.h < 2) return
    st.setLayout(layout, reduced)
    st.paint(t)
  }, [t, layout, reduced])

  // recorded sounds + the music file: fetch + decode while this scene is current (after the first gesture)
  useEffect(() => {
    if (active) audio.preload(SAMPLE_SETS.ch4)
  }, [active])

  // music: silence through the visa beat; the 'desk' track starts once CONTINUE? is answered YES
  const musicOn = active && t >= T.yes
  useEffect(() => {
    if (!musicOn) return
    let dead = false
    const start = () => {
      if (!audio.isUnlocked()) return
      void audio.whenRunning().then((ok) => {
        if (ok && !dead) music.play('desk', 1.2)
      })
    }
    start()
    const off = audio.subscribe(start)
    return () => {
      dead = true
      off()
      music.stopIf('desk', 0.8)
    }
  }, [musicOn])

  // unlocks: idempotent, never while inactive; everything up to the current time (deep links included)
  const fired = useRef(new Set<string>())
  useEffect(() => {
    if (!active || layout.w < 2) return
    for (const u of UNLOCKS) {
      if (u.t > t) break
      const key = u.ids.join(',')
      if (fired.current.has(key)) continue
      fired.current.add(key)
      unlockBeat(u.ids, layout.phone)
    }
  }, [active, t, layout.w, layout.phone])

  // sound cues: forward crossings only, small steps only, each cue rate-limited
  const snd = useRef({ t: -1, last: new Map<string, number>() })
  useEffect(() => {
    const s = snd.current
    const prev = s.t
    s.t = t
    if (!active || prev < 0) return
    const d = t - prev
    if (d <= 0 || d > 3) return
    const now = performance.now()
    const played = new Set<string>()
    for (const c of CUES) {
      if (c.t <= prev) continue
      if (c.t > t) break
      if (played.has(c.cue) || played.size >= 3) continue
      const gap = CUE_GAP[c.cue] ?? 60
      if (now - (s.last.get(c.cue) ?? -1e9) < gap) continue
      s.last.set(c.cue, now)
      played.add(c.cue)
      sfx.desk(c.cue satisfies DeskCue)
    }
  }, [t, active])

  // keep the screen clear of the unlock card while one is showing (only while the camera is on the screen)
  const toastId = useUnlocks((s) => s.toastQueue[0])
  const onScreen = t >= T.zoom[1] && t < T.pull[0]
  useEffect(() => {
    const st = stageRef.current
    if (!st) return
    if (!active || !onScreen) {
      st.setDodge('')
      return
    }
    if (!toastId) {
      // release a little later so back-to-back cards don't make the screen bounce in and out
      const tm = window.setTimeout(() => st.setDodge(''), 1200)
      return () => window.clearTimeout(tm)
    }
    const run = () => {
      const card = document.querySelector('.hud-toast')
      st.setDodge(dodgeFor(layout, card ? card.getBoundingClientRect() : null, st.root.getBoundingClientRect()))
    }
    const raf = requestAnimationFrame(run)
    const tm = window.setTimeout(run, 420)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(tm)
    }
  }, [toastId, active, layout, onScreen])

  // the hand-over city: same timing as the stage's own full-frame sky (which it covers)
  const cityK = reduced ? clamp01((t - T.push[0] - 0.4) / (T.push[1] - T.push[0] - 0.4)) : clamp01((t - T.sky[0]) / (T.sky[1] - T.sky[0]))
  const cityOn = cityK > 0
  const sk = useMemo(() => (cityOn && size.w > 1 && size.h > 1 ? buildSkyline(size.w, size.h) : null), [cityOn, size])

  return (
    // isolate: the hand-over city's z-index must stay inside this scene (Ch5 is mounted on top during the crossfade)
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', isolation: 'isolate' }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#1b1622' }} role="group" aria-label={ARIA} />
      {sk && (
        <div className="c5-view" style={{ position: 'absolute', inset: 0, zIndex: 45, opacity: cityK, pointerEvents: 'none' }} aria-hidden="true">
          <City sk={sk} fr={{ t: 0, crane: 0, sunY: SUN.y, lights: 0, dusk: 0, reduced }} />
        </div>
      )}
    </div>
  )
}
