/**
 * Karate fight choreography (pure data + sampling). Imported by fight.ts; kept free of DOM/canvas code and imported
 * with explicit .ts extensions so the contact geometry can be checked with plain Node (type stripping).
 */
import {
  BLOCK, CHAMBER, DOWN, GYAKU, HURT, HURT_BODY, JAB, KAMAE, KAMAE_LOW, LAUNCH, MAE, MAWASHI, MAWASHI_CHAMBER, P, REI, YOI,
  copyPose, effector, lerpPose, newPose, type Face, type Pose,
} from './rig.ts'
import { clamp, ease, easeIn, easeOut, win } from './kit.ts'

export const FIGHT_LEN = 5.7
/** Fight-local second at which the K.O. lands. */
export const KO_AT = 4.72

// ───────────────────────── choreography ─────────────────────────
export interface Key {
  t: number
  p: Pose
  /** Seconds the pose is held after its key (hit-stop). */
  hold?: number
  /** Easing of the segment arriving at this key: 0 smooth, 1 snap-in (strike), 2 settle (ease-out). */
  e?: 0 | 1 | 2
}
const k = (t: number, base: Pose, x: number, hold = 0, e: 0 | 1 | 2 = 0, extra?: Partial<Pose>): Key => ({ t, p: P({ ...base, ...extra, x }), hold, e })

const STAGGER = P({ ...KAMAE, t: 0.32, h: 0.24, a1a: 0.55, a1b: 1.3, a2a: 0.3, a2b: 1.0, l1a: 0.3, l1b: 0.12, l2a: -0.3, l2b: -0.05 })
/** Impact-frame reactions (mild); the full reaction pose follows ~0.1 s later. */
const HIT_HEAD = P({ ...KAMAE, t: -0.14, h: -0.42, a1a: 0.9, a1b: 1.6, a2a: 0.2, a2b: 1.9, o1: 1, o2: 1 })
const HIT_BODY = P({ ...KAMAE, t: 0.34, h: 0.22, a1a: 0.5, a1b: 1.1, a2a: 0.3, a2b: 1.0, l1a: 0.3, l1b: 0.16 })
const BLOCK_LOW = P({ ...KAMAE, t: 0.08, h: 0.1, a1a: 0.75, a1b: 0.95, a2a: 0.45, a2b: 2.7 })

/** Risheek (left, facing right). x = forward displacement. */
export const R_KEYS: Key[] = [
  k(0, KAMAE, 0),
  k(1.05, KAMAE, 0),
  k(1.4, KAMAE, 44),
  k(1.48, KAMAE, 46),
  k(1.58, JAB, 62, 0.05, 1),
  k(1.7, KAMAE, 50, 0, 2),
  k(1.86, HIT_BODY, 50, 0.07, 1),
  k(1.98, HURT_BODY, 36, 0, 2),
  k(2.18, KAMAE, 34, 0, 2),
  k(2.3, KAMAE, 46),
  k(2.4, JAB, 66, 0.05, 1),
  k(2.5, KAMAE, 62, 0, 2),
  k(2.6, GYAKU, 72, 0.05, 1),
  k(2.7, CHAMBER, 74, 0, 2),
  k(2.88, MAE, 78, 0.07, 1),
  k(3.05, KAMAE, 82, 0, 2),
  k(3.24, KAMAE, 82),
  k(3.38, BLOCK_LOW, 78, 0.05, 1),
  k(3.52, KAMAE, 84, 0, 2),
  k(3.66, GYAKU, 96, 0.05, 1),
  k(3.76, CHAMBER, 100, 0, 2),
  k(3.92, MAE, 104, 0.06, 1),
  k(4.1, KAMAE_LOW, 106, 0, 2),
  k(4.3, KAMAE_LOW, 106),
  k(4.52, MAWASHI_CHAMBER, 110, 0, 0),
  k(KO_AT, MAWASHI, 114, 0.16, 1),
  k(4.98, MAWASHI_CHAMBER, 116, 0, 2),
  k(5.15, KAMAE, 114, 0, 2),
  k(5.3, YOI, 112),
  k(5.52, REI, 112, 0, 2),
  k(FIGHT_LEN, REI, 112),
]

/** Opponent (right, facing left). x = forward displacement toward Risheek. */
export const O_KEYS: Key[] = [
  k(0, KAMAE, 0),
  k(1.05, KAMAE, 0),
  k(1.4, KAMAE, 44),
  k(1.58, BLOCK, 48, 0.05, 1),
  k(1.72, KAMAE, 56, 0, 2),
  k(1.86, GYAKU, 74, 0.07, 1),
  k(2.05, KAMAE, 60, 0, 2),
  k(2.3, KAMAE, 58),
  k(2.4, HIT_HEAD, 56, 0.05, 1),
  k(2.5, HURT, 46, 0, 2),
  k(2.6, HIT_BODY, 50, 0.05, 1),
  k(2.7, HURT_BODY, 44, 0, 2),
  k(2.88, HIT_BODY, 44, 0.07, 1),
  k(3.02, HURT_BODY, 24, 0, 2),
  k(3.12, KAMAE, 22, 0, 2),
  k(3.22, CHAMBER, 26),
  k(3.38, MAE, 38, 0.05, 1),
  k(3.52, KAMAE, 28, 0, 2),
  k(3.66, HIT_BODY, 26, 0.05, 1),
  k(3.78, HURT_BODY, 18, 0, 2),
  k(3.92, HIT_BODY, 16, 0.06, 1),
  k(4.05, HURT_BODY, 4, 0, 2),
  k(4.2, STAGGER, 4, 0, 2),
  k(4.6, STAGGER, 8),
  k(KO_AT, HIT_HEAD, 8, 0.16, 1),
  k(5.05, LAUNCH, -70, 0, 2),
  k(5.36, DOWN, -170, 0, 1),
  k(FIGHT_LEN, DOWN, -172),
]

export function sample(track: readonly Key[], t: number, out: Pose): Pose {
  if (t <= track[0].t) return copyPose(out, track[0].p)
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i]
    const b = track[i + 1]
    if (t >= b.t) continue
    const start = a.t + (a.hold ?? 0)
    if (t <= start) return copyPose(out, a.p)
    let u = (t - start) / (b.t - start)
    u = b.e === 1 ? easeIn(u) * 0.6 + u * 0.4 : b.e === 2 ? easeOut(u) : ease(u)
    return lerpPose(out, a.p, b.p, u)
  }
  return copyPose(out, track[track.length - 1].p)
}

// ───────────────────────── hits ─────────────────────────
export type Eff = 'fist1' | 'fist2' | 'foot1' | 'foot2'
export interface Hit {
  t: number
  by: 'R' | 'O'
  eff: Eff
  dmg: number
  block?: boolean
  /** Combo count shown after this hit (0 = none). */
  combo?: number
  ko?: boolean
  /** What the strike lands on; the defender's impact key is nudged so this point meets the fist/foot. */
  aim: 'head' | 'chest'
  /** Distance from the contact to the aimed point's centre (head radius, body depth, or a guard in front). */
  gap: number
  /** World position of the contact (filled at init). */
  x: number
  y: number
}
const h = (t: number, by: 'R' | 'O', eff: Eff, dmg: number, aim: 'head' | 'chest', gap: number, o: Partial<Hit> = {}): Hit => ({ t, by, eff, dmg, aim, gap, x: 0, y: 0, ...o })
export const HITS: readonly Hit[] = [
  h(1.58, 'R', 'fist1', 0, 'head', 42, { block: true }),
  h(1.86, 'O', 'fist2', 16, 'chest', 12),
  h(2.4, 'R', 'fist1', 8, 'head', 22, { combo: 1 }),
  h(2.6, 'R', 'fist2', 12, 'chest', 12, { combo: 2 }),
  h(2.88, 'R', 'foot1', 16, 'chest', 14, { combo: 3 }),
  h(3.38, 'O', 'foot1', 3, 'chest', 34, { block: true }),
  h(3.66, 'R', 'fist2', 12, 'chest', 12, { combo: 1 }),
  h(3.92, 'R', 'foot1', 18, 'chest', 14, { combo: 2 }),
  h(KO_AT, 'R', 'foot1', 34, 'head', 20, { ko: true }),
]
/** Fight-local times worth a sound: hits (impact), blocks (blip), K.O. */
export const HIT_TIMES = HITS.map((x) => ({ t: x.t, block: !!x.block, ko: !!x.ko }))

export const R_BASE = -120
export const O_BASE = 120
const tmpPose = newPose()
const pt = { x: 0, y: 0 }
/** Horizontal correction applied to each defender impact key (exported for the geometry check). */
export const NUDGE: number[] = []
// Contact points: sample the attacker at the impact frame once, then nudge the defender's impact key so the aimed
// point (head or chest) sits `gap` behind the fist/foot. Runs once at module load.
for (const x of HITS) {
  const atk = x.by === 'R' ? R_KEYS : O_KEYS
  const defKeys = x.by === 'R' ? O_KEYS : R_KEYS
  sample(atk, x.t, tmpPose)
  effector(tmpPose, x.eff, pt)
  x.x = x.by === 'R' ? R_BASE + pt.x : O_BASE - pt.x
  x.y = pt.y
  const key = defKeys.find((kk) => Math.abs(kk.t - x.t) < 1e-6)
  if (!key) {
    NUDGE.push(0)
    continue
  }
  effector(key.p, x.aim, pt)
  if (x.by === 'R') {
    // defender is the opponent (world x = O_BASE - pose.x), standing to the right of the contact
    const want = x.x + x.gap
    const d = want - (O_BASE - pt.x)
    key.p.x -= d
    NUDGE.push(-d)
  } else {
    const want = x.x - x.gap
    const d = want - (R_BASE + pt.x)
    key.p.x += d
    NUDGE.push(d)
  }
}

export function healthOf(who: 'R' | 'O', t: number, trail: boolean): number {
  let v = 100
  for (const x of HITS) {
    if (x.by === who || x.dmg <= 0) continue
    if (!trail) {
      if (t >= x.t) v -= x.dmg
    } else v -= x.dmg * ease(win(t, x.t + 0.32, x.t + 0.78))
  }
  return Math.max(0, v)
}

export function heatOf(who: 'R' | 'O', t: number): number {
  let v = 0
  for (const x of HITS) {
    const u = ease(win(t, x.t, x.t + 0.12))
    if (u <= 0) continue
    if (x.by === who) v += (x.block ? 0.06 : 0.17) * u
    else v += (x.block ? 0.05 : 0.11) * u
  }
  // a Heat burst spends the gauge on the finisher
  if (who === 'R') v *= 1 - ease(win(t, KO_AT, KO_AT + 0.5))
  return clamp(v)
}
/** Heat activates when Risheek's gauge fills (on the 2nd combo's last hit). */
export const HEAT_ON = 3.92


export function faceOf(who: 'R' | 'O', t: number): Face {
  if (who === 'R' && t >= 5.25) return 'calm'
  for (const x of HITS) {
    if (x.block) continue
    if (x.by !== who && t >= x.t && t < x.t + 0.3) return 'hurt'
    if (x.by === who && t >= x.t - 0.1 && t < x.t + 0.14) return 'shout'
  }
  return 'fight'
}
