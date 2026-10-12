import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audio, music, sfx } from '../../engine/audio'
import type { SceneProps } from '../../engine/types'
import { unlock } from '../../engine/unlocks'
import { BEATS, CARD, CARDS, COPY, DUR, END, ENTRY_OF, FS, GRADES, PHOTO_AT, PHOTO_DROP, PHOTOS, POP, SEL, T, sec, type BeatKey } from './config'
import { HIT_TIMES, KO_AT } from './fight'
import type { Assets, FontState } from './kit'
import { drawFrame } from './render'

export { meta, transitionColors } from './meta'

const reducedSubscribe = (cb: () => void): (() => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const reducedNow = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * DEV-only debug params (ignored in production builds):
 *   ?ch2p=0.42      render the scene at a fixed progress (overrides scroll)
 *   ?ch2reduced=1   force the reduced-motion stills
 */
const dbg = (() => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { p: undefined as number | undefined, reduced: false, bench: false }
  const q = new URLSearchParams(window.location.search)
  const v = Number(q.get('ch2p'))
  return {
    p: q.has('ch2p') && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined,
    reduced: q.get('ch2reduced') === '1',
    /** ?ch2bench=1: once fonts are ready, draw 600 frames across the scene and store timings in window.__ch2bench. */
    bench: q.get('ch2bench') === '1',
  }
})()

/** Reduced motion: one settled still per beat (cards settled, pop-ups and photos fully shown). [from, still] in progress. */
const STILLS: ReadonlyArray<readonly [number, number]> = [
  [0, sec(0.78)],
  [T.card1[0], T.card1[0] + sec(0.33)],
  [T.fight[0], T.fight[1] - sec(0.05)],
  [T.card2[0], T.card2[0] + sec(0.33)],
  [T.stage[0], T.stage[0] + (T.stage[1] - T.stage[0]) * 0.6],
  [T.card3[0], T.card3[0] + sec(0.33)],
  [T.council[0], T.council[1] - sec(0.05)],
  [T.end[0], T.end[1] - sec(0.02)],
]
const stillOf = (p: number): number => {
  let out = STILLS[0][1]
  for (const [from, to] of STILLS) if (p >= from) out = to
  return out
}

// ───────────────────────── fonts + photos (module-level, loaded once) ─────────────────────────
const fontState: { disp: FontState; pix: FontState; promise: Promise<void> | null } = { disp: 'pending', pix: 'pending', promise: null }
function loadFonts(): Promise<void> {
  if (fontState.promise) return fontState.promise
  const base = import.meta.env.BASE_URL
  const one = async (name: string, file: string, key: 'disp' | 'pix') => {
    try {
      const face = new FontFace(name, `url(${base}fonts/${file})`)
      await face.load()
      document.fonts.add(face)
      fontState[key] = 'ok'
    } catch {
      fontState[key] = 'fail'
    }
  }
  fontState.promise = Promise.all([one('Ch2Disp', 'BebasNeue.ttf', 'disp'), one('Ch2Pixel', 'PressStart2P.ttf', 'pix')]).then(() => undefined)
  return fontState.promise
}

/** Colour-grade a photo once into the chapter palette (desaturate, magenta -> indigo duotone, lifted blacks). */
function gradePhoto(img: HTMLImageElement): HTMLCanvasElement | null {
  const c = document.createElement('canvas')
  c.width = 960
  c.height = 690
  const g = c.getContext('2d')
  if (!g) return null
  const iw = img.naturalWidth || 1
  const ih = img.naturalHeight || 1
  const k = Math.max(c.width / iw, c.height / ih)
  g.drawImage(img, (c.width - iw * k) / 2, (c.height - ih * k) / 2, iw * k, ih * k)
  g.globalCompositeOperation = 'saturation'
  g.globalAlpha = 0.65
  g.fillStyle = '#808080'
  g.fillRect(0, 0, c.width, c.height)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'multiply'
  const gr = g.createLinearGradient(0, 0, c.width, c.height)
  gr.addColorStop(0, '#ffb3c6')
  gr.addColorStop(1, '#8f86e0')
  g.fillStyle = gr
  g.fillRect(0, 0, c.width, c.height)
  g.globalCompositeOperation = 'screen'
  g.fillStyle = 'rgba(58,16,48,.45)'
  g.fillRect(0, 0, c.width, c.height)
  g.globalCompositeOperation = 'source-over'
  return c
}
const photoCache = new Map<string, HTMLCanvasElement | null>()

// ───────────────────────── sound cues (forward crossings only) ─────────────────────────
interface Cue {
  p: number
  /** Priority cues (impacts) may follow another cue sooner than the normal rate cap. */
  pri: boolean
  play: () => void
}
const CUES: Cue[] = (() => {
  const out: Cue[] = []
  const at = (s: number, play: () => void, pri = false) => out.push({ p: sec(s), play, pri })
  // select
  for (const c of SEL.cursor) at(c, () => sfx.blip())
  at(SEL.lock, () => sfx.confirm(), true)
  // stage cards: whoosh on the wipe, impact on the slam
  for (const c of CARDS) {
    at(c.win[0] * DUR + 0.01, () => sfx.whoosh(true))
    at(c.win[0] * DUR + CARD.slam, () => sfx.impact(), true)
  }
  // fight
  const f0 = T.fight[0] * DUR
  at(f0 + 0.15 * FS, () => sfx.blip())
  at(f0 + 0.74 * FS, () => sfx.confirm(), true)
  for (const h of HIT_TIMES) {
    if (!h.block) at(f0 + (h.t - 0.08) * FS, () => sfx.whoosh(h.ko))
    at(f0 + h.t * FS, h.block ? () => sfx.blip() : () => sfx.impact(), true)
  }
  at(f0 + (KO_AT + 0.12) * FS, () => sfx.impact(), true)
  at(f0 + 5.36 * FS, () => sfx.footstep(), true)
  // photo frames landing
  for (const k of BEATS) at(PHOTO_AT[k] * DUR + PHOTO_DROP * 0.62, () => sfx.footstep())
  // stage: applause at the bow, coin when the counter lands
  const st = (T.stage[1] - T.stage[0]) * DUR
  at(T.stage[0] * DUR + st * 0.24, () => sfx.applause(2), true)
  at(T.stage[0] * DUR + st * 0.52, () => sfx.coin(), true)
  // council: a blip per grade badge
  const cn = (T.council[1] - T.council[0]) * DUR
  for (let i = 0; i < GRADES.length; i++) at(T.council[0] * DUR + cn * (0.1 + i * 0.08), () => sfx.blip())
  // finish: slam, a blip per result chip, whoosh for NEXT LEVEL, fanfare when the bar fills
  const e0 = T.end[0] * DUR
  at(e0 + 0.01, () => sfx.whoosh(true))
  at(e0 + END.slam, () => sfx.impact(), true)
  for (const c of END.chips) at(e0 + c, () => sfx.blip())
  at(e0 + END.next, () => sfx.whoosh(true))
  at(e0 + END.barTo, () => sfx.tada(2), true)
  return out.sort((a, b) => a.p - b.p)
})()

/** Space kept clear for the story HUD (top) and the chapter dock (bottom), CSS px. */
const SAFE_TOP = 84
const safeBottom = (w: number): number => (w <= 640 ? 132 : 80)

export default function Ch2Select({ progress: rawProgress, active }: SceneProps) {
  const progress = dbg.p ?? rawProgress
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMq = useSyncExternalStore(reducedSubscribe, reducedNow, () => false)
  const reduced = reducedMq || dbg.reduced
  const [rev, setRev] = useState(0) // bumps on resize, font load, photo load
  const fired = useRef<Set<BeatKey>>(new Set())
  const snd = useRef({ p: progress, last: 0 })
  const assets = useRef<Assets>({ disp: 'pending', pix: 'pending', photos: {}, reduced: false })

  // fonts (self-hosted) + optional photos
  useEffect(() => {
    let dead = false
    void loadFonts().then(() => !dead && setRev((n) => n + 1))
    for (const k of BEATS) {
      const url = PHOTOS[k]
      if (!url || photoCache.has(url)) continue
      photoCache.set(url, null)
      const img = new Image()
      img.onload = () => {
        photoCache.set(url, gradePhoto(img))
        if (!dead) setRev((n) => n + 1)
      }
      img.src = url
    }
    return () => {
      dead = true
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new ResizeObserver(() => setRev((n) => n + 1))
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // draw: a pure function of progress (plus fonts/photos/size). No RAF loop at all.
  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cw = root.clientWidth
    const ch = root.clientHeight
    if (cw < 2 || ch < 2) return
    const vw = Math.round(cw * dpr)
    const vh = Math.round(ch * dpr)
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw
      canvas.height = vh
    }
    const g = canvas.getContext('2d')
    if (!g) return
    const A = assets.current
    A.disp = fontState.disp
    A.pix = fontState.pix
    A.reduced = reduced
    for (const k of BEATS) {
      const im = PHOTOS[k] ? photoCache.get(PHOTOS[k]) : null
      if (im) A.photos[k] = im
      else delete A.photos[k]
    }
    const p0 = Math.min(1, Math.max(0, progress))
    if (dbg.bench && A.disp !== 'pending' && !(window as unknown as { __ch2bench?: unknown }).__ch2bench) {
      const times: number[] = []
      for (let i = 0; i < 600; i++) {
        const t0 = performance.now()
        drawFrame(g, i / 599, vw, vh, dpr, SAFE_TOP, safeBottom(cw), A)
        times.push(performance.now() - t0)
      }
      const sorted = [...times].sort((a, b) => a - b)
      ;(window as unknown as { __ch2bench?: unknown }).__ch2bench = {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
        max: sorted[sorted.length - 1],
        worstAt: times.indexOf(sorted[sorted.length - 1]) / 599,
        px: `${vw}x${vh}`,
      }
    }
    drawFrame(g, reduced ? stillOf(p0) : p0, vw, vh, dpr, SAFE_TOP, safeBottom(cw), A)
  }, [progress, rev, reduced])

  // release the bitmap on unmount
  useEffect(() => {
    const c = canvasRef.current
    return () => {
      if (c) {
        c.width = 0
        c.height = 0
      }
    }
  }, [])

  // music while this scene is current
  useEffect(() => {
    if (!active || reduced) return
    const start = () => {
      if (audio.isUnlocked()) music.play('arcade')
    }
    start()
    const off = audio.subscribe(start)
    return () => {
      off()
      music.stopIf('arcade', 0.6)
    }
  }, [active, reduced])

  // unlocks: once per beat when its pop-up appears (idempotent, never while inactive). With reduced motion the
  // still on screen decides, so the unlock always matches the pop-up the viewer sees.
  useEffect(() => {
    if (!active) return
    const shown = reduced ? stillOf(progress) : progress
    for (const k of BEATS) {
      if (shown >= POP[k][0] && !fired.current.has(k)) {
        fired.current.add(k)
        unlock(ENTRY_OF[k])
      }
    }
  }, [active, progress, reduced])

  // sound cues on forward crossings only, small steps only, rate-capped
  useEffect(() => {
    const s = snd.current
    const prev = s.p
    s.p = progress
    if (!active || reduced) return
    const d = progress - prev
    if (d <= 0 || d > 0.05) return
    const now = performance.now()
    let pick: Cue | null = null
    for (const c of CUES) {
      if (c.p <= prev) continue
      if (c.p > progress) break
      if (!pick || c.pri || !pick.pri) pick = c
    }
    if (!pick) return
    if (now - s.last < (pick.pri ? 40 : 80)) return
    s.last = now
    pick.play()
  }, [progress, active, reduced])

  return (
    <div
      ref={rootRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#07070d' }}
      role="img"
      aria-label={`Chapter 2, middle school, as a fighting game. Karate: ${COPY.karate.head}, ${COPY.karate.sub}. Stage: ${COPY.stage.head}. Student council: ${COPY.council.head}.`}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
