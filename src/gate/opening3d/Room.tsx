import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Ball, Blob, Glow, Merge, RBox, Rod, WBox, useKit } from './kit'
import { V, rng, type Clock, type Vec3 } from './util'

/**
 * The bedroom: x -4..4, z -6..-0.1, floor y 0, ceiling y 3.2. Same layout as the original
 * blocking (bed left, lamp back-left, CRT on a stand centre-back, desk back-right, posters,
 * round rug + bean bag in the middle), built out with real furniture.
 */

/** Deterministic TV flicker from the shot clock (so ?t= frames are stable). */
const tvFlicker = (t: number) =>
  0.86 + 0.07 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 23.7 + 1.3) + 0.03 * Math.sin(t * 57.3 + 0.4)

function Shell() {
  const k = useKit()
  return (
    <group>
      <WBox p={[-4.1, 1.6, -3.05]} s={[0.2, 3.2, 6.3]} m="wallSide" cast />
      <WBox p={[4.1, 1.6, -3.05]} s={[0.2, 3.2, 6.3]} m="wallSide" cast />
      <WBox p={[0, 1.6, -6.1]} s={[8.4, 3.2, 0.2]} m="wallBack" cast />
      <WBox p={[0, -0.1, -3.05]} s={[8.4, 0.2, 6.3]} m="floor" />
      <WBox p={[0, 3.3, -3.05]} s={[8.4, 0.2, 6.3]} m="ceiling" cast />
      {/* skirting boards */}
      <RBox p={[0, 0.06, -5.985]} s={[8, 0.12, 0.03]} rad={0.008} m="skirting" />
      <RBox p={[-3.985, 0.06, -3.05]} s={[0.03, 0.12, 5.9]} rad={0.008} m="skirting" />
      <RBox p={[3.985, 0.06, -3.05]} s={[0.03, 0.12, 5.9]} rad={0.008} m="skirting" />
      <RBox p={[0, 0.06, -0.115]} s={[8, 0.12, 0.03]} rad={0.008} m="skirting" />
      {/* corner occlusion: floor strips along each wall + low on the walls */}
      <AOStrip p={[0, 0.003, -5.82]} s={[8, 0.36]} rz={0} />
      <AOStrip p={[-3.82, 0.003, -3.05]} s={[6, 0.36]} rz={Math.PI / 2} />
      <AOStrip p={[3.82, 0.003, -3.05]} s={[6, 0.36]} rz={-Math.PI / 2} />
      <AOStrip p={[0, 0.003, -0.28]} s={[8, 0.36]} rz={Math.PI} />
      <mesh position={[0, 0.3, -5.995]} rotation={[0, 0, Math.PI]} scale={[8, 0.36, 1]} material={k.fx.edgeAO} geometry={k.geo('plane', () => new THREE.PlaneGeometry(1, 1))} />
      <mesh position={[0, 3.04, -5.995]} scale={[8, 0.32, 1]} material={k.fx.edgeAO} geometry={k.geo('plane', () => new THREE.PlaneGeometry(1, 1))} />
      {/* light switch */}
      <RBox p={[-1.95, 1.2, -5.99]} s={[0.085, 0.13, 0.014]} rad={0.006} m="switchPlate" />
      <RBox p={[-1.95, 1.21, -5.978]} s={[0.022, 0.04, 0.016]} rad={0.004} m="switchPlate" />
      {/* ceiling lamp (off) + glow-in-the-dark stars */}
      <Ball p={[0.2, 3.17, -3.0]} r={0.26} sc={[1, 0.28, 1]} m="paperWhite" seg={20} />
      <CeilingStars />
    </group>
  )
}

function AOStrip({ p, s, rz }: { p: Vec3; s: [number, number]; rz: number }) {
  const k = useKit()
  return (
    <mesh
      geometry={k.geo('plane', () => new THREE.PlaneGeometry(1, 1))}
      material={k.fx.edgeAO}
      position={p}
      rotation={[-Math.PI / 2, 0, rz]}
      scale={[s[0], s[1], 1]}
      renderOrder={1}
    />
  )
}

function CeilingStars() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 ? 0.026 : 0.06
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    const g = new THREE.ShapeGeometry(s)
    g.rotateX(Math.PI / 2) // face down
    return g
  }, [])
  const n = 34
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const r = rng(5)
    const o = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      o.position.set(-3.6 + r() * 7.2, 3.195, -5.6 + r() * 5.2)
      o.rotation.set(0, r() * Math.PI, 0)
      o.scale.setScalar(0.5 + r() * 0.9)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]}>
      <meshBasicMaterial color="#b6e39a" toneMapped={false} transparent opacity={0.55} />
    </instancedMesh>
  )
}

function WindowInside() {
  const k = useKit()
  const curtain = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.78, 1.8, 36, 6)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const flare = 1 + (0.9 - y) * 0.35 // folds open up toward the hem
      p.setZ(i, Math.sin((x / 0.78) * Math.PI * 7) * 0.035 * flare + Math.sin(x * 9 + y * 2) * 0.01)
    }
    g.computeVertexNormals()
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getY(i))
    return g
  }, [])
  useEffect(() => () => curtain.dispose(), [curtain])
  return (
    <group>
      {/* deep interior sill */}
      <RBox p={[0, 0.965, -0.2]} s={[2.75, 0.06, 0.26]} rad={0.012} m="trim" cast />
      {/* curtain rod + finials */}
      <Rod a={V(-1.95, 2.72, -0.24)} b={V(1.95, 2.72, -0.24)} r={0.016} m="brass" />
      <Ball p={[-1.97, 2.72, -0.24]} r={0.035} m="brass" seg={10} />
      <Ball p={[1.97, 2.72, -0.24]} r={0.035} m="brass" seg={10} />
      {/* two pleated curtains drawn to the sides */}
      <mesh geometry={curtain} material={k.mat.curtain} position={[-1.5, 1.8, -0.26]} castShadow receiveShadow />
      <mesh geometry={curtain} material={k.mat.curtain} position={[1.5, 1.8, -0.26]} castShadow receiveShadow />
      {/* toy rocket on the sill */}
      <group position={[-0.85, 0.995, -0.22]}>
        <Rod a={V(0, 0.03, 0)} b={V(0, 0.2, 0)} r={0.032} m="paperWhite" seg={12} cast />
        <mesh position={[0, 0.25, 0]} material={k.mat.toyRed} castShadow>
          <coneGeometry args={[0.032, 0.1, 12]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <RBox key={i} p={[Math.cos((i * 2 * Math.PI) / 3) * 0.035, 0.05, Math.sin((i * 2 * Math.PI) / 3) * 0.035]} r={[0, (-i * 2 * Math.PI) / 3, 0]} s={[0.04, 0.07, 0.008]} rad={0.003} m="toyRed" />
        ))}
        <Ball p={[0, 0.15, 0.03]} r={0.012} m="toyBlue" seg={8} />
      </group>
      {/* small cactus pot */}
      <group position={[0.9, 0.995, -0.2]}>
        <Rod a={V(0, 0, 0)} b={V(0, 0.08, 0)} r={0.045} m="toyRed" seg={12} cast />
        <Ball p={[0, 0.13, 0]} r={0.035} sc={[1, 1.6, 1]} m="toyGreen" seg={10} cast />
      </group>
    </group>
  )
}

function Bed() {
  return (
    <group position={[-3.15, 0, -4.52]}>
      {/* bookcase headboard against the back wall (the lamp stands on it) */}
      <RBox p={[0, 0.48, -1.28]} s={[1.72, 0.96, 0.34]} rad={0.02} m="wood" cast />
      <RBox p={[0, 0.97, -1.28]} s={[1.78, 0.04, 0.38]} rad={0.01} m="woodDark" cast />
      {/* frame + legs */}
      <RBox p={[0, 0.2, 0]} s={[1.64, 0.2, 2.2]} rad={0.03} m="woodDark" cast />
      <RBox p={[0, 0.34, 1.12]} s={[1.7, 0.58, 0.06]} rad={0.02} m="wood" cast />
      {/* mattress, blanket (with drape), sheet fold, pillow */}
      <RBox p={[0, 0.41, -0.02]} s={[1.5, 0.2, 2.12]} rad={0.06} m="cream" cast />
      <RBox p={[0.02, 0.54, 0.24]} s={[1.6, 0.09, 1.62]} rad={0.04} m="quilt" cast />
      <RBox p={[-0.79, 0.4, 0.24]} s={[0.05, 0.32, 1.6]} rad={0.02} m="quilt" cast />
      <RBox p={[0.82, 0.4, 0.24]} s={[0.05, 0.32, 1.6]} rad={0.02} m="quilt" cast />
      <RBox p={[0.02, 0.585, -0.5]} s={[1.58, 0.05, 0.22]} rad={0.022} m="cream" cast />
      <Ball p={[0, 0.6, -0.86]} r={0.36} sc={[1.5, 0.3, 0.75]} m="cream" seg={22} cast />
      {/* teddy */}
      <group position={[0.45, 0.62, -0.38]} rotation={[0, -0.5, 0]}>
        <Ball p={[0, 0.07, 0]} r={0.09} sc={[1, 1.1, 0.9]} m="woodDark" seg={14} cast />
        <Ball p={[0, 0.2, 0.02]} r={0.065} m="woodDark" seg={14} cast />
        <Ball p={[-0.05, 0.26, 0.01]} r={0.025} m="woodDark" seg={8} />
        <Ball p={[0.05, 0.26, 0.01]} r={0.025} m="woodDark" seg={8} />
        <Ball p={[0, 0.19, 0.075]} r={0.025} m="cream" seg={8} />
      </group>
      <Blob p={[0, 0.006, 0]} s={[2.1, 2.7]} o={0.8} />
    </group>
  )
}

function BedLamp() {
  const k = useKit()
  // stands on the headboard shelf; shade centred where the original lamp glowed (-3, ~1.2, -5.6)
  const x = -3.0
  const z = -5.78
  return (
    <group>
      <mesh position={[x, 1.03, z]} material={k.mat.plasticGrey} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.08, 18]} />
      </mesh>
      <Rod a={V(x, 1.05, z)} b={V(x, 1.22, z)} r={0.012} m="brass" seg={8} />
      {/* shade: open frustum, lit from inside */}
      <mesh position={[x, 1.28, z]}>
        <cylinderGeometry args={[0.13, 0.2, 0.22, 24, 1, true]} />
        <meshStandardMaterial color="#ffe0b0" emissive="#ffb35c" emissiveIntensity={1.4} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[x, 1.21, z]}>
        <sphereGeometry args={[0.045, 14, 10]} />
        <meshBasicMaterial color="#fff2d0" toneMapped={false} />
      </mesh>
      <Glow p={[x, 1.28, z + 0.05]} s={1.5} color="#ffb060" o={0.55} />
      <Glow p={[x, 1.16, z + 0.05]} s={0.45} color="#fff0c0" o={0.8} />
    </group>
  )
}

function TV({ clock }: { clock: Clock }) {
  const k = useKit()
  const screenMat = useRef<THREE.MeshBasicMaterial>(null)
  const screenGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.0, 0.76, 16, 12)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      p.setZ(i, 0.06 - (x * x + y * y) * 0.07) // bulging CRT glass
    }
    g.computeVertexNormals()
    return g
  }, [])
  const taper = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.42, 0.78, 0.46, 4, 1)
    g.rotateY(Math.PI / 4)
    g.rotateX(-Math.PI / 2)
    g.scale(1, 0.72, 1)
    return g
  }, [])
  useEffect(
    () => () => {
      screenGeo.dispose()
      taper.dispose()
    },
    [screenGeo, taper],
  )
  useFrame(() => {
    const f = tvFlicker(clock.t)
    screenMat.current?.color.setScalar(0.92 * f + 0.08)
  })
  const cx = 0.2
  const fz = -5.2 // front face of the cabinet
  return (
    <group>
      {/* low stand with an open shelf */}
      <RBox p={[cx, 0.245, -5.58]} s={[1.6, 0.04, 0.72]} rad={0.01} m="wood" cast />
      <RBox p={[cx, 0.02, -5.58]} s={[1.6, 0.04, 0.72]} rad={0.01} m="wood" cast />
      <RBox p={[cx - 0.78, 0.13, -5.58]} s={[0.04, 0.22, 0.72]} rad={0.008} m="wood" cast />
      <RBox p={[cx + 0.78, 0.13, -5.58]} s={[0.04, 0.22, 0.72]} rad={0.008} m="wood" cast />
      <RBox p={[cx, 0.13, -5.93]} s={[1.56, 0.22, 0.02]} rad={0.005} m="woodDark" />
      {/* the home console under the TV */}
      <RBox p={[cx - 0.3, 0.095, -5.6]} s={[0.46, 0.11, 0.34]} rad={0.02} m="plasticGrey" cast />
      <RBox p={[cx - 0.3, 0.152, -5.62]} s={[0.24, 0.012, 0.16]} rad={0.004} m="plasticDark" />
      <mesh position={[cx - 0.44, 0.1, -5.428]}>
        <circleGeometry args={[0.008, 8]} />
        <meshBasicMaterial color="#ff3030" toneMapped={false} />
      </mesh>
      <RBox p={[cx + 0.35, 0.13, -5.6]} s={[0.4, 0.17, 0.3]} rad={0.01} m="paperWhite" />
      {/* CRT cabinet */}
      <RBox p={[cx, 0.77, fz - 0.19]} s={[1.38, 1.02, 0.4]} rad={0.06} m="tvBody" cast />
      <mesh geometry={taper} material={k.mat.tvBody} position={[cx, 0.8, fz - 0.6]} castShadow />
      <RBox p={[cx, 0.82, fz + 0.01]} s={[1.14, 0.86, 0.03]} rad={0.04} m="tvBezel" />
      <mesh geometry={screenGeo} position={[cx, 0.82, fz]}>
        <meshBasicMaterial ref={screenMat} map={k.tex.tv} toneMapped={false} />
      </mesh>
      {/* control strip: speaker slots, buttons, power LED */}
      {Array.from({ length: 7 }, (_, i) => (
        <RBox key={i} p={[cx - 0.5 + i * 0.045, 0.33, fz + 0.012]} s={[0.022, 0.07, 0.01]} rad={0.004} m="plasticDark" />
      ))}
      {[0.25, 0.33, 0.41].map((x, i) => (
        <RBox key={i} p={[cx + x, 0.33, fz + 0.016]} s={[0.05, 0.03, 0.02]} rad={0.006} m="plasticDark" />
      ))}
      <mesh position={[cx + 0.52, 0.33, fz + 0.022]}>
        <circleGeometry args={[0.012, 10]} />
        <meshBasicMaterial color="#ff4040" toneMapped={false} />
      </mesh>
      {/* rabbit-ear antenna */}
      <Ball p={[cx + 0.1, 1.28, fz - 0.4]} r={0.08} sc={[1, 0.45, 1]} m="plasticDark" seg={14} />
      <Rod a={V(cx + 0.08, 1.3, fz - 0.4)} b={V(cx - 0.32, 1.95, fz - 0.55)} r={0.006} m="zip" seg={6} />
      <Rod a={V(cx + 0.12, 1.3, fz - 0.4)} b={V(cx + 0.62, 1.88, fz - 0.6)} r={0.006} m="zip" seg={6} />
      <Blob p={[cx, 0.006, -5.5]} s={[2.1, 1.2]} o={0.9} />
    </group>
  )
}

/** Controller on the rug, cabled to the console. */
function Controller() {
  const k = useKit()
  const cable = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      V(-0.1, 0.095, -5.42),
      V(-0.05, 0.03, -5.2),
      V(0.15, 0.008, -4.95),
      V(0.62, 0.012, -4.75),
      V(0.95, 0.025, -4.5),
      V(1.05, 0.03, -4.3),
    ])
    return new THREE.TubeGeometry(c, 48, 0.008, 6, false)
  }, [])
  useEffect(() => () => cable.dispose(), [cable])
  return (
    <group>
      <mesh geometry={cable} material={k.mat.plasticDark} />
      <group position={[1.08, 0.035, -4.2]} rotation={[0, 0.5, 0]}>
        <RBox p={[0, 0, 0]} s={[0.2, 0.04, 0.09]} rad={0.018} m="plasticGrey" cast />
        <RBox p={[-0.05, 0.022, 0]} s={[0.04, 0.008, 0.012]} rad={0.003} m="plasticDark" />
        <RBox p={[-0.05, 0.022, 0]} s={[0.012, 0.008, 0.04]} rad={0.003} m="plasticDark" />
        <Ball p={[0.045, 0.022, 0.008]} r={0.011} sc={[1, 0.5, 1]} m="gbBtn" seg={10} />
        <Ball p={[0.072, 0.022, -0.008]} r={0.011} sc={[1, 0.5, 1]} m="gbBtn" seg={10} />
      </group>
    </group>
  )
}

function Rug() {
  const k = useKit()
  const mats = useMemo(() => [k.mat.jeans, k.mat.rug, k.mat.rug], [k])
  return (
    <group>
      <mesh position={[0.2, 0.012, -3.2]} material={mats} receiveShadow>
        <cylinderGeometry args={[1.6, 1.6, 0.024, 72]} />
      </mesh>
      {/* toys */}
      <RBox p={[-0.72, 0.069, -2.42]} s={[0.09, 0.09, 0.09]} rad={0.012} r={[0, 0.4, 0]} m="toyRed" cast />
      <RBox p={[-0.6, 0.069, -2.6]} s={[0.09, 0.09, 0.09]} rad={0.012} r={[0, -0.3, 0]} m="toyBlue" cast />
      <RBox p={[-0.67, 0.159, -2.5]} s={[0.09, 0.09, 0.09]} rad={0.012} r={[0, 0.9, 0]} m="toyYellow" cast />
      <RBox p={[-0.42, 0.069, -2.34]} s={[0.09, 0.09, 0.09]} rad={0.012} r={[0, 0.2, 0]} m="toyGreen" cast />
      <Ball p={[-0.95, 0.11, -3.75]} r={0.09} m="toyRed" seg={18} cast />
      <Blob p={[-0.95, 0.026, -3.75]} s={[0.3, 0.3]} o={0.8} />
      {/* toy car */}
      <group position={[1.42, 0.024, -2.35]} rotation={[0, -0.7, 0]}>
        <RBox p={[0, 0.05, 0]} s={[0.22, 0.05, 0.11]} rad={0.015} m="toyBlue" cast />
        <RBox p={[-0.01, 0.09, 0]} s={[0.11, 0.045, 0.095]} rad={0.015} m="toyBlue" cast />
        {[
          [-0.07, 0.055],
          [0.07, 0.055],
          [-0.07, -0.055],
          [0.07, -0.055],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.025, z]} rotation={[Math.PI / 2, 0, 0]} material={k.mat.plasticDark}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
          </mesh>
        ))}
      </group>
      <Controller />
    </group>
  )
}

function Desk() {
  const k = useKit()
  return (
    <group>
      <RBox p={[3.0, 0.735, -5.4]} s={[1.8, 0.05, 0.98]} rad={0.015} m="wood" cast />
      {/* drawer pedestal + legs */}
      <RBox p={[3.6, 0.36, -5.4]} s={[0.55, 0.7, 0.9]} rad={0.015} m="wood" cast />
      {[0.15, 0.37, 0.59].map((y, i) => (
        <group key={i}>
          <RBox p={[3.6, y, -4.946]} s={[0.5, 0.19, 0.02]} rad={0.008} m="woodDark" />
          <Ball p={[3.6, y, -4.93]} r={0.018} m="brass" seg={8} />
        </group>
      ))}
      <RBox p={[2.18, 0.36, -5.0]} s={[0.05, 0.7, 0.05]} rad={0.01} m="woodDark" cast />
      <RBox p={[2.18, 0.36, -5.8]} s={[0.05, 0.7, 0.05]} rad={0.01} m="woodDark" cast />
      {/* boombox */}
      <RBox p={[3.0, 0.93, -5.45]} s={[0.56, 0.32, 0.2]} rad={0.03} m="plasticGrey" cast />
      {[-0.17, 0.17].map((x, i) => (
        <group key={i}>
          <mesh position={[3.0 + x, 0.91, -5.348]} material={k.mat.plasticDark}>
            <circleGeometry args={[0.085, 20]} />
          </mesh>
          <mesh position={[3.0 + x, 0.91, -5.346]} material={k.mat.gbPill}>
            <circleGeometry args={[0.03, 14]} />
          </mesh>
        </group>
      ))}
      <RBox p={[3.0, 1.03, -5.348]} s={[0.12, 0.05, 0.01]} rad={0.004} m="plasticDark" />
      <Rod a={V(2.8, 1.09, -5.45)} b={V(3.2, 1.09, -5.45)} r={0.012} m="plasticDark" seg={8} />
      {/* globe */}
      <mesh position={[2.42, 0.775, -5.45]} material={k.mat.woodDark}>
        <cylinderGeometry args={[0.05, 0.07, 0.03, 14]} />
      </mesh>
      <Rod a={V(2.42, 0.78, -5.45)} b={V(2.42, 0.86, -5.45)} r={0.01} m="brass" seg={6} />
      <Ball p={[2.42, 0.98, -5.45]} r={0.13} m="globeSea" seg={20} rot={[0.4, 0, 0.3]} cast />
      <Ball p={[2.36, 1.02, -5.36]} r={0.07} sc={[1, 0.8, 0.5]} m="toyGreen" seg={10} />
      <Ball p={[2.5, 0.93, -5.37]} r={0.05} sc={[0.8, 1, 0.5]} m="toyGreen" seg={10} />
      {/* pencil cup + book stack */}
      <Rod a={V(3.55, 0.76, -5.1)} b={V(3.55, 0.87, -5.1)} r={0.035} m="toyRed" seg={12} />
      <Rod a={V(3.54, 0.8, -5.1)} b={V(3.52, 0.95, -5.12)} r={0.006} m="toyYellow" seg={6} />
      <Rod a={V(3.56, 0.8, -5.09)} b={V(3.6, 0.94, -5.08)} r={0.006} m="toyBlue" seg={6} />
      <RBox p={[3.5, 0.78, -5.65]} s={[0.36, 0.04, 0.26]} rad={0.006} m="toyBlue" />
      <RBox p={[3.5, 0.82, -5.65]} s={[0.33, 0.04, 0.24]} rad={0.006} m="toyYellow" r={[0, 0.12, 0]} />
      <Blob p={[3.0, 0.006, -5.4]} s={[2.1, 1.3]} o={0.8} />
    </group>
  )
}

function Bookshelf() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const k = useKit()
  const books = useMemo(() => {
    const r = rng(9)
    const cols = ['#e0405a', '#3d7fd9', '#ffc857', '#5fbf5a', '#ece6d6', '#7a3b5e', '#f08a3c', '#2a2f5a']
    const out: { p: Vec3; s: Vec3; ry: number; c: string }[] = []
    for (const y of [0.06, 0.5, 0.94]) {
      let z = -4.24
      while (z < -3.42) {
        const t = 0.035 + r() * 0.035
        const h = 0.24 + r() * 0.12
        const lean = z > -3.6 && r() < 0.5 ? 0.25 : 0
        out.push({ p: [3.8, y + h / 2, z + t / 2], s: [0.26 + r() * 0.05, h, t], ry: lean, c: cols[Math.floor(r() * cols.length)] })
        z += t + 0.004
      }
    }
    return out
  }, [])
  const geo = k.geo('unitBox', () => new THREE.BoxGeometry(1, 1, 1))
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    books.forEach((b, i) => {
      o.position.set(...b.p)
      o.rotation.set(b.ry, 0, 0)
      o.scale.set(...b.s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(b.c))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [books])
  const x = 3.8
  return (
    <group>
      <RBox p={[x, 0.7, -4.32]} s={[0.4, 1.42, 0.04]} rad={0.008} m="wood" cast />
      <RBox p={[x, 0.7, -3.34]} s={[0.4, 1.42, 0.04]} rad={0.008} m="wood" cast />
      <RBox p={[x + 0.18, 0.7, -3.83]} s={[0.03, 1.42, 0.98]} rad={0.004} m="woodDark" />
      {[0.03, 0.47, 0.91, 1.39].map((y, i) => (
        <RBox key={i} p={[x, y, -3.83]} s={[0.4, 0.035, 0.98]} rad={0.006} m="wood" cast />
      ))}
      <instancedMesh ref={ref} args={[geo, undefined, books.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      {/* trophy */}
      <group position={[x - 0.02, 1.41, -3.62]}>
        <RBox p={[0, 0.04, 0]} s={[0.12, 0.07, 0.12]} rad={0.01} m="woodDark" />
        <Rod a={V(0, 0.075, 0)} b={V(0, 0.15, 0)} r={0.012} m="gold" seg={8} />
        <mesh position={[0, 0.2, 0]} material={k.mat.gold} castShadow>
          <cylinderGeometry args={[0.06, 0.03, 0.1, 16]} />
        </mesh>
        <mesh position={[0, 0.2, 0.05]} rotation={[0, 0, Math.PI / 2]} material={k.mat.gold}>
          <torusGeometry args={[0.025, 0.006, 6, 12, Math.PI]} />
        </mesh>
      </group>
      <Ball p={[x, 1.48, -4.05]} r={0.07} m="toyYellow" seg={14} />
      <Blob p={[x - 0.1, 0.006, -3.83]} s={[0.8, 1.4]} o={0.7} />
    </group>
  )
}

function Posters() {
  const k = useKit()
  const mats = useMemo(() => k.tex.posters.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 })), [k])
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  const plane = k.geo('plane', () => new THREE.PlaneGeometry(1, 1))
  // [x, y, tilt, framed]
  const back: [number, number, number, boolean][] = [
    [-3, 1.95, 0.025, false],
    [-1.3, 2.25, 0, true],
    [1.0, 2.02, 0, true],
    [2.7, 2.25, -0.03, false],
  ]
  const tape = (x: number, y: number, rz: number, key: string) => (
    <mesh key={key} geometry={plane} material={k.mat.tape} position={[x, y, 0.004]} rotation={[0, 0, rz]} scale={[0.14, 0.05, 1]} />
  )
  return (
    <group>
      {back.map(([x, y, tilt, framed], i) => (
        <group key={i} position={[x, y, -5.985]} rotation={[0, 0, tilt]}>
          {framed && <RBox p={[0, 0, 0.008]} s={[1.1, 1.5, 0.035]} rad={0.01} m="frameBlack" />}
          <mesh geometry={plane} material={mats[i]} position={[0, 0, framed ? 0.027 : 0.003]} scale={[1.0, 1.4, 1]} receiveShadow />
          {!framed && [tape(-0.47, 0.67, 0.7, 'a'), tape(0.47, 0.67, -0.7, 'b'), tape(-0.47, -0.67, -0.7, 'c'), tape(0.47, -0.67, 0.7, 'd')]}
        </group>
      ))}
      {/* right wall: framed robot poster */}
      <group position={[3.985, 2.0, -2.2]} rotation={[0, -Math.PI / 2, 0]}>
        <RBox p={[0, 0, 0.008]} s={[1.0, 1.4, 0.035]} rad={0.01} m="frameBlack" />
        <mesh geometry={plane} material={mats[4]} position={[0, 0, 0.027]} scale={[0.9, 1.26, 1]} receiveShadow />
      </group>
    </group>
  )
}

function Lights({ clock }: { clock: Clock }) {
  const tvSpot = useRef<THREE.SpotLight>(null)
  const tvPoint = useRef<THREE.PointLight>(null)
  const lampSpot = useRef<THREE.SpotLight>(null)
  const tvSpotTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0.5, 0.75, -2.6)
    return o
  }, [])
  const lampTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0.0, 0.2, -3.0)
    return o
  }, [])
  useEffect(() => {
    if (tvSpot.current) tvSpot.current.target = tvSpotTarget
    if (lampSpot.current) lampSpot.current.target = lampTarget
  }, [tvSpotTarget, lampTarget])
  useFrame(() => {
    const f = tvFlicker(clock.t)
    if (tvSpot.current) tvSpot.current.intensity = 9 * f
    if (tvPoint.current) tvPoint.current.intensity = 5 * f
  })
  return (
    <group>
      <primitive object={tvSpotTarget} />
      <primitive object={lampTarget} />
      {/* bedside lamp: shadowed key + unshadowed wall glow */}
      <spotLight
        ref={lampSpot}
        position={[-3.0, 1.22, -5.6]}
        color="#ffb468"
        intensity={11}
        distance={11}
        decay={1.6}
        angle={1.05}
        penumbra={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-radius={5}
        shadow-camera-near={0.1}
        shadow-camera-far={11}
      />
      <pointLight position={[-3, 1.45, -5.3]} color="#ffb870" intensity={8} distance={7} decay={1.6} />
      {/* CRT glow: shadowed spot onto the kid + soft fill on the back wall */}
      <spotLight
        ref={tvSpot}
        position={[0.2, 0.82, -5.0]}
        color="#86d4ff"
        intensity={9}
        distance={9}
        decay={1.6}
        angle={0.95}
        penumbra={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-camera-near={0.1}
        shadow-camera-far={9}
      />
      <pointLight ref={tvPoint} position={[0.2, 0.95, -4.7]} color="#7fd6ff" intensity={5} distance={6} decay={1.6} />
      {/* soft warm fill from above the window (as in the original) */}
      <pointLight position={[0.5, 2.8, -1.2]} color="#ffe2b8" intensity={3.2} distance={7} decay={1.6} />
      <hemisphereLight args={['#8a86c9', '#2a1f2a', 0.55]} />
    </group>
  )
}

export default function Room({ clock }: { clock: Clock }) {
  return (
    <group>
      <Merge>
        <Shell />
        <WindowInside />
        <Bed />
        <BedLamp />
        <TV clock={clock} />
        <Rug />
        <Desk />
        <Bookshelf />
        <Posters />
      </Merge>
      <Lights clock={clock} />
    </group>
  )
}
