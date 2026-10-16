import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Ball, Blob, Capsule, Merge, RBox, Rod, useKit } from './kit'
import { GB_POS, GB_TILT, V, gbToWorld, rng, type Clock } from './util'

/**
 * The kid on the bean bag, back three-quarters to the camera, playing the handheld.
 * Avatar rules: short messy black hair, round glasses, light-brown skin, black zip hoodie
 * (hood down) over a red tee, jeans, socks. Built from rounded primitives.
 * Coordinates are world space; he faces -z (toward the TV). His right is +x (camera side).
 */

const X = 0.5

function BeanBag() {
  const k = useKit()
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.45, 48, 32)
    const p = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const nx = v.x / 0.45
      const ny = v.y / 0.45
      const nz = v.z / 0.45
      let x = v.x * 1.25
      let y = v.y * 0.72
      let z = v.z * 1.12
      // lumpy fabric folds
      const lump = Math.sin(nx * 7 + nz * 3) * 0.012 + Math.sin(nz * 9 - ny * 4) * 0.01 + Math.sin(nx * 13 + ny * 5) * 0.005
      x += nx * lump
      y += ny * lump
      z += nz * lump
      // seat dent where he sits, raised back behind him
      const seat = Math.exp(-((nx * nx) / 0.25 + ((nz + 0.15) * (nz + 0.15)) / 0.2))
      if (ny > 0) y -= seat * 0.13 * ny
      if (ny > -0.2) y += Math.max(0, nz) * 0.12 * (1 - Math.abs(nx)) * Math.max(0, ny + 0.2)
      // sagging, flattened bottom
      if (y < -0.2) y = -0.2 + (y + 0.2) * 0.25
      p.setXYZ(i, x, y, z)
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <group>
      <mesh geometry={geo} material={k.mat.beanbag} position={[X, 0.27, -2.75]} castShadow receiveShadow />
      {/* seam + little carry handle on top of the back */}
      <mesh position={[X, 0.47, -2.33]} rotation={[0.5, 0, 0]} material={k.mat.beanbag}>
        <torusGeometry args={[0.04, 0.012, 6, 14, Math.PI]} />
      </mesh>
      <Blob p={[X, 0.026, -2.75]} s={[1.5, 1.35]} o={0.95} />
    </group>
  )
}

/**
 * Short messy black hair: one cap mesh displaced into clumps with strand grooves radiating
 * from the crown and a ragged hairline, plus a few small tufts sticking up for the mess.
 */
function makeHairCap() {
  const TH = Math.PI * 0.58
  const g = new THREE.SphereGeometry(1, 64, 30, 0, Math.PI * 2, 0, TH)
  const p = g.attributes.position
  const d = new THREE.Vector3()
  const tan = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize()
    const th = Math.acos(Math.min(1, Math.max(-1, d.y)))
    const ph = Math.atan2(d.z, d.x)
    const clumps = 0.009 * Math.sin(ph * 7 + th * 5) * Math.sin(th * 7 + ph * 2)
    const strands = 0.0035 * Math.sin(ph * 38 + Math.sin(th * 6) * 2.5) * Math.min(1, th * 3)
    const volume = 0.012 * Math.max(0, Math.cos(th)) // fuller on top
    const r = 0.18 + clumps + strands + volume
    p.setXYZ(i, d.x * r, d.y * r, d.z * r)
    // ragged hairline: pull the last rings down in uneven points
    const edge = Math.max(0, (th - TH * 0.8) / (TH * 0.2))
    if (edge > 0) {
      const jag = edge * 0.028 * Math.max(0, Math.sin(ph * 11) * 0.7 + Math.sin(ph * 23 + 1.3) * 0.5)
      tan.set(Math.cos(th) * Math.cos(ph), -Math.sin(th), Math.cos(th) * Math.sin(ph))
      p.setXYZ(i, p.getX(i) + tan.x * jag, p.getY(i) + tan.y * jag, p.getZ(i) + tan.z * jag)
    }
  }
  g.computeVertexNormals()
  return g
}

function Hair() {
  const k = useKit()
  const spikeRef = useRef<THREE.InstancedMesh>(null)
  const spike = k.geo('hairSpike', () => {
    const g = new THREE.ConeGeometry(1, 1, 5)
    g.translate(0, 0.5, 0)
    return g
  })
  const cap = k.geo('hairCap', makeHairCap)
  const nS = 26
  useEffect(() => {
    const r = rng(23)
    const o = new THREE.Object3D()
    const crown = V(0, 0.82, 0.57).normalize()
    const sm = spikeRef.current
    if (!sm) return
    for (let i = 0; i < nS; i++) {
      const th = r() * Math.PI * 2
      const ph = Math.acos(1 - r() * (1 - Math.cos(1.2)))
      const n = V(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).applyAxisAngle(V(1, 0, 0), 0.45)
      // tufts lean away from the crown, a bit up
      const away = n.clone().sub(crown).multiplyScalar(0.9)
      const dir = n.clone().add(away).add(V((r() - 0.5) * 0.4, 0.15, (r() - 0.5) * 0.4)).normalize()
      o.quaternion.setFromUnitVectors(V(0, 1, 0), dir)
      o.position.copy(n).multiplyScalar(0.183 + Math.max(0, n.y) * 0.01)
      const len = 0.016 + r() * 0.014
      o.scale.set(0.012 + r() * 0.008, len, 0.008 + r() * 0.005)
      o.updateMatrix()
      sm.setMatrixAt(i, o.matrix)
    }
    sm.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      <mesh geometry={cap} material={k.mat.hair} rotation={[0.45, 0, 0]} scale={[0.95, 1, 1.02]} castShadow />
      <instancedMesh ref={spikeRef} args={[spike, k.mat.hair, nS]} castShadow />
      {/* nape volume */}
      <Ball p={[0, -0.02, 0.1]} r={0.12} sc={[1.15, 0.8, 0.7]} m="hair" seg={14} />
    </group>
  )
}

function Glasses() {
  const k = useKit()
  const ring = k.geo('rim', () => new THREE.TorusGeometry(0.044, 0.0065, 8, 28))
  const disc = k.geo('lens', () => new THREE.CircleGeometry(0.042, 24))
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={ring} material={k.mat.glassesRim} position={[s * 0.06, 0.02, -0.176]} rotation={[0, s * 0.18, 0]} />
          <mesh geometry={disc} material={k.mat.lens} position={[s * 0.06, 0.02, -0.177]} rotation={[0, Math.PI + s * 0.18, 0]} />
          <RBox p={[s * 0.104, 0.024, -0.168]} s={[0.014, 0.012, 0.018]} rad={0.003} m="glassesRim" />
          {/* temple arm back to the ear, hooking down behind it */}
          <Rod a={V(s * 0.108, 0.024, -0.162)} b={V(s * 0.178, 0.022, -0.01)} r={0.0042} m="glassesRim" seg={6} />
          <Rod a={V(s * 0.178, 0.022, -0.01)} b={V(s * 0.17, -0.02, 0.03)} r={0.0042} m="glassesRim" seg={6} />
        </group>
      ))}
      <Rod a={V(-0.017, 0.028, -0.18)} b={V(0.017, 0.028, -0.18)} r={0.0045} m="glassesRim" seg={6} />
    </group>
  )
}

function Head({ pivot }: { pivot: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={pivot} position={[X, 1.04, -2.975]}>
      <Merge>
      <group position={[0, 0.14, 0]}>
        <Ball p={[0, 0, 0]} r={0.17} sc={[0.94, 1, 1]} m="skin" seg={28} cast />
        {/* jaw / cheeks */}
        <Ball p={[0, -0.065, -0.045]} r={0.125} sc={[1, 0.85, 1]} m="skin" seg={20} cast />
        {/* ears */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.162, -0.008, 0.005]} rotation={[0, s * 0.25, 0]}>
            <Ball p={[0, 0, 0]} r={0.045} sc={[0.42, 1, 0.68]} m="skin" seg={14} cast />
            <Ball p={[s * 0.01, 0, -0.004]} r={0.026} sc={[0.3, 0.9, 0.5]} m="skinDark" seg={10} />
          </group>
        ))}
        {/* face (mostly hidden from the camera, but it reads in profile) */}
        <Ball p={[0, -0.02, -0.168]} r={0.026} sc={[0.95, 1.1, 1]} m="skin" seg={12} />
        <Ball p={[-0.058, 0.018, -0.152]} r={0.017} m="eye" seg={10} />
        <Ball p={[0.058, 0.018, -0.152]} r={0.017} m="eye" seg={10} />
        <RBox p={[-0.06, 0.068, -0.158]} s={[0.05, 0.012, 0.012]} rad={0.004} m="hair" />
        <RBox p={[0.06, 0.068, -0.158]} s={[0.05, 0.012, 0.012]} rad={0.004} m="hair" />
        <Glasses />
        <Hair />
      </group>
      </Merge>
    </group>
  )
}

/** Torso in a black zip hoodie (hood down) over a red tee. */
function Torso() {
  const k = useKit()
  const torso = k.geo('torso', () => new THREE.CapsuleGeometry(0.19, 0.3, 8, 20))
  const hood = k.geo('hood', () => new THREE.TorusGeometry(0.105, 0.024, 10, 24, Math.PI * 1.1))
  const collar = k.geo('collar', () => new THREE.TorusGeometry(0.066, 0.014, 8, 24))
  const lean = 0.15
  return (
    <group position={[X, 0.45, -2.86]} rotation={[-lean, 0, 0]}>
      <mesh geometry={torso} material={k.mat.jacket} position={[0, 0.210, 0]} scale={[1.12, 1, 0.74]} castShadow receiveShadow />
      {/* shoulders */}
      <Ball p={[-0.18, 0.425, 0]} r={0.07} sc={[1, 0.85, 1]} m="jacket" seg={16} cast />
      <Ball p={[0.18, 0.425, 0]} r={0.07} sc={[1, 0.85, 1]} m="jacket" seg={16} cast />
      {/* ribbed hem */}
      <mesh position={[0, -0.030, 0]} scale={[1.13, 1, 0.75]} material={k.mat.jacketRib}>
        <cylinderGeometry args={[0.19, 0.185, 0.07, 24, 1, true]} />
      </mesh>
      {/* back yoke seam */}
      <mesh position={[0, 0.380, 0.0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.13, 0.75, 1]} material={k.mat.jacketRib}>
        <torusGeometry args={[0.192, 0.004, 4, 32, Math.PI]} />
      </mesh>
      {/* open front: red tee between zipper edges */}
      <RBox p={[0, 0.250, -0.13]} s={[0.1, 0.42, 0.03]} rad={0.012} m="tee" />
      <RBox p={[-0.055, 0.230, -0.137]} s={[0.012, 0.46, 0.02]} rad={0.004} m="zip" />
      <RBox p={[0.055, 0.230, -0.137]} s={[0.012, 0.46, 0.02]} rad={0.004} m="zip" />
      <RBox p={[0.06, 0.44, -0.147]} s={[0.01, 0.024, 0.005]} rad={0.002} m="zip" />
      {/* red tee crew collar + neck */}
      <mesh geometry={collar} material={k.mat.tee} position={[0, 0.525, -0.01]} rotation={[Math.PI / 2 - 0.25, 0, 0]} />
      <Capsule a={V(0, 0.500, -0.01)} b={V(0, 0.610, -0.03)} r={0.055} m="skin" cast />
      {/* hood, down: a bunched roll around the back of the neck + its pouch on the upper back */}
      <mesh geometry={hood} material={k.mat.jacket} position={[0, 0.47, 0.03]} rotation={[Math.PI / 2 + 0.45, 0, -Math.PI * 0.05]} scale={[1.05, 1, 0.75]} castShadow />
      <Ball p={[0, 0.41, 0.12]} r={0.11} sc={[1.0, 0.55, 0.24]} m="jacket" seg={18} cast />
      <Ball p={[0, 0.44, 0.125]} r={0.075} sc={[1, 0.26, 0.2]} m="jacketLining" seg={14} />
      {/* drawstrings (front) */}
      <Rod a={V(-0.035, 0.500, -0.1)} b={V(-0.04, 0.350, -0.155)} r={0.0045} m="paperWhite" seg={5} />
      <Rod a={V(0.035, 0.500, -0.1)} b={V(0.042, 0.370, -0.155)} r={0.0045} m="paperWhite" seg={5} />
    </group>
  )
}

function Legs() {
  return (
    <group>
      {[-1, 1].map((s) => {
        const hip = V(X + s * 0.1, 0.47, -2.9)
        const knee = V(X + s * 0.14, 0.55, -3.33)
        const ankle = V(X + s * 0.16, 0.13, -3.47)
        return (
          <group key={s}>
            <Capsule a={hip} b={knee} r={0.078} m="jeans" cast />
            <Capsule a={knee} b={ankle} r={0.062} m="jeans" cast />
            <Rod a={V(ankle.x, 0.15, ankle.z + 0.005)} b={V(ankle.x, 0.2, ankle.z + 0.018)} r={0.066} m="jeans" seg={12} />
            <Capsule a={V(ankle.x, 0.06, ankle.z)} b={V(ankle.x, 0.14, ankle.z)} r={0.045} m="sock" cast />
            <RBox p={[ankle.x + s * 0.005, 0.045, ankle.z - 0.08]} s={[0.095, 0.075, 0.21]} rad={0.035} r={[0, s * 0.12, 0]} m="sock" cast />
          </group>
        )
      })}
    </group>
  )
}

/**
 * Arms + hands. Hands are built in the handheld's frame (they hold it), sleeves run from the
 * shoulders to the wrists in world space. Thumbs tap the d-pad / A-B from the shot clock.
 */
function Arms({ clock }: { clock: Clock }) {
  const thumbL = useRef<THREE.Group>(null)
  const thumbR = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = clock.t
    if (thumbL.current) {
      thumbL.current.rotation.z = Math.sin(t * 5.3) * 0.09 + Math.sin(t * 11.7) * 0.04
      thumbL.current.rotation.x = -Math.max(0, Math.sin(t * 7.1)) * 0.06
    }
    if (thumbR.current) {
      const press = Math.pow(Math.max(0, Math.sin(t * 6.2 + 1)), 6)
      thumbR.current.rotation.x = -press * 0.12
      thumbR.current.rotation.z = Math.sin(t * 2.3) * 0.06
    }
  })
  const sides = [-1, 1] as const
  return (
    <group>
      {sides.map((s) => {
        const shoulder = V(X + s * 0.2, 0.87, -2.93)
        const elbow = V(X + s * 0.25, 0.64, -3.03)
        const wrist = gbToWorld(s * 0.122, -0.1, -0.022)
        const cuff = wrist.clone().lerp(elbow, 0.2)
        return (
          <group key={s}>
            <Capsule a={shoulder} b={elbow} r={0.056} m="jacket" cast />
            <Capsule a={elbow} b={cuff} r={0.049} m="jacket" cast />
            <Rod a={cuff} b={cuff.clone().lerp(wrist, 0.45)} r={0.047} m="jacketRib" seg={14} />
            <Capsule a={cuff} b={wrist} r={0.033} m="skin" />
          </group>
        )
      })}
      <group position={GB_POS} rotation={[GB_TILT, 0, 0]}>
        {sides.map((s) => (
          <group key={s}>
            {/* palm cupping the side + back */}
            <RBox p={[s * 0.106, -0.083, -0.018]} s={[0.04, 0.09, 0.05]} rad={0.016} m="skin" r={[0, 0, s * 0.12]} cast />
            {/* fingers wrapped around the back */}
            {[-0.045, -0.07, -0.095, -0.118].map((y, i) => (
              <Capsule key={i} a={V(s * 0.11, y, -0.035)} b={V(s * (0.05 + i * 0.006), y - 0.005, -0.037)} r={0.0105} m="skin" />
            ))}
            {/* thumb: base on the palm, two segments, tip resting on the controls */}
            <group ref={s < 0 ? thumbL : thumbR} position={[s * 0.096, -0.073, 0.012]} userData={{ noMerge: true }}>
              <Capsule a={V(0, 0, 0)} b={V(-s * 0.02, 0.006, 0.012)} r={0.0112} m="skin" />
              <Capsule a={V(-s * 0.02, 0.006, 0.012)} b={V(-s * 0.036, 0.01, 0.0165)} r={0.0094} m="skin" />
              <Ball p={[-s * 0.038, 0.0115, 0.0235]} r={0.0068} sc={[0.9, 1.1, 0.3]} m="nail" seg={10} />
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}

export default function Kid({ clock, visible }: { clock: Clock; visible: React.RefObject<boolean> }) {
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  useFrame(({ clock: c }) => {
    if (body.current) body.current.visible = visible.current
    if (head.current) {
      head.current.rotation.x = -(0.3 + Math.sin(c.elapsedTime * 1.6) * 0.03)
      head.current.rotation.z = Math.sin(c.elapsedTime * 0.7) * 0.02
    }
  })
  return (
    <group>
      <BeanBag />
      <group ref={body}>
        <Merge>
          <Torso />
          <Legs />
        </Merge>
        <Head pivot={head} />
      </group>
      <Merge>
        <Arms clock={clock} />
      </Merge>
    </group>
  )
}
