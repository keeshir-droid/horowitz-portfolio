import { useEffect, useRef } from 'react'
import { createInstance, makeView, renderFrame, setSky, type Instance, type View } from './opening/scene'
import { hash1, seg, smooth } from './opening/util'

/**
 * The opening: a silent, fully illustrated 2.5D cinematic (SVG planes + a pinhole camera; no WebGL, no downloads).
 *   A  0.0 – 3.0s   night street: one warm window among dark ones; the camera pushes in and through it
 *   B  3.0 – 5.8s   the bedroom (lamp + CRT glow); glide down over the kid's shoulder to the handheld
 *   C  5.8 – 7.15s  dive into the handheld's screen: the NAWKA boot logo, then the flat LCD green the menu sits on
 * Art lives in ./opening/*. `?t=<seconds>` freezes the opening at that moment.
 * Reduced motion: three still shots with gentle crossfades over the same total time.
 */
export const TOTAL = 8.2
const MENU_CUE = 7.5
/** The flat LCD green (#9bbc0f, = --gb3 behind the menu) fully covers the frame from here on. */
const FLAT_FROM = 6.92
const FLAT_AT = 7.15

let fontLoad: Promise<void> | null = null
function loadPixelFont(): Promise<void> {
  if (!fontLoad) {
    fontLoad = (async () => {
      try {
        const face = new FontFace('OpenPx', `url(${import.meta.env.BASE_URL}fonts/PressStart2P.ttf)`)
        await face.load()
        document.fonts.add(face)
      } catch {
        /* falls back to the page's pixel font */
      }
    })()
  }
  return fontLoad
}

// Static film grain (rendered once by the browser from an inline SVG), jittered per frame for a filmic feel.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter><rect width="160" height="160" filter="url(#n)"/></svg>',
)}")`

/** Reduced motion: [camera time, scene time] for the three still shots. */
const SHOTS = {
  A: [0.5, 0.5],
  B: [5.0, 6.2],
  C: [6.55, 6.55],
} as const

export default function Opening({
  onReady,
  onMenuCue,
  onDone,
}: {
  onReady: () => void
  onMenuCue: () => void
  onDone: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const vigRef = useRef<HTMLDivElement>(null)
  const grainRef = useRef<HTMLDivElement>(null)
  const flatRef = useRef<HTMLDivElement>(null)
  const cbs = useRef({ onReady, onMenuCue, onDone })
  useEffect(() => {
    cbs.current = { onReady, onMenuCue, onDone }
  })

  useEffect(() => {
    const el = host.current
    const stage = stageRef.current
    const vig = vigRef.current
    const grain = grainRef.current
    const flat = flatRef.current
    if (!el || !stage || !vig || !grain || !flat) return
    void loadPixelFont()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const debug = Number(new URLSearchParams(window.location.search).get('t'))
    const frozen = debug > 0
    const insts: Instance[] = Array.from({ length: reduced ? 2 : 1 }, (_, i) => createInstance(stage, i))
    let view: View = makeView(1, 1)
    let last = frozen ? debug : 0
    let reducedKey = ''

    const overlays = (t: number) => {
      const fl = smooth(seg(t, reduced ? 6.9 : FLAT_FROM, reduced ? 7.3 : FLAT_AT))
      flat.style.opacity = fl.toFixed(3)
      stage.style.visibility = fl >= 1 ? 'hidden' : ''
      vig.style.opacity = (1 - seg(t, 6.2, 6.9)).toFixed(3)
      grain.style.opacity = (0.07 * (1 - seg(t, 6.6, 7.0))).toFixed(3)
      if (!reduced) {
        const j = Math.floor(t * 12)
        grain.style.transform = `translate(${Math.round(hash1(j) * 60 - 30)}px, ${Math.round(hash1(j + 99) * 60 - 30)}px)`
      }
    }

    const draw = (t: number) => {
      last = t
      if (!reduced) {
        renderFrame(insts[0], view, t, t, false)
      } else {
        // bottom copy: shot A, then shot C; top copy: shot B, faded in over A and out to reveal C
        const first = t < 3.4
        const key = `${first}`
        if (key !== reducedKey) {
          reducedKey = key
          const s0 = first ? SHOTS.A : SHOTS.C
          renderFrame(insts[0], view, s0[0], s0[1], true)
          renderFrame(insts[1], view, SHOTS.B[0], SHOTS.B[1], true)
        }
        const o = first ? smooth(seg(t, 2.4, 3.4)) : 1 - smooth(seg(t, 5.2, 6.2))
        insts[1].svg.style.opacity = o.toFixed(3)
      }
      overlays(t)
    }

    const resize = () => {
      view = makeView(el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight)
      insts.forEach((it, i) => setSky(it, view, i))
      reducedKey = ''
      draw(last)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let alive = true
    // the first frame is in the DOM now; tell the gate once it has actually been painted
    raf = requestAnimationFrame(() => {
      if (!alive) return
      cbs.current.onReady()
      if (frozen) {
        if (debug >= MENU_CUE) cbs.current.onMenuCue()
        return
      }
      const t0 = performance.now()
      let cued = false
      const tick = (now: number) => {
        if (!alive) return
        const t = Math.min(TOTAL, (now - t0) / 1000)
        draw(t)
        if (!cued && t >= MENU_CUE) {
          cued = true
          cbs.current.onMenuCue()
        }
        if (t >= TOTAL) {
          cbs.current.onDone()
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      stage.replaceChildren()
    }
  }, [])

  return (
    <div ref={host} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#070814' }}>
      <div ref={stageRef} style={{ position: 'absolute', inset: 0 }} />
      <div
        ref={vigRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 48%, rgba(4,3,12,0) 52%, rgba(4,3,12,.62) 100%)',
        }}
      />
      <div
        ref={grainRef}
        style={{
          position: 'absolute',
          inset: -40,
          pointerEvents: 'none',
          backgroundImage: GRAIN,
          backgroundSize: '160px 160px',
          mixBlendMode: 'overlay',
          opacity: 0.07,
        }}
      />
      <div ref={flatRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#9bbc0f', opacity: 0 }} />
    </div>
  )
}
