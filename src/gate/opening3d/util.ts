import * as THREE from 'three'

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
export type Vec3 = [number, number, number]

/** Shared clock: `t` is the single opening timeline (seconds). */
export interface Clock {
  t: number
}

// Handheld geometry (world space). The screen faces the kid: normal = (0, .6, .8).
export const GB_POS = V(0.5, 0.82, -3.25)
export const GB_TILT = -Math.atan2(0.6, 0.8)
export const GB_NORMAL = V(0, 0.6, 0.8)
export const GB_UP = V(0, 0.8, -0.6)
const GB_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(GB_TILT, 0, 0))
/** A point in the handheld's local frame (x right, y up the face, z out of the screen) -> world. */
export const gbToWorld = (x: number, y: number, z: number) => V(x, y, z).applyQuaternion(GB_Q).add(GB_POS)

/** Small deterministic PRNG so every load (and every ?t= frame) looks the same. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Collects GPU resources made in a component so they can be disposed on unmount. */
export class Bag {
  items: { dispose: () => void }[] = []
  add<T extends { dispose: () => void }>(x: T): T {
    this.items.push(x)
    return x
  }
  dispose() {
    for (const i of this.items) i.dispose()
    this.items.length = 0
  }
}

/**
 * Replace a geometry's UVs with planar world-space UVs (1 unit = 1 metre), so tiling textures
 * (brick, wallpaper, wood) line up across separate boxes. `offset` = the mesh's world position.
 */
export function worldUV(geo: THREE.BufferGeometry, offset: Vec3 = [0, 0, 0]) {
  const p = geo.attributes.position
  const n = geo.attributes.normal
  const uv = geo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + offset[0]
    const y = p.getY(i) + offset[1]
    const z = p.getZ(i) + offset[2]
    const ax = Math.abs(n.getX(i))
    const ay = Math.abs(n.getY(i))
    const az = Math.abs(n.getZ(i))
    if (az >= ax && az >= ay) uv.setXY(i, n.getZ(i) >= 0 ? x : -x, y)
    else if (ax >= ay) uv.setXY(i, n.getX(i) >= 0 ? -z : z, y)
    else uv.setXY(i, x, -z)
  }
  uv.needsUpdate = true
  return geo
}

/** Orientation (quaternion) + midpoint + length for a segment a->b, for capsules/cylinders. */
export function segment(a: THREE.Vector3, b: THREE.Vector3) {
  const dir = b.clone().sub(a)
  const len = dir.length()
  const quat = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize())
  return { pos: a.clone().add(b).multiplyScalar(0.5), quat, len }
}

/** Rounded-rectangle shape (independent corner radii: tl, tr, br, bl), centred on the origin. */
export function roundedRect(w: number, h: number, r: [number, number, number, number]) {
  const [tl, tr, br, bl] = r
  const x = -w / 2
  const y = -h / 2
  const s = new THREE.Shape()
  s.moveTo(x + bl, y)
  s.lineTo(x + w - br, y)
  s.quadraticCurveTo(x + w, y, x + w, y + br)
  s.lineTo(x + w, y + h - tr)
  s.quadraticCurveTo(x + w, y + h, x + w - tr, y + h)
  s.lineTo(x + tl, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - tl)
  s.lineTo(x, y + bl)
  s.quadraticCurveTo(x, y, x + bl, y)
  return s
}
