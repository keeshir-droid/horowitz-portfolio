import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Bag, segment, worldUV, type Vec3 } from './util'
import * as T from './textures'

/**
 * One shared set of procedural textures + materials for the whole opening, built once and
 * disposed when the opening unmounts.
 */
function makeKit() {
  const bag = new Bag()
  const brick = T.brickTextures()
  const floor = T.floorTextures()
  const fabric = bag.add(T.fabricBump())
  const tex = {
    brick: bag.add(brick.map),
    brickBump: bag.add(brick.bump),
    roof: bag.add(T.roofTexture()),
    grass: bag.add(T.grassTexture()),
    concrete: bag.add(T.concreteTexture()),
    moon: bag.add(T.moonTexture()),
    glow: bag.add(T.glowTexture()),
    blob: bag.add(T.blobTexture()),
    edgeAO: bag.add(T.edgeAOTexture()),
    floor: bag.add(floor.map),
    floorBump: bag.add(floor.bump),
    wallSide: bag.add(T.wallpaperTexture('#3a3560', 7)),
    wallBack: bag.add(T.wallpaperTexture('#443d72', 8)),
    rug: bag.add(T.rugTexture()),
    quilt: bag.add(T.quiltTexture()),
    curtain: bag.add(T.curtainTexture()),
    tv: bag.add(T.tvScreenTexture()),
    cart: bag.add(T.cartLabelTexture()),
    wordmark: bag.add(T.gbWordmarkTexture()),
    posters: T.posterTextures().map((t) => bag.add(t)),
    litWarm: bag.add(T.litWindowTexture(true)),
    litCool: bag.add(T.litWindowTexture(false)),
    city: [1, 2, 3].map((s) => bag.add(T.buildingWindowsTexture(s))),
    fabric,
  }
  const std = (p: THREE.MeshStandardMaterialParameters) => bag.add(new THREE.MeshStandardMaterial(p))
  const mat = {
    brick: std({ map: tex.brick, bumpMap: tex.brickBump, bumpScale: 1.6, roughness: 0.92 }),
    plaster: std({ color: '#d8d0c0', roughness: 0.85 }),
    trim: std({ color: '#ece6d6', roughness: 0.45 }),
    stone: std({ color: '#55535c', roughness: 0.95 }),
    glass: std({ color: '#26304f', roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    roof: std({ map: tex.roof, roughness: 0.8 }),
    gutter: std({ color: '#2a2c36', roughness: 0.4, metalness: 0.6 }),
    grass: std({ map: tex.grass, roughness: 1 }),
    concrete: std({ map: tex.concrete, roughness: 0.95 }),
    asphalt: std({ color: '#121319', roughness: 0.9 }),
    foliage: std({ color: '#24493c', roughness: 0.95, bumpMap: fabric, bumpScale: 6 }),
    foliageDark: std({ color: '#1b3a2d', roughness: 0.95, bumpMap: fabric, bumpScale: 6 }),
    bark: std({ color: '#2b2019', roughness: 1 }),
    metalDark: std({ color: '#1b1c22', roughness: 0.45, metalness: 0.7 }),
    brass: std({ color: '#c9a25a', roughness: 0.35, metalness: 0.55 }),
    door: std({ color: '#6b2630', roughness: 0.55 }),

    wallSide: std({ map: tex.wallSide, roughness: 0.92 }),
    wallBack: std({ map: tex.wallBack, roughness: 0.92 }),
    ceiling: std({ color: '#2b2750', roughness: 1 }),
    floor: std({ map: tex.floor, bumpMap: tex.floorBump, bumpScale: 1.2, roughness: 0.5 }),
    skirting: std({ color: '#d9d2c0', roughness: 0.5 }),
    wood: std({ color: '#7a5238', roughness: 0.55 }),
    woodDark: std({ color: '#4a3324', roughness: 0.6 }),
    cream: std({ color: '#ebe3cf', roughness: 0.85, bumpMap: fabric, bumpScale: 0.6 }),
    quilt: std({ map: tex.quilt, roughness: 0.95, bumpMap: fabric, bumpScale: 0.8 }),
    curtain: std({ map: tex.curtain, roughness: 0.95, side: THREE.DoubleSide }),
    rug: std({ map: tex.rug, roughness: 1, bumpMap: fabric, bumpScale: 1 }),
    tvBody: std({ color: '#1c1c25', roughness: 0.38, metalness: 0.1 }),
    tvBezel: std({ color: '#26262f', roughness: 0.5 }),
    plasticGrey: std({ color: '#b9b4a6', roughness: 0.5 }),
    plasticDark: std({ color: '#2a2a33', roughness: 0.45 }),
    paperWhite: std({ color: '#f1ece0', roughness: 0.9 }),
    frameBlack: std({ color: '#141418', roughness: 0.5 }),
    tape: std({ color: '#f4efd8', roughness: 0.7, transparent: true, opacity: 0.75 }),
    gold: std({ color: '#e0b544', roughness: 0.3, metalness: 0.6 }),
    toyRed: std({ color: '#e0405a', roughness: 0.4 }),
    toyBlue: std({ color: '#3d7fd9', roughness: 0.4 }),
    toyYellow: std({ color: '#ffc857', roughness: 0.4 }),
    toyGreen: std({ color: '#5fbf5a', roughness: 0.4 }),
    switchPlate: std({ color: '#efeadf', roughness: 0.4 }),
    globeSea: std({ color: '#3d7fd9', roughness: 0.35 }),
    beanbag: std({ color: '#4cc9f0', roughness: 0.82, bumpMap: fabric, bumpScale: 1.4 }),

    jacket: std({ color: '#2c2c35', roughness: 0.82, bumpMap: fabric, bumpScale: 1.6 }),
    jacketRib: std({ color: '#383843', roughness: 0.8, bumpMap: fabric, bumpScale: 2 }),
    jacketLining: std({ color: '#3a3a44', roughness: 0.9 }),
    zip: std({ color: '#8d8d99', roughness: 0.4, metalness: 0.25 }),
    tee: std({ color: '#c8202e', roughness: 0.85, bumpMap: fabric, bumpScale: 0.8 }),
    jeans: std({ color: '#2a2f5a', roughness: 0.85, bumpMap: fabric, bumpScale: 1.4 }),
    sock: std({ color: '#ece8df', roughness: 0.9 }),
    skin: std({ color: '#c48a5f', roughness: 0.55 }),
    skinDark: std({ color: '#9a6444', roughness: 0.6 }),
    nail: std({ color: '#d8a589', roughness: 0.35 }),
    hair: std({ color: '#1b1720', roughness: 0.48 }),
    eye: std({ color: '#121212', roughness: 0.2 }),
    glassesRim: std({ color: '#1c1c22', roughness: 0.3, metalness: 0.2 }),
    lens: std({ color: '#cfe6ff', roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),

    gbBody: std({ color: '#cbc6b6', roughness: 0.48 }),
    gbBack: std({ color: '#aba697', roughness: 0.6 }),
    gbBezel: std({ color: '#43425a', roughness: 0.45 }),
    gbDark: std({ color: '#26262f', roughness: 0.4 }),
    gbBtn: std({ color: '#a11d4b', roughness: 0.3 }),
    gbPill: std({ color: '#8a8794', roughness: 0.45 }),
    gbSlot: std({ color: '#3e3c38', roughness: 0.9 }),
    cartLabel: std({ map: tex.cart, roughness: 0.6 }),
    cart: std({ color: '#9e9a8e', roughness: 0.55 }),
  }
  const basic = (p: THREE.MeshBasicMaterialParameters) => bag.add(new THREE.MeshBasicMaterial(p))
  const fx = {
    blob: basic({ map: tex.blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: '#000' }),
    edgeAO: basic({ map: tex.edgeAO, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: '#000' }),
  }
  // cache of shared geometries keyed by params
  const geos = new Map<string, THREE.BufferGeometry>()
  const geo = <G extends THREE.BufferGeometry>(key: string, make: () => G): G => {
    let g = geos.get(key)
    if (!g) {
      g = bag.add(make())
      geos.set(key, g)
    }
    return g as G
  }
  return { tex, mat, fx, geo, bag }
}

export type Kit = ReturnType<typeof makeKit>
type MatName = keyof Kit['mat']

const KitCtx = createContext<Kit | null>(null)

export function KitProvider({ children }: { children: ReactNode }) {
  const kit = useMemo(() => makeKit(), [])
  useEffect(() => () => kit.bag.dispose(), [kit])
  return <KitCtx.Provider value={kit}>{children}</KitCtx.Provider>
}

export function useKit() {
  const k = useContext(KitCtx)
  if (!k) throw new Error('KitProvider missing')
  return k
}

type MeshFlags = { cast?: boolean; recv?: boolean }

/** Axis-aligned box with world-space UVs (so tiling textures line up). */
export function WBox({ p, s, m, cast, recv = true, mats }: { p: Vec3; s: Vec3; m?: MatName; mats?: THREE.Material[] } & MeshFlags) {
  const k = useKit()
  const g = useMemo(() => worldUV(new THREE.BoxGeometry(s[0], s[1], s[2]), p), [p, s])
  useEffect(() => () => g.dispose(), [g])
  return <mesh geometry={g} material={mats ?? k.mat[m ?? 'plaster']} position={p} castShadow={cast} receiveShadow={recv} />
}

/** Rounded box (shared geometry per size). */
export function RBox({
  p,
  s,
  rad = 0.02,
  m,
  r,
  cast,
  recv = true,
  seg = 2,
}: { p: Vec3; s: Vec3; rad?: number; m: MatName; r?: Vec3; seg?: number } & MeshFlags) {
  const k = useKit()
  const g = k.geo(`rb${s.join(',')},${rad},${seg}`, () => new RoundedBoxGeometry(s[0], s[1], s[2], seg, rad))
  return <mesh geometry={g} material={k.mat[m]} position={p} rotation={r} castShadow={cast} receiveShadow={recv} />
}

/** Sphere (optionally squashed). */
export function Ball({ p, r = 0.1, sc, m, cast, recv = true, seg = 20, rot }: { p: Vec3; r?: number; sc?: Vec3; m: MatName; seg?: number; rot?: Vec3 } & MeshFlags) {
  const k = useKit()
  const g = k.geo(`sp${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7))))
  const scale: Vec3 = sc ? [sc[0] * r, sc[1] * r, sc[2] * r] : [r, r, r]
  return <mesh geometry={g} material={k.mat[m]} position={p} scale={scale} rotation={rot} castShadow={cast} receiveShadow={recv} />
}

/** Capsule between two world points. */
export function Capsule({ a, b, r, m, cast, recv = true }: { a: THREE.Vector3; b: THREE.Vector3; r: number; m: MatName } & MeshFlags) {
  const k = useKit()
  const { pos, quat, len } = useMemo(() => segment(a, b), [a, b])
  // the straight part spans a->b; the round caps overlap the neighbouring joints
  const L = Math.max(0.001, Math.round(len * 1000) / 1000)
  const g = k.geo(`cap${r},${L}`, () => new THREE.CapsuleGeometry(r, L, 6, 14))
  return <mesh geometry={g} material={k.mat[m]} position={pos} quaternion={quat} castShadow={cast} receiveShadow={recv} />
}

/** Cylinder between two points (for poles, cables, rods). */
export function Rod({ a, b, r, m, cast, recv = true, seg = 10 }: { a: THREE.Vector3; b: THREE.Vector3; r: number; m: MatName; seg?: number } & MeshFlags) {
  const k = useKit()
  const { pos, quat, len } = useMemo(() => segment(a, b), [a, b])
  const g = k.geo(`cyl${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg))
  return <mesh geometry={g} material={k.mat[m]} position={pos} quaternion={quat} scale={[r, len, r]} castShadow={cast} receiveShadow={recv} />
}

/** Soft contact shadow on a horizontal surface. */
export function Blob({ p, s, o = 1, rz = 0 }: { p: Vec3; s: [number, number]; o?: number; rz?: number }) {
  const k = useKit()
  const g = k.geo('plane', () => new THREE.PlaneGeometry(1, 1))
  const m = useMemo(() => {
    if (o === 1) return k.fx.blob
    const c = k.fx.blob.clone()
    c.opacity = o
    return c
  }, [k, o])
  useEffect(() => () => void (m !== k.fx.blob && m.dispose()), [m, k])
  return <mesh geometry={g} material={m} position={p} rotation={[-Math.PI / 2, 0, rz]} scale={[s[0], s[1], 1]} renderOrder={1} />
}

/** Additive glow sprite. */
export function Glow({ p, s, color, o = 1 }: { p: Vec3; s: number; color: string; o?: number }) {
  const k = useKit()
  return (
    <sprite position={p} scale={[s, s, 1]} renderOrder={5}>
      <spriteMaterial map={k.tex.glow} color={color} transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
    </sprite>
  )
}

/**
 * Bakes the static meshes below it into one mesh per (material, shadow flags) after mount, to
 * keep draw calls low (the set is built from hundreds of small primitives). Instanced meshes,
 * multi-material meshes and anything under an object with `userData.noMerge` stay live.
 */
export function Merge({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    root.updateWorldMatrix(true, true)
    const inv = root.matrixWorld.clone().invert()
    const buckets = new Map<string, THREE.Mesh[]>()
    const walk = (o: THREE.Object3D) => {
      if (o.userData.noMerge) return
      const m = o as THREE.Mesh
      if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(m.material) && m.visible) {
        const key = `${(m.material as THREE.Material).uuid}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}`
        const b = buckets.get(key)
        if (b) b.push(m)
        else buckets.set(key, [m])
      }
      for (const c of o.children) walk(c)
    }
    for (const c of root.children) walk(c)
    const made: THREE.Mesh[] = []
    const hidden: THREE.Mesh[] = []
    const tmp = new THREE.Matrix4()
    for (const list of buckets.values()) {
      if (list.length < 2) continue
      const geos = list.map((m) => {
        const g = new THREE.BufferGeometry()
        const src = m.geometry
        const count = src.getAttribute('position').count
        for (const name of ['position', 'normal', 'uv']) {
          const a = src.getAttribute(name)
          if (a) g.setAttribute(name, a.clone())
        }
        if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2))
        if (src.index) g.setIndex(src.index.clone())
        else g.setIndex(Array.from({ length: count }, (_, i) => i))
        g.applyMatrix4(tmp.multiplyMatrices(inv, m.matrixWorld))
        return g
      })
      const merged = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      if (!merged) continue
      const src = list[0]
      const mesh = new THREE.Mesh(merged, src.material)
      mesh.castShadow = src.castShadow
      mesh.receiveShadow = src.receiveShadow
      mesh.renderOrder = src.renderOrder
      root.add(mesh)
      made.push(mesh)
      for (const m of list) {
        m.visible = false
        hidden.push(m)
      }
    }
    return () => {
      for (const m of made) {
        root.remove(m)
        m.geometry.dispose()
      }
      for (const m of hidden) m.visible = true
    }
  }, [])
  return <group ref={ref}>{children}</group>
}
