import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audio, music, sfx } from '../../engine/audio'
import type { SceneProps } from '../../engine/types'
import { unlock } from '../../engine/unlocks'
import { BREAK, PHOTO, PROPS } from './config'
import { ditherImageToShades, ditherToShades, makeTestImage } from './dither'
import { createRenderer, isPixelFontReady, loadPixelFont, type FrameInput, type FrameOut, type Renderer } from './renderer'
import { PLANS } from './script'
import { travelling } from './world'

export { meta, transitionColors } from './meta'

export interface Ch1WalkProps extends SceneProps {
  /** Verification only: freeze the ambient clock at this many seconds (deterministic frames, walking pose from progress). */
  freezeTime?: number
  /** Override the photo slot (same as PHOTO.src in config.ts). 'test' renders a generated test picture. */
  photo?: string
}

const MAX_H = 352
const MANUAL_MS = 1500
const IDLE_MS = 170

const reducedSubscribe = (cb: () => void): (() => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const reducedNow = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Layout {
  sd: number
  dpr: number
  H: number
  left: number
  top: number
}

const CSS = `
.ch1w{position:absolute;inset:0;overflow:hidden;background:#0d0d18;touch-action:pan-y}
.ch1w canvas{position:absolute;image-rendering:pixelated;image-rendering:crisp-edges}
.ch1w-prop{position:absolute;left:0;top:0;background:transparent;border:0;padding:0;margin:0;cursor:pointer;border-radius:2px}
.ch1w-prop:focus-visible{outline:3px solid #ffd84a;outline-offset:2px;box-shadow:0 0 0 6px #1a1a2e}
.ch1w-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`

export default function Ch1Walk({ progress, active, freezeTime, photo }: Ch1WalkProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([])
  const rendererRef = useRef<Renderer | null>(null)
  const layoutRef = useRef<Layout | null>(null)
  const progressRef = useRef(progress)
  const reduced = useSyncExternalStore(reducedSubscribe, reducedNow, () => false)
  const reducedRef = useRef(reduced)
  const drawRef = useRef<(now: number) => void>(() => undefined)
  const [ready, setReady] = useState(0) // bumps on resize / photo / font so an idle scene redraws

  // per-frame state, allocated once
  const st = useRef({
    prevP: progress,
    lastMove: -1e9,
    reverse: false,
    lastFrame: -1,
    lastStep: 0,
    lastBlip: 0,
    lastChar: -1,
    flashed: false,
    fired: new Uint8Array(PLANS.length),
    manualStart: new Float64Array(PROPS.length).fill(-1),
    inp: {
      p: 0,
      t: 0,
      moving: false,
      reverse: false,
      manual: new Float32Array(PROPS.length).fill(-1),
      ambient: true,
      reduced: false,
    } as FrameInput,
    out: {
      walkFrame: 0,
      charId: -1,
      boxVisible: false,
      boxComplete: false,
      propOn: new Uint8Array(PROPS.length),
      propRect: new Float32Array(PROPS.length * 4),
      H: 144,
    } as FrameOut,
  })

  useEffect(() => {
    progressRef.current = progress
    reducedRef.current = reduced
  }, [progress, reduced])

  const renderFrame = useCallback(
    (now: number) => {
      const r = rendererRef.current
      const lay = layoutRef.current
      if (!r || !lay) return
      const s = st.current
      const rd = reducedRef.current
      const raw = progressRef.current
      const p = raw < 0 ? 0 : raw > 1 ? 1 : raw

      const d = p - s.prevP
      if (Math.abs(d) > 1e-5) {
        s.lastMove = now
        s.reverse = d < 0
        s.prevP = p
      }
      const sinceMove = now - s.lastMove
      if (sinceMove > 600) s.reverse = false
      const frozen = freezeTime !== undefined
      const moving = !rd && travelling(p) && (frozen || sinceMove < IDLE_MS)

      for (let i = 0; i < PROPS.length; i++) {
        const t0 = s.manualStart[i]
        if (t0 < 0) s.inp.manual[i] = -1
        else if (rd) s.inp.manual[i] = 1
        else {
          const e = (now - t0) / MANUAL_MS
          if (e < 1) s.inp.manual[i] = e
          else {
            s.inp.manual[i] = -1
            s.manualStart[i] = -1
          }
        }
      }

      s.inp.p = p
      s.inp.t = rd ? 0 : frozen ? freezeTime : now / 1000
      s.inp.moving = moving
      s.inp.reverse = s.reverse && !frozen
      s.inp.ambient = !rd
      s.inp.reduced = rd
      r.draw(s.inp, s.out)

      if (!rd) {
        // footsteps on contact frames (throttled)
        if (moving) {
          const f = s.out.walkFrame
          if (f !== s.lastFrame && (f === 0 || f === 2) && now - s.lastStep > 170) {
            sfx.footstep()
            s.lastStep = now
          }
          s.lastFrame = f
        }
        // text blips: every 3rd new character, rate-capped so a fast scrub never makes a storm
        const c = s.out.charId
        if (c !== s.lastChar) {
          if (c > s.lastChar && c >= 0 && c % 3 === 0 && now - s.lastBlip > 90) {
            sfx.blip()
            s.lastBlip = now
          }
          s.lastChar = c
        }
        // Chapter 2 flash chime
        if (p >= BREAK.flash[0] && !s.flashed) {
          s.flashed = true
          if (Math.abs(d) < 0.05) sfx.confirm()
        } else if (p < BREAK.flash[0] - 0.01) s.flashed = false
      }

      // prop buttons follow the canvas
      const k = lay.sd / lay.dpr
      for (let i = 0; i < PROPS.length; i++) {
        const b = btnRefs.current[i]
        if (!b) continue
        const on = s.out.propOn[i] === 1
        b.style.visibility = on ? 'visible' : 'hidden'
        b.tabIndex = on ? 0 : -1
        if (on) {
          const o = i * 4
          b.style.width = `${(s.out.propRect[o + 2] + 2) * k}px`
          b.style.height = `${(s.out.propRect[o + 3] + 2) * k}px`
          b.style.transform = `translate(${lay.left + (s.out.propRect[o] - 1) * k}px, ${lay.top + (s.out.propRect[o + 1] - 1) * k}px)`
        }
      }
    },
    [freezeTime],
  )

  useEffect(() => {
    drawRef.current = renderFrame
  }, [renderFrame])

  // canvas + renderer + resize
  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const r = createRenderer(canvas)
    rendererRef.current = r
    if (!r) return
    const apply = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1)
      const cw = root.clientWidth
      // Fit above the bottom chapter dock (same safe area as Ch3) so the text box is never hidden under it; the map
      // may run under the translucent top bar.
      const ch = root.clientHeight - (cw <= 640 ? 132 : 80)
      if (cw < 2 || ch < 2) return
      const vw = cw * dpr
      const vh = ch * dpr
      const portrait = vw / vh < 0.8
      const W = portrait ? 224 : 240
      const sd = Math.max(1, portrait ? Math.floor(vw / W) : Math.min(Math.floor(vw / W), Math.floor(vh / 192)))
      const H = Math.max(portrait ? 224 : 192, Math.min(Math.floor(vh / sd), portrait ? MAX_H : 256))
      const cssW = (W * sd) / dpr
      const cssH = (H * sd) / dpr
      const lay: Layout = { sd, dpr, H, left: (cw - cssW) / 2, top: (ch - cssH) / 2 }
      layoutRef.current = lay
      r.resize(W, H)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      canvas.style.left = `${lay.left}px`
      canvas.style.top = `${lay.top}px`
      drawRef.current(performance.now()) // paint at once; resizing clears the canvas
      setReady((n) => n + 1)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(root)
    let cancelled = false
    // belt and braces: poll until the font is ready so a missed resolve can never leave a stale frame
    const poll = window.setInterval(() => {
      if (isPixelFontReady()) {
        window.clearInterval(poll)
        r.refreshFont()
        setReady((n) => n + 1)
      }
    }, 120)
    void loadPixelFont().then(() => {
      if (cancelled) return
      r.refreshFont()
      setReady((n) => n + 1)
    })
    return () => {
      cancelled = true
      window.clearInterval(poll)
      ro.disconnect()
      r.dispose()
      rendererRef.current = null
      layoutRef.current = null
    }
  }, [])

  // optional dithered photo on the house wall
  const photoSrc = photo ?? PHOTO.src
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    if (!photoSrc) {
      r.setPhoto(null)
      return
    }
    if (photoSrc === 'test') {
      r.setPhoto(ditherToShades(makeTestImage(18, 10), 18, 10))
      queueMicrotask(() => setReady((n) => n + 1))
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      r.setPhoto(ditherImageToShades(img, img.naturalWidth, img.naturalHeight, 18, 10))
      setReady((n) => n + 1)
    }
    img.onerror = () => r.setPhoto(null)
    img.src = photoSrc
    return () => {
      cancelled = true
    }
  }, [photoSrc])

  // RAF only while active (ambient at ~30 fps when not scrolling); otherwise redraw on demand
  useEffect(() => {
    if (!active || reduced || freezeTime !== undefined) {
      renderFrame(performance.now())
      return
    }
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const moved = Math.abs(progressRef.current - st.current.prevP) > 1e-5 || now - st.current.lastMove < 400
      if (!moved && now - last < 33) return
      last = now
      renderFrame(now)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, reduced, freezeTime, renderFrame])

  useEffect(() => {
    if (!active || reduced || freezeTime !== undefined) renderFrame(performance.now())
  }, [progress, ready, active, reduced, freezeTime, renderFrame])

  // music while this scene is the current one
  useEffect(() => {
    if (!active) return
    const start = () => {
      if (audio.isUnlocked()) music.play('town')
    }
    start()
    const off = audio.subscribe(start)
    return () => {
      off()
      music.stopIf('town', 0.6)
    }
  }, [active])

  // unlock each entry when its text box has finished typing (idempotent; a chime only for freshly completed win boxes)
  useEffect(() => {
    if (!active) return
    const f = st.current.fired
    let chime = false
    for (let i = 0; i < PLANS.length; i++) {
      const b = PLANS[i]
      if (progress < b.completeAt || f[i]) continue
      f[i] = 1
      if (b.entries.length) {
        for (const e of b.entries) unlock(e)
        chime = true
      }
    }
    if (chime && !reducedRef.current) sfx.coin()
  }, [active, progress])

  const trigger = useCallback(
    (i: number) => {
      const s = st.current
      const now = performance.now()
      const t0 = s.manualStart[i]
      if (t0 >= 0 && now - t0 < MANUAL_MS) return
      s.manualStart[i] = now
      if (!reducedRef.current) sfx.blip()
      renderFrame(now)
    },
    [renderFrame],
  )

  return (
    <section ref={rootRef} className="ch1w" aria-label="Chapter 1: Primary school">
      <style>{CSS}</style>
      <canvas ref={canvasRef} aria-hidden="true" />
      <h2 className="ch1w-sr">CHAPTER 1 · PRIMARY SCHOOL</h2>
      <p className="ch1w-sr">
        A small top-down pixel town. A kid with round glasses and a black jacket walks one path past an easel, a chess table, a
        science bench and a toy robot to a house with a window shelf of small trophies. Text boxes say what he won.
        {PHOTO.src ? ` ${PHOTO.label}` : ''}
      </p>
      {PROPS.map((pr, i) => (
        <button
          key={pr.id}
          type="button"
          ref={(el) => {
            btnRefs.current[i] = el
          }}
          className="ch1w-prop"
          aria-label={pr.label}
          style={{ visibility: 'hidden' }}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') trigger(i)
          }}
          onClick={() => trigger(i)}
        />
      ))}
    </section>
  )
}
