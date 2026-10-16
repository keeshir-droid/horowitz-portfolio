import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Ball, Blob, Glow, Merge, RBox, Rod, WBox, useKit } from './kit'
import { V, rng, worldUV, type Vec3 } from './util'

/**
 * Shot A: the house at night. The room's front wall is part of the brick façade; its window
 * (x -1.2..1.2, y 1..2.5) is the hole the camera flies through, so nothing crosses
 * x |0.95|, y 1.05..2.15 between z 2 and z -0.4.
 */

const FACADE = { x0: -7.5, x1: 7.5, y0: -0.25, y1: 3.9, z0: -0.1, z1: 0.2 }
const WIN = { x0: -1.2, x1: 1.2, y0: 1, y1: 2.5 }

function Sky() {
  const k = useKit()
  const dome = useMemo(() => {
    const g = new THREE.SphereGeometry(120, 32, 16)
    const p = g.attributes.position
    const col = new Float32Array(p.count * 3)
    const lo = new THREE.Color('#1c2350')
    const mid = new THREE.Color('#0c1030')
    const hi = new THREE.Color('#04050d')
    const c = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) / 120
      if (h < 0.12) c.copy(lo).lerp(mid, Math.max(0, h) / 0.12)
      else c.copy(mid).lerp(hi, Math.min(1, (h - 0.12) / 0.6))
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [])
  const stars = useMemo(() => {
    const r = rng(7)
    const mk = (n: number) => {
      const a = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        const R = 100
        const az = (r() - 0.5) * Math.PI * 1.7 // centred on -z (in front of the camera)
        const el = Math.asin(0.06 + r() * 0.92)
        a[i * 3] = R * Math.cos(el) * Math.sin(az)
        a[i * 3 + 1] = R * Math.sin(el)
        a[i * 3 + 2] = -R * Math.cos(el) * Math.cos(az)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(a, 3))
      return g
    }
    return [mk(900), mk(90)]
  }, [])
  useEffect(
    () => () => {
      dome.dispose()
      stars.forEach((s) => s.dispose())
    },
    [dome, stars],
  )
  return (
    <group>
      <mesh geometry={dome} renderOrder={-10}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <points geometry={stars[0]}>
        <pointsMaterial color="#c9d3ff" size={0.32} sizeAttenuation fog={false} transparent opacity={0.8} depthWrite={false} />
      </points>
      <points geometry={stars[1]}>
        <pointsMaterial color="#fff6e0" size={0.7} sizeAttenuation fog={false} depthWrite={false} />
      </points>
      {/* moon + halo, up and left of the roof */}
      <mesh position={[-11, 24, -52]}>
        <sphereGeometry args={[2.3, 32, 16]} />
        <meshBasicMaterial map={k.tex.moon} color="#fffbea" fog={false} toneMapped={false} />
      </mesh>
      <Glow p={[-11, 24, -51]} s={22} color="#7f93d6" o={0.55} />
    </group>
  )
}

/** Two casement sashes, opened outward. `side` -1 = left, 1 = right. */
function Sash({ side }: { side: -1 | 1 }) {
  const w = 1.15
  const h = 1.11
  const f = 0.055
  const d = 0.045
  const k = useKit()
  const x = (v: number) => -side * v // build from the hinge toward the centre
  return (
    <group position={[side * 1.17, 1.06, FACADE.z1 - 0.02]} rotation={[0, side * 1.38, 0]}>
      <RBox p={[x(f / 2), h / 2, 0]} s={[f, h, d]} rad={0.008} m="trim" cast />
      <RBox p={[x(w - f / 2), h / 2, 0]} s={[f, h, d]} rad={0.008} m="trim" cast />
      <RBox p={[x(w / 2), f / 2, 0]} s={[w, f, d]} rad={0.008} m="trim" cast />
      <RBox p={[x(w / 2), h - f / 2, 0]} s={[w, f, d]} rad={0.008} m="trim" cast />
      {/* glazing bars */}
      <RBox p={[x(w / 2), h / 2, 0]} s={[0.026, h, 0.03]} rad={0.006} m="trim" cast />
      <RBox p={[x(w / 2), h / 2, 0]} s={[w, 0.026, 0.03]} rad={0.006} m="trim" cast />
      <mesh position={[x(w / 2), h / 2, 0]} material={k.mat.glass}>
        <planeGeometry args={[w - f, h - f]} />
      </mesh>
      <RBox p={[x(w - 0.03), h / 2, 0.04]} s={[0.018, 0.09, 0.018]} rad={0.006} m="brass" />
    </group>
  )
}

function MainWindow() {
  const k = useKit()
  const z = FACADE.z1
  return (
    <group>
      {/* casing */}
      <RBox p={[0, WIN.y1 + 0.06, z + 0.02]} s={[2.66, 0.12, 0.05]} rad={0.01} m="trim" cast />
      <RBox p={[-1.27, 1.75, z + 0.02]} s={[0.12, 1.5, 0.05]} rad={0.01} m="trim" cast />
      <RBox p={[1.27, 1.75, z + 0.02]} s={[0.12, 1.5, 0.05]} rad={0.01} m="trim" cast />
      {/* stone lintel + sill */}
      <RBox p={[0, WIN.y1 + 0.2, z + 0.02]} s={[2.95, 0.16, 0.07]} rad={0.012} m="stone" cast />
      <group position={[0, 0.95, 0.24]} rotation={[0.08, 0, 0]}>
        <RBox p={[0, 0, 0]} s={[2.9, 0.08, 0.32]} rad={0.012} m="trim" cast />
      </group>
      {/* frame in the opening: head, transom, sill board */}
      <RBox p={[0, WIN.y1 - 0.03, 0.12]} s={[2.4, 0.06, 0.12]} rad={0.006} m="trim" cast />
      <RBox p={[0, 2.19, 0.12]} s={[2.4, 0.06, 0.1]} rad={0.006} m="trim" cast />
      <RBox p={[0, 2.34, 0.12]} s={[0.04, 0.26, 0.06]} rad={0.006} m="trim" cast />
      <RBox p={[0, WIN.y0 + 0.03, 0.12]} s={[2.4, 0.06, 0.14]} rad={0.006} m="trim" cast />
      <RBox p={[-1.17, 1.75, 0.12]} s={[0.06, 1.5, 0.12]} rad={0.006} m="trim" cast />
      <RBox p={[1.17, 1.75, 0.12]} s={[0.06, 1.5, 0.12]} rad={0.006} m="trim" cast />
      {/* fixed transom glass */}
      <mesh position={[0, 2.345, 0.12]} material={k.mat.glass}>
        <planeGeometry args={[2.28, 0.25]} />
      </mesh>
      <Sash side={-1} />
      <Sash side={1} />
      {/* window box with flowers under the sill */}
      <RBox p={[0, 0.78, 0.36]} s={[1.6, 0.2, 0.22]} rad={0.02} m="woodDark" cast />
      {[-0.6, -0.35, -0.1, 0.15, 0.4, 0.62].map((x, i) => (
        <Ball key={i} p={[x, 0.92, 0.36]} r={0.11} sc={[1.2, 0.8, 1]} m="foliage" seg={8} cast />
      ))}
      {[-0.5, -0.2, 0.25, 0.52].map((x, i) => (
        <Ball key={i} p={[x, 1.0, 0.42]} r={0.03} m={i % 2 ? 'toyYellow' : 'toyRed'} seg={8} />
      ))}
    </group>
  )
}

/** A neighbouring window on the same façade (curtains drawn, lamp on behind). */
function SideWindow({ x, warm }: { x: number; warm: boolean }) {
  const k = useKit()
  const z = FACADE.z1
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.75, z + 0.005]}>
        <planeGeometry args={[1.1, 1.3]} />
        <meshBasicMaterial map={warm ? k.tex.litWarm : k.tex.litCool} color={warm ? '#c08a60' : '#8090c0'} toneMapped={false} />
      </mesh>
      <RBox p={[0, 1.75, z + 0.02]} s={[0.04, 1.3, 0.04]} rad={0.008} m="trim" />
      <RBox p={[0, 1.95, z + 0.02]} s={[1.1, 0.04, 0.04]} rad={0.008} m="trim" />
      <RBox p={[0, 2.44, z + 0.03]} s={[1.3, 0.1, 0.06]} rad={0.01} m="trim" cast />
      <RBox p={[0, 1.06, z + 0.03]} s={[1.3, 0.1, 0.06]} rad={0.01} m="trim" cast />
      <RBox p={[-0.6, 1.75, z + 0.03]} s={[0.1, 1.3, 0.06]} rad={0.01} m="trim" cast />
      <RBox p={[0.6, 1.75, z + 0.03]} s={[0.1, 1.3, 0.06]} rad={0.01} m="trim" cast />
      <RBox p={[0, 0.97, z + 0.12]} s={[1.45, 0.07, 0.24]} rad={0.01} m="trim" cast />
      <RBox p={[0, 2.62, z + 0.02]} s={[1.6, 0.14, 0.07]} rad={0.012} m="stone" />
    </group>
  )
}

function FrontDoor() {
  const z = FACADE.z1
  return (
    <group position={[5.4, 0, 0]}>
      <RBox p={[0, 0.98, z + 0.02]} s={[1.0, 2.28, 0.06]} rad={0.012} m="door" cast />
      {[
        [-0.22, 1.55],
        [0.22, 1.55],
        [-0.22, 0.6],
        [0.22, 0.6],
      ].map(([x, y], i) => (
        <RBox key={i} p={[x, y, z + 0.055]} s={[0.34, 0.7, 0.02]} rad={0.01} m="door" />
      ))}
      <Ball p={[0.38, 1.02, z + 0.09]} r={0.035} m="brass" seg={12} />
      <RBox p={[0, 2.18, z + 0.03]} s={[1.24, 0.12, 0.08]} rad={0.01} m="trim" cast />
      <RBox p={[-0.56, 0.98, z + 0.03]} s={[0.12, 2.3, 0.08]} rad={0.01} m="trim" cast />
      <RBox p={[0.56, 0.98, z + 0.03]} s={[0.12, 2.3, 0.08]} rad={0.01} m="trim" cast />
      {/* step */}
      <RBox p={[0, -0.18, z + 0.32]} s={[1.5, 0.16, 0.6]} rad={0.02} m="stone" cast />
      {/* wall lantern */}
      <RBox p={[0.88, 1.95, z + 0.1]} s={[0.16, 0.26, 0.16]} rad={0.02} m="metalDark" />
      <mesh position={[0.88, 1.95, z + 0.185]}>
        <planeGeometry args={[0.1, 0.18]} />
        <meshBasicMaterial color="#ffd08a" toneMapped={false} />
      </mesh>
      <Glow p={[0.88, 1.95, z + 0.25]} s={1.4} color="#ffb060" o={0.7} />
      <Glow p={[0.88, 1.95, z + 0.24]} s={0.4} color="#fff0c0" o={0.9} />
    </group>
  )
}

function Facade() {
  const k = useKit()
  const { x0, x1, y0, y1, z0, z1 } = FACADE
  const d = z1 - z0
  const zc = (z0 + z1) / 2
  // [reveal x4, brick (+z), wallpaper (-z)]
  const mats = useMemo(() => [k.mat.plaster, k.mat.plaster, k.mat.plaster, k.mat.plaster, k.mat.brick, k.mat.wallSide], [k])
  const pieces: [Vec3, Vec3][] = [
    [[(x0 + WIN.x0) / 2, (y0 + y1) / 2, zc], [WIN.x0 - x0, y1 - y0, d]],
    [[(x1 + WIN.x1) / 2, (y0 + y1) / 2, zc], [x1 - WIN.x1, y1 - y0, d]],
    [[0, (y0 + WIN.y0) / 2, zc], [WIN.x1 - WIN.x0, WIN.y0 - y0, d]],
    [[0, (WIN.y1 + y1) / 2, zc], [WIN.x1 - WIN.x0, y1 - WIN.y1, d]],
  ]
  return (
    <group>
      {pieces.map(([p, s], i) => (
        <WBox key={i} p={p} s={s} mats={mats} cast />
      ))}
      {/* house sides + back so the moon can't leak in */}
      <WBox p={[x0 + 0.1, 1.8, -3.4]} s={[0.2, 4.1, 7]} m="brick" cast />
      <WBox p={[x1 - 0.1, 1.8, -3.4]} s={[0.2, 4.1, 7]} m="brick" cast />
      {/* plinth */}
      <WBox p={[0, -0.08, z1 + 0.03]} s={[x1 - x0 + 0.1, 0.34, 0.06]} m="stone" cast />
      {/* eaves: fascia + gutter */}
      <WBox p={[0, y1 + 0.06, z1 + 0.42]} s={[x1 - x0 + 1.2, 0.2, 0.06]} m="trim" cast />
      <mesh position={[0, y1 + 0.02, z1 + 0.5]} rotation={[0, 0, Math.PI / 2]} material={k.mat.gutter}>
        <cylinderGeometry args={[0.06, 0.06, x1 - x0 + 1.2, 10, 1, true, 0, Math.PI]} />
      </mesh>
      <Rod a={V(x1 + 0.3, y1, z1 + 0.5)} b={V(x1 + 0.3, -0.25, z1 + 0.2)} r={0.035} m="gutter" />
      <Roof />
      <MainWindow />
      <SideWindow x={-5.1} warm={false} />
      <FrontDoor />
    </group>
  )
}

function Roof() {
  const k = useKit()
  const ridgeY = 5.55
  const ridgeZ = -3.1
  const eaveY = FACADE.y1 + 0.1
  const eaveZ = FACADE.z1 + 0.45
  const len = Math.hypot(ridgeY - eaveY, eaveZ - ridgeZ)
  const ang = Math.atan2(ridgeY - eaveY, eaveZ - ridgeZ)
  const g = useMemo(() => {
    const geo = new THREE.BoxGeometry(17.2, 0.12, len + 0.1)
    // UVs in metres along the slope so the shingles keep their size
    const p = geo.attributes.position
    const uv = geo.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i))
    return geo
  }, [len])
  useEffect(() => () => g.dispose(), [g])
  return (
    <group>
      <mesh
        geometry={g}
        material={k.mat.roof}
        position={[0, (ridgeY + eaveY) / 2, (ridgeZ + eaveZ) / 2]}
        rotation={[ang, 0, 0]}
        castShadow
        receiveShadow
      />
      <mesh geometry={g} material={k.mat.roof} position={[0, (ridgeY + eaveY) / 2, ridgeZ - (eaveZ - ridgeZ) / 2]} rotation={[-ang, 0, 0]} castShadow />
      <RBox p={[0, ridgeY + 0.04, ridgeZ]} s={[17.3, 0.12, 0.22]} rad={0.04} m="stone" />
      {/* chimney */}
      <WBox p={[3.6, 5.3, -2.2]} s={[0.7, 2.2, 0.7]} m="brick" cast />
      <RBox p={[3.6, 6.45, -2.2]} s={[0.84, 0.12, 0.84]} rad={0.02} m="stone" />
      {/* gable ends */}
      {[FACADE.x0 + 0.1, FACADE.x1 - 0.1].map((x, i) => (
        <mesh key={i} position={[x, eaveY - 0.1, ridgeZ]} rotation={[0, Math.PI / 2, 0]} material={k.mat.brick} castShadow>
          <shapeGeometry args={[gable(eaveZ - ridgeZ, ridgeY - eaveY + 0.1)]} />
        </mesh>
      ))}
    </group>
  )
}

function gable(halfW: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(-halfW, 0)
  s.lineTo(halfW, 0)
  s.lineTo(0, h)
  s.closePath()
  return s
}

function Garden() {
  const k = useKit()
  const ground = useMemo(() => {
    const mk = (w: number, d: number, p: Vec3) => {
      const g = new THREE.PlaneGeometry(w, d)
      g.rotateX(-Math.PI / 2)
      return worldUV(g, p)
    }
    return {
      lawn: mk(90, 32, [0, -0.25, -10]),
      walk: mk(1.1, 6, [5.4, -0.245, 3.2]),
      pave: mk(90, 1.8, [0, -0.2, 7]),
      road: mk(90, 30, [0, -0.3, 23]),
    }
  }, [])
  useEffect(() => () => Object.values(ground).forEach((g) => g.dispose()), [ground])
  const bushes: [number, number, number][] = [
    [-3.6, 0.5, 0.75],
    [-2.7, 0.45, 0.65],
    [-1.6, 0.4, 0.55],
    [1.7, 0.42, 0.6],
    [2.6, 0.5, 0.7],
    [3.5, 0.45, 0.62],
    [-6.6, 0.5, 0.8],
    [6.8, 0.42, 0.6],
  ]
  return (
    <group>
      <mesh geometry={ground.lawn} material={k.mat.grass} position={[0, -0.25, -10]} receiveShadow />
      <mesh geometry={ground.walk} material={k.mat.concrete} position={[5.4, -0.245, 3.2]} receiveShadow />
      <mesh geometry={ground.pave} material={k.mat.concrete} position={[0, -0.2, 7]} receiveShadow />
      <mesh geometry={ground.road} material={k.mat.asphalt} position={[0, -0.3, 23]} />
      <WBox p={[0, -0.22, 6.08]} s={[90, 0.12, 0.16]} m="stone" />
      {bushes.map(([x, r, sy], i) => (
        <group key={i}>
          <Ball p={[x, -0.25 + r * 0.6, 0.62]} r={r} sc={[1.3, sy * 1.4, 1]} m={i % 2 ? 'foliage' : 'foliageDark'} seg={12} cast />
          <Ball p={[x + 0.35, -0.25 + r * 0.45, 0.8]} r={r * 0.7} sc={[1.2, 1, 1]} m="foliage" seg={12} cast />
        </group>
      ))}
      <Tree x={-7.4} z={2.6} />
      <LampPost x={4.4} z={4.4} />
    </group>
  )
}

function Tree({ x, z }: { x: number; z: number }) {
  const clumps = useMemo(() => {
    const r = rng(17)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2
      const rad = i === 0 ? 0 : 0.8 + r() * 0.5
      return {
        p: [x + Math.cos(a) * rad, 4.2 + (i === 0 ? 0.9 : r() * 1.3 - 0.4), z + Math.sin(a) * rad * 0.8] as Vec3,
        s: 0.9 + r() * 0.5,
      }
    })
  }, [x, z])
  return (
    <group>
      <Rod a={V(x, -0.25, z)} b={V(x + 0.1, 3.4, z)} r={0.17} m="bark" seg={8} cast />
      <Rod a={V(x + 0.05, 2.4, z)} b={V(x + 0.9, 3.7, z + 0.2)} r={0.08} m="bark" seg={12} cast />
      <Rod a={V(x + 0.05, 2.7, z)} b={V(x - 0.8, 3.9, z - 0.2)} r={0.07} m="bark" seg={12} cast />
      {clumps.map((c, i) => (
        <Ball key={i} p={c.p} r={c.s} m={i % 3 ? 'foliageDark' : 'foliage'} seg={12} cast />
      ))}
      <Blob p={[x, -0.24, z]} s={[2.4, 2.4]} o={0.6} />
    </group>
  )
}

function LampPost({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <Rod a={V(x, -0.25, z)} b={V(x, 3.25, z)} r={0.055} m="metalDark" seg={8} cast />
      <Rod a={V(x, -0.25, z)} b={V(x, 0.15, z)} r={0.1} m="metalDark" seg={8} />
      <RBox p={[x, 3.32, z]} s={[0.3, 0.06, 0.3]} rad={0.02} m="metalDark" />
      <mesh position={[x, 3.5, z]}>
        <cylinderGeometry args={[0.1, 0.13, 0.32, 6]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <mesh position={[x, 3.72, z]}>
        <coneGeometry args={[0.24, 0.16, 6]} />
        <meshStandardMaterial color="#1b1c22" roughness={0.45} metalness={0.7} />
      </mesh>
      <Glow p={[x, 3.5, z]} s={2.6} color="#ffb060" o={0.75} />
      <Glow p={[x, 3.5, z]} s={0.7} color="#fff0c8" o={0.9} />
      <pointLight position={[x, 3.4, z]} color="#ffb46a" intensity={13} distance={7.5} decay={1.7} />
      <Blob p={[x, -0.24, z]} s={[0.6, 0.6]} o={0.7} />
    </group>
  )
}

/** Neighbouring houses and far apartment blocks. */
function Neighbourhood() {
  const k = useKit()
  const houses: { x: number; z: number; w: number; warm: boolean }[] = [
    { x: -14.5, z: -2.5, w: 8, warm: true },
    { x: 16.5, z: -5, w: 8, warm: false },
  ]
  const blocks: [number, number, number, number][] = [
    [-30, 9, 7, 0],
    [-21, 6, 6, 1],
    [22, 7, 6, 2],
    [31, 10, 8, 0],
    [-6, 4, 9, 1],
    [9, 5, 7, 2],
  ]
  return (
    <group>
      {houses.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]}>
          <mesh position={[0, 1.6, 0]} material={k.mat.brick} castShadow receiveShadow>
            <boxGeometry args={[h.w, 3.7, 6]} />
          </mesh>
          <mesh position={[0, 4.35, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.62]} material={k.mat.roof}>
            <cylinderGeometry args={[3.6, 3.6, h.w + 0.6, 3]} />
          </mesh>
          {[-2, 2].map((wx, j) => (
            <mesh key={j} position={[wx, 1.8, 3.01]}>
              <planeGeometry args={[1, 1.2]} />
              <meshBasicMaterial map={(j + i) % 2 ? k.tex.litWarm : k.tex.litCool} color={(j + i) % 2 ? '#a07050' : '#506090'} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {blocks.map(([x, h, w, t], i) => (
        <mesh key={i} position={[x, h / 2 - 0.25, -32 - (i % 3) * 4]}>
          <boxGeometry args={[w, h, 5]} />
          <meshStandardMaterial color="#0b0c1c" emissive="#ffffff" emissiveMap={k.tex.city[t]} emissiveIntensity={0.6} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

export default function Exterior() {
  return (
    <group>
      <Sky />
      <Merge>
        <Facade />
        <Garden />
        <Neighbourhood />
      </Merge>
    </group>
  )
}
