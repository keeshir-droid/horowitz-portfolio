import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { KitProvider } from './opening3d/kit'
import Exterior from './opening3d/Exterior'
import Room from './opening3d/Room'
import Kid from './opening3d/Kid'
import Handheld from './opening3d/Handheld'
import { GB_NORMAL, GB_POS, GB_UP, V, type Clock } from './opening3d/util'

/**
 * The opening: one continuous camera move, driven by a single clock `state.t`.
 *   A  0.0 – 3.4s   outside the window  -> into the room
 *   B  3.4 – 5.8s   over the kid's shoulder, down to the Game Boy
 *   C  5.8 – 8.0s   push into the Game Boy screen (the screen is a live canvas texture)
 * Everything is procedural (rounded primitives + CanvasTextures): no model/texture downloads,
 * so it starts fast. The set pieces live in ./opening3d/ (Exterior, Room, Kid, Handheld).
 */
export const TOTAL = 8.2
const MENU_CUE = 7.5

const GB = { g0: '#0f380f', g1: '#306230', g2: '#8bac0f', g3: '#9bbc0f' }

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)
const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))

// Handheld geometry lives in ./opening3d/util (screen normal (0, .6, .8), facing the kid).
const SCREEN_C = GB_POS.clone().add(V(0, 0.03, 0.03))

const P = [V(0, 1.75, 10), V(0, 1.7, -0.4), V(1.15, 1.5, -2.4), SCREEN_C.clone().add(GB_NORMAL.clone().multiplyScalar(0.17))]
const L = [V(0, 1.75, -1), V(0.4, 1.2, -3), SCREEN_C.clone().add(V(0, 0, -0.1)), SCREEN_C.clone()]

function drawScreen(ctx: CanvasRenderingContext2D, t: number) {
  const W = 160
  const H = 144
  ctx.fillStyle = GB.g3
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = GB.g0

  // boot logo drops in, then holds
  const drop = seg(t, 4.6, 5.9)
  if (t < 7.0) {
    const y = -10 + (H / 2 - 4 + 10) * easeInOut(drop)
    ctx.font = '16px "Press Start 2P", monospace'
    ctx.fillText('NAWKA', W / 2, y)
    if (drop >= 1) {
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText('(c) 2007 R.N. CORP', W / 2, H / 2 + 16)
    }
    return
  }
  // after the boot logo the screen stays blank green: the DOM menu fades in over it
}

function Rig({ clock, kidVisible }: { clock: Clock; kidVisible: React.RefObject<boolean> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const look = useMemo(() => V(0, 0, 0), [])
  const up = useMemo(() => V(0, 1, 0), [])
  useFrame(({ clock: c }) => {
    const t = clock.t
    const a = easeInOut(seg(t, 0, 3.4))
    const b = easeInOut(seg(t, 3.4, 5.8))
    const cc = easeInOutCubic(seg(t, 5.8, 8.0))
    let pos: THREE.Vector3
    let lk: THREE.Vector3
    let fov: number
    if (t < 3.4) {
      pos = P[0].clone().lerp(P[1], a)
      lk = L[0].clone().lerp(L[1], a)
      fov = 55
    } else if (t < 5.8) {
      pos = P[1].clone().lerp(P[2], b)
      lk = L[1].clone().lerp(L[2], b)
      fov = 55 - 5 * b
    } else {
      pos = P[2].clone().lerp(P[3], cc)
      lk = L[2].clone().lerp(L[3], cc)
      fov = 50 - 12 * cc
    }
    // a little handheld drift, fading out as we lock onto the screen
    const drift = 1 - cc
    pos.x += Math.sin(c.elapsedTime * 0.9) * 0.025 * drift
    pos.y += Math.cos(c.elapsedTime * 1.3) * 0.02 * drift
    up.set(0, 1, 0).lerp(GB_UP, cc).normalize()
    camera.up.copy(up)
    camera.position.copy(pos)
    look.copy(lk)
    camera.lookAt(look)
    camera.fov = fov
    camera.near = 0.02
    camera.updateProjectionMatrix()
    kidVisible.current = t < 7.2
  })
  return null
}

function Moonlight() {
  // Cheated "movie moon": the moon sits in the sky behind the house, but its cool light comes
  // from front-left so it rakes the brick, throws the tree onto the façade and lays the window's
  // shape across the floor and the kid's back.
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0.5, 0, -3)
    return o
  }, [])
  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={[-5.5, 9, 9.5]}
        target={target}
        color="#9db2ff"
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
      />
    </>
  )
}

/** DEV only: expose draw calls / triangles for perf checks (window.__opening). */
function Stats() {
  useFrame(({ gl }) => {
    ;(window as unknown as { __opening?: object }).__opening = { calls: gl.info.render.calls, tris: gl.info.render.triangles }
  })
  return null
}

function Scene({ clock, onFirstFrame }: { clock: Clock; onFirstFrame: () => void }) {
  const kidVisible = useRef(true)
  const fired = useRef(false)
  useFrame(() => {
    if (!fired.current) {
      fired.current = true
      onFirstFrame()
    }
  })
  return (
    <KitProvider>
      <color attach="background" args={['#070814']} />
      <fog attach="fog" args={['#0a0d22', 18, 75]} />
      <Exterior />
      <Room clock={clock} />
      <Kid clock={clock} visible={kidVisible} />
      <Handheld clock={clock} draw={drawScreen} />
      <Moonlight />
      <Rig clock={clock} kidVisible={kidVisible} />
      {import.meta.env.DEV && <Stats />}
    </KitProvider>
  )
}

export default function Opening({
  onReady,
  onMenuCue,
  onDone,
}: {
  onReady: () => void
  onMenuCue: () => void
  onDone: () => void
}) {
  const clock = useRef<Clock>({ t: 0 }).current
  const started = useRef(false)
  const tl = useRef<gsap.core.Tween | null>(null)

  const start = () => {
    if (started.current) return
    started.current = true
    onReady()
    let cued = false
    // ?t=5 jumps the opening to a moment (for tuning shots)
    const debug = Number(new URLSearchParams(window.location.search).get('t'))
    if (debug > 0) {
      clock.t = debug
      if (debug >= MENU_CUE) onMenuCue()
      return
    }
    tl.current = gsap.to(clock, {
      t: TOTAL,
      duration: TOTAL,
      ease: 'none',
      onUpdate: () => {
        if (!cued && clock.t >= MENU_CUE) {
          cued = true
          onMenuCue()
        }
      },
      onComplete: onDone,
    })
  }

  useEffect(() => () => void tl.current?.kill(), [])

  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 55, near: 0.02, far: 260, position: [0, 1.75, 10] }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene clock={clock} onFirstFrame={start} />
    </Canvas>
  )
}
