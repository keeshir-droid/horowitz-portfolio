import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

/**
 * The opening: one continuous camera move, driven by a single clock `state.t`.
 *   A  0.0 – 3.4s   outside the window  -> into the room
 *   B  3.4 – 5.8s   over the kid's shoulder, down to the Game Boy
 *   C  5.8 – 8.0s   push into the Game Boy screen (the screen is a live canvas texture)
 * Everything is procedural: no model/texture downloads, so it starts fast.
 */
export const TOTAL = 8.2
const MENU_CUE = 7.5

const GB = { g0: '#0f380f', g1: '#306230', g2: '#8bac0f', g3: '#9bbc0f' }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)
const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))

// Game Boy geometry (world space). The screen faces the kid: normal = (0, .6, .8).
const GB_POS = V(0.5, 0.82, -3.25)
const GB_TILT = -Math.atan2(0.6, 0.8)
const GB_NORMAL = V(0, 0.6, 0.8)
const GB_UP = V(0, 0.8, -0.6)
const SCREEN_C = GB_POS.clone().add(V(0, 0.03, 0.03))

const P = [V(0, 1.75, 10), V(0, 1.7, -0.4), V(1.15, 1.5, -2.4), SCREEN_C.clone().add(GB_NORMAL.clone().multiplyScalar(0.17))]
const L = [V(0, 1.75, -1), V(0.4, 1.2, -3), SCREEN_C.clone().add(V(0, 0, -0.1)), SCREEN_C.clone()]

interface Clock {
  t: number
}

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

function Stars() {
  const positions = useMemo(() => {
    const n = 700
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 60 + Math.random() * 20
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(Math.random() * 0.9 + 0.05)
      a[i * 3] = r * Math.sin(ph) * Math.cos(th)
      a[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.8 + 3
      a[i * 3 + 2] = Math.abs(r * Math.sin(ph) * Math.sin(th)) + 8
    }
    return a
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#cfd8ff" size={0.18} sizeAttenuation fog={false} />
    </points>
  )
}

function Box({
  p,
  s,
  c,
  emissive,
  ei = 0,
  r,
}: {
  p: [number, number, number]
  s: [number, number, number]
  c: string
  emissive?: string
  ei?: number
  r?: [number, number, number]
}) {
  return (
    <mesh position={p} rotation={r}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={emissive ?? '#000'} emissiveIntensity={ei} roughness={0.9} />
    </mesh>
  )
}

function Limb({ a, b, r = 0.055, c }: { a: THREE.Vector3; b: THREE.Vector3; r?: number; c: string }) {
  const { pos, quat, len } = useMemo(() => {
    const dir = b.clone().sub(a)
    const l = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize())
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat: q, len: l }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 10]} />
      <meshStandardMaterial color={c} roughness={0.8} />
    </mesh>
  )
}

function Room() {
  const wall = '#3a3560'
  const poster = ['#ff5d73', '#4cc9f0', '#ffc857', '#9bbc0f']
  return (
    <group>
      {/* outside ground + skyline */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.25, 6]}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#0b0c1c" roughness={1} />
      </mesh>
      {[-26, -18, 18, 26, 34, -34].map((x, i) => (
        <Box key={i} p={[x, 5 + (i % 3) * 2.5, -22]} s={[5, 10 + (i % 3) * 5, 4]} c="#0a0b1e" emissive="#1b1d46" ei={0.7} />
      ))}
      {/* moon */}
      <mesh position={[-9, 11, 14]}>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshBasicMaterial color="#f4f1e8" fog={false} />
      </mesh>

      {/* shell: front wall has a window hole x[-1.2,1.2] y[1,2.5] */}
      <Box p={[-2.7, 1.6, 0]} s={[3, 3.2, 0.2]} c={wall} />
      <Box p={[2.7, 1.6, 0]} s={[3, 3.2, 0.2]} c={wall} />
      <Box p={[0, 0.5, 0]} s={[2.4, 1, 0.2]} c={wall} />
      <Box p={[0, 2.85, 0]} s={[2.4, 0.7, 0.2]} c={wall} />
      <Box p={[-4.1, 1.6, -3]} s={[0.2, 3.2, 6.2]} c={wall} />
      <Box p={[4.1, 1.6, -3]} s={[0.2, 3.2, 6.2]} c={wall} />
      <Box p={[0, 1.6, -6.1]} s={[8.4, 3.2, 0.2]} c="#443d72" />
      <Box p={[0, -0.1, -3]} s={[8.4, 0.2, 6.4]} c="#5b3f2e" />
      <Box p={[0, 3.3, -3]} s={[8.4, 0.2, 6.4]} c="#2b2750" />
      {/* window frame + sill */}
      <Box p={[0, 1.0, 0.05]} s={[2.6, 0.08, 0.3]} c="#e9e2cf" />
      <Box p={[0, 2.5, 0.05]} s={[2.6, 0.08, 0.2]} c="#e9e2cf" />
      <Box p={[-1.2, 1.75, 0.05]} s={[0.08, 1.5, 0.2]} c="#e9e2cf" />
      <Box p={[1.2, 1.75, 0.05]} s={[0.08, 1.5, 0.2]} c="#e9e2cf" />

      {/* props */}
      <mesh position={[0.2, 0.01, -3.2]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.6, 40]} />
        <meshStandardMaterial color="#7a3b5e" roughness={1} />
      </mesh>
      <Box p={[-3.1, 0.35, -4.6]} s={[1.6, 0.5, 2.2]} c="#2f5d8a" />
      <Box p={[-3.1, 0.65, -4.9]} s={[1.5, 0.12, 1.4]} c="#e9e2cf" />
      <Box p={[3.0, 0.7, -5.4]} s={[1.8, 0.1, 1.0]} c="#6b4a35" />
      <Box p={[3.0, 0.35, -5.4]} s={[0.1, 0.7, 0.9]} c="#4a3324" />
      {/* CRT + glow */}
      <Box p={[0.2, 0.55, -5.6]} s={[1.5, 1.1, 0.9]} c="#1b1b24" />
      <mesh position={[0.2, 0.62, -5.14]}>
        <planeGeometry args={[1.15, 0.85]} />
        <meshBasicMaterial color="#7fd6ff" toneMapped={false} />
      </mesh>
      <Box p={[3.0, 0.98, -5.4]} s={[0.5, 0.35, 0.4]} c="#cfc9b8" />
      {/* posters (placeholders: swap for real art) */}
      {poster.map((c, i) => (
        <mesh key={i} position={[-3 + i * 1.7 + (i > 1 ? 0.6 : 0), 1.9 + (i % 2) * 0.35, -5.98]}>
          <planeGeometry args={[1.0, 1.4]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
      <Box p={[3.98, 2.0, -2.2]} s={[0.02, 0.9, 1.3]} c="#ffc857" emissive="#ffc857" ei={0.2} />
      {/* lamp */}
      <mesh position={[-3.0, 1.15, -5.4]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffd89a" toneMapped={false} />
      </mesh>

      <pointLight position={[-3, 1.4, -5.2]} color="#ffb870" intensity={14} distance={9} decay={1.6} />
      <pointLight position={[0.2, 0.9, -4.6]} color="#7fd6ff" intensity={6} distance={7} decay={1.6} />
      <pointLight position={[0.5, 2.8, -1.2]} color="#ffe2b8" intensity={5} distance={8} decay={1.6} />
      <ambientLight intensity={0.5} color="#8a86c9" />
    </group>
  )
}

function Kid({ visible }: { visible: React.RefObject<boolean> }) {
  const g = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const skin = '#d9a67a'
  const shirt = '#ff5d73'
  const handL = V(0.38, 0.8, -3.22)
  const handR = V(0.62, 0.8, -3.22)
  useFrame(({ clock }) => {
    if (g.current) g.current.visible = visible.current
    if (head.current) head.current.rotation.x = Math.sin(clock.elapsedTime * 1.6) * 0.04 + 0.12
  })
  return (
    <group ref={g}>
      <mesh position={[0.5, 0.25, -2.75]} scale={[1.2, 0.7, 1.1]}>
        <sphereGeometry args={[0.45, 20, 20]} />
        <meshStandardMaterial color="#4cc9f0" roughness={1} />
      </mesh>
      <Box p={[0.5, 0.68, -2.9]} s={[0.42, 0.5, 0.26]} c={shirt} />
      <group ref={head} position={[0.5, 1.16, -2.9]}>
        <mesh>
          <sphereGeometry args={[0.17, 20, 20]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.03, 0.03]} scale={[1, 0.95, 1]}>
          <sphereGeometry args={[0.185, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color="#201a2e" roughness={1} />
        </mesh>
      </group>
      <Limb a={V(0.27, 0.86, -2.9)} b={handL} c={skin} />
      <Limb a={V(0.73, 0.86, -2.9)} b={handR} c={skin} />
      <Limb a={V(0.4, 0.4, -2.9)} b={V(0.4, 0.12, -2.4)} r={0.07} c="#2a2a52" />
      <Limb a={V(0.6, 0.4, -2.9)} b={V(0.6, 0.12, -2.4)} r={0.07} c="#2a2a52" />
    </group>
  )
}

function Gameboy({ clock }: { clock: Clock }) {
  const { texture, ctx } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 144
    const tex = new THREE.CanvasTexture(c)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.colorSpace = THREE.SRGBColorSpace
    return { texture: tex, ctx: c.getContext('2d')! }
  }, [])
  useFrame(() => {
    drawScreen(ctx, clock.t)
    texture.needsUpdate = true
  })
  return (
    <group position={GB_POS} rotation={[GB_TILT, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.2, 0.32, 0.05]} />
        <meshStandardMaterial color="#c9c4b4" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0.0255]}>
        <planeGeometry args={[0.17, 0.12]} />
        <meshStandardMaterial color="#51506a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.06, 0.0262]}>
        <planeGeometry args={[0.12, 0.108]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[-0.05, -0.07, 0.027]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>
      <mesh position={[0.055, -0.065, 0.027]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 0.012, 12]} />
        <meshStandardMaterial color="#a11d4b" />
      </mesh>
      <mesh position={[0.025, -0.08, 0.027]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 0.012, 12]} />
        <meshStandardMaterial color="#a11d4b" />
      </mesh>
    </group>
  )
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
    <>
      <color attach="background" args={['#070814']} />
      <fog attach="fog" args={['#070814', 22, 60]} />
      <Stars />
      <Room />
      <Kid visible={kidVisible} />
      <Gameboy clock={clock} />
      <Rig clock={clock} kidVisible={kidVisible} />
    </>
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
      camera={{ fov: 55, near: 0.02, far: 200, position: [0, 1.75, 10] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene clock={clock} onFirstFrame={start} />
    </Canvas>
  )
}
