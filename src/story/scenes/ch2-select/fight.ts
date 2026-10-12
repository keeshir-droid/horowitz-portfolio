/**
 * The karate fight (Chapter 2 showpiece). Everything is a pure function of the fight-local time `ft` (seconds,
 * 0..FIGHT_LEN). Choreography = keyframed full-body poses with holds (hit-stop) on impact frames; the finisher is
 * keyframed slow (slow motion) and gets afterimages, letterbox bars and a K.O. slam.
 */
import { TXT } from './config'
import { back, clamp, ease, easeOut, flash, glowAt, grad, hash, lerp, numStr, quad, rays, star, txt, win, type G, type Lay } from './kit'
import { HEAT_ON, HITS, KO_AT, O_BASE, O_KEYS, R_BASE, R_KEYS, faceOf, healthOf, heatOf, sample, type Eff, type Hit, type Key } from './moves'
import { INK, drawFigure, effector, newPose } from './rig'

export { FIGHT_LEN, HIT_TIMES, KO_AT } from './moves'

const pR = newPose()
const pO = newPose()
const tmpPose = newPose()
const pt = { x: 0, y: 0 }

// ───────────────────────── camera ─────────────────────────
export interface FightCam {
  cx: number
  gy: number
  s: number
  shakeX: number
  shakeY: number
}
const cam: FightCam = { cx: 0, gy: 0, s: 1, shakeX: 0, shakeY: 0 }
/** Where Risheek stood in the last drawn fight frame (screen x of his hip, ground line, scale): for the photo slot. */
export const shot = { x: 0, gy: 0, s: 1 }

/** Ground line and scale for a layout. */
export function arenaFrame(L: Lay): { gy: number; s: number } {
  const s = L.portrait ? Math.min(1.86, (L.W - 20) / 385) : Math.min(1.42, (L.H * 0.44) / 225)
  const gy = L.portrait ? L.H * 0.69 : L.H * 0.835
  return { gy, s }
}

// ───────────────────────── backdrop ─────────────────────────
/** Crowd row colours, nearest row darkest (precomputed: no string building per frame). */
const CROWD: readonly string[] = Array.from({ length: 10 }, (_, r) => {
  const v = 18 + r * 5
  return `rgb(${v + 20},${v - 4},${v + 18})`
})
function arena(g: G, L: Lay, ft: number, camX: number, crowdJump: number, gyIn: number, s: number): void {
  const { W, H } = L
  const gy = gyIn
  const M = Math.min(W, H)
  const back = gy - (L.portrait ? 0.24 : 0.19) * M
  // wall
  g.fillStyle = grad(g, `ar-wall:${W}x${H}`, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, '#12081c')
    gr.addColorStop(0.45, '#3a0d26')
    gr.addColorStop(1, '#14060f')
    return gr
  })
  g.fillRect(-60, -60, W + 120, H + 120)
  // light shafts from the rig
  g.save()
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 5; i++) {
    const x0 = W * (0.1 + i * 0.2) + Math.sin(ft * 0.7 + i) * 18 - camX * s * 0.15
    g.globalAlpha = 0.05 + 0.03 * Math.sin(ft * 1.3 + i * 2)
    g.fillStyle = '#ff78aa'
    quad(g, x0 - 14, -20, x0 + 14, -20, x0 + 150 - i * 40, back, x0 - 150 - i * 40 + 80, back)
    g.fill()
  }
  g.restore()
  // truss with lamps
  const ty = Math.max(L.top + 4, back - M * 0.62)
  g.fillStyle = '#0c0610'
  g.fillRect(-60, ty - 6, W + 120, 12)
  for (let i = 0; i < 14; i++) {
    const x = ((i * 113 - camX * s * 0.2) % (W + 120) + W + 120) % (W + 120) - 60
    glowAt(g, '#ffd7f0', x, ty + 8, 34, 22, 0.55)
    g.fillStyle = '#fff6fb'
    g.beginPath()
    g.arc(x, ty + 6, 4.5, 0, Math.PI * 2)
    g.fill()
  }
  // crowd: rows of silhouettes rising behind the barrier
  const barrierTop = back - M * 0.055
  const rows = L.portrait ? 16 : 5
  for (let r = rows - 1; r >= 0; r--) {
    const depth = 1 - r * (L.portrait ? 0.035 : 0.13)
    const rh = M * 0.032 * depth
    const y0 = barrierTop - r * rh * 1.6
    const step = rh * 2.3
    const off = (-camX * s * 0.45 * depth) % step
    g.fillStyle = CROWD[Math.min(9, L.portrait ? r >> 1 : r)]
    g.beginPath()
    for (let x = -step * 2 + off, i = 0; x < W + step * 2; x += step, i++) {
      const id = i + r * 97
      const jump = crowdJump * (hash(id) > 0.4 ? 1 : 0.2) * Math.abs(Math.sin(ft * 9 + hash(id + 3) * 6)) * rh * 0.9
      const by = y0 - jump + hash(id + 5) * rh * 0.3
      const hx = x + (r % 2) * step * 0.5
      g.moveTo(hx + rh * 0.6, by - rh * 0.9)
      g.arc(hx, by - rh * 0.9, rh * 0.6, 0, Math.PI * 2)
      g.moveTo(hx - rh * 1.05, by + rh * 1.2)
      g.quadraticCurveTo(hx - rh, by - rh * 0.1, hx, by - rh * 0.15)
      g.quadraticCurveTo(hx + rh, by - rh * 0.1, hx + rh * 1.05, by + rh * 1.2)
      g.closePath()
      if (crowdJump > 0.3 && hash(id + 9) > 0.86) {
        // raised arm
        g.moveTo(hx + rh * 0.7, by)
        g.lineTo(hx + rh * 1.1, by - rh * 1.9)
        g.lineTo(hx + rh * 1.4, by - rh * 1.8)
        g.lineTo(hx + rh * 1.0, by + rh * 0.2)
        g.closePath()
      }
    }
    g.fill()
  }
  // camera flashes in the crowd
  for (let i = 0; i < 6; i++) {
    const slot = Math.floor(ft * 5 + i * 0.37)
    const life = (ft * 5 + i * 0.37) % 1
    if (hash(slot * 13 + i) < 0.55 || life > 0.35) continue
    const x = hash(slot * 7 + i) * W
    const y = barrierTop - hash(slot * 3 + i) * M * 0.18
    const a = 1 - life / 0.35
    glowAt(g, '#ffffff', x, y, 22, 22, a)
    g.save()
    g.globalAlpha = a
    g.fillStyle = '#fff'
    star(g, x, y, 1.5, 9, 4, 0.3)
    g.fill()
    g.restore()
  }
  // barrier (hoarding)
  g.fillStyle = '#16101e'
  g.fillRect(-60, barrierTop, W + 120, back - barrierTop + 2)
  g.fillStyle = '#c0283c'
  g.fillRect(-60, barrierTop + 5, W + 120, 5)
  g.fillStyle = 'rgba(255,255,255,.06)'
  const pw = 180
  const poff = ((-camX * s) % pw) - pw
  for (let x = poff; x < W + pw; x += pw) g.fillRect(x, barrierTop + 16, pw - 12, back - barrierTop - 22)
  // mat in perspective: depth factor d(y) = 1 at the fighters' plane
  const vy = back - (gy - back) * 1.25 // vanishing line
  const dAt = (y: number): number => (y - vy) / (gy - vy)
  const xs = (wx: number, y: number): number => W / 2 + (wx - camX) * s * dAt(y)
  const yb = H + 40
  // outer floor
  g.fillStyle = '#1a1424'
  g.fillRect(-60, back, W + 120, H - back + 60)
  // competition area (blue) with red border
  const half = 330
  g.fillStyle = '#c0283c'
  quad(g, xs(-half - 34, back), back, xs(half + 34, back), back, xs(half + 34, yb), yb, xs(-half - 34, yb), yb)
  g.fill()
  g.fillStyle = '#213a8c'
  quad(g, xs(-half, back + 3), back + 3, xs(half, back + 3), back + 3, xs(half, yb), yb, xs(-half, yb), yb)
  g.fill()
  // tatami seams
  g.strokeStyle = 'rgba(0,0,0,.28)'
  g.lineWidth = 2
  g.beginPath()
  for (let wx = -half; wx <= half; wx += 66) {
    g.moveTo(xs(wx, back + 3), back + 3)
    g.lineTo(xs(wx, yb), yb)
  }
  for (let i = 1; i < 6; i++) {
    const y = back + (gy - back) * (i / 3) * (1 + i * 0.12)
    if (y > H + 40) break
    g.moveTo(xs(-half, y), y)
    g.lineTo(xs(half, y), y)
  }
  g.stroke()
  // starting lines (generic tournament markings)
  g.fillStyle = 'rgba(255,255,255,.55)'
  for (const wx of [-60, 60]) {
    const y0 = gy - (gy - back) * 0.38
    const y1 = gy + (gy - back) * 0.25
    quad(g, xs(wx - 2, y0), y0, xs(wx + 2, y0), y0, xs(wx + 2, y1), y1, xs(wx - 2, y1), y1)
    g.fill()
  }
  // edge highlight
  g.fillStyle = 'rgba(255,255,255,.12)'
  g.fillRect(-60, back, W + 120, 2)
  // spotlight pool on the fighters
  g.save()
  g.globalCompositeOperation = 'lighter'
  glowAt(g, '#ff8fb8', W / 2, gy - 6, W * 0.5, (gy - back) * 0.9, 0.22)
  g.restore()
}

function vignette(g: G, L: Lay): void {
  const { W, H } = L
  g.fillStyle = grad(g, `vig:${W}x${H}`, (c) => {
    const r = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75)
    r.addColorStop(0, 'rgba(0,0,0,0)')
    r.addColorStop(1, 'rgba(0,0,0,.55)')
    return r
  })
  g.fillRect(0, 0, W, H)
}

// ───────────────────────── effects ─────────────────────────
function spark(g: G, x: number, y: number, age: number, size: number, block: boolean, ko: boolean, seed: number): void {
  const life = ko ? 0.45 : 0.3
  const u = age / life
  if (u < 0 || u > 1) return
  const e = easeOut(u)
  const fade = 1 - u
  g.save()
  g.globalCompositeOperation = 'lighter'
  glowAt(g, block ? '#7fc4ff' : '#ffcf6a', x, y, size * (1.4 + e), size * (1.4 + e), fade * 0.9)
  g.restore()
  // shock ring
  g.save()
  g.strokeStyle = block ? '#bfe4ff' : '#fff3c4'
  g.globalAlpha = fade
  g.lineWidth = size * 0.12 * fade + 1
  g.beginPath()
  g.ellipse(x, y, size * (0.4 + e * 1.6), size * (0.3 + e * 1.1), -0.4, 0, Math.PI * 2)
  g.stroke()
  g.restore()
  rays(g, x, y, size * 0.2, size * (1.1 + e * 1.6), ko ? 22 : 12, block ? '#d6eeff' : '#ffffff', fade, seed, 0.05)
  if (!block) rays(g, x, y, size * 0.15, size * (0.8 + e * 1.0), 10, '#ff9a3c', fade * 0.9, seed + 40, 0.07)
  g.save()
  g.globalAlpha = Math.min(1, fade * 1.6)
  g.fillStyle = block ? '#9fd6ff' : '#ffd84a'
  star(g, x, y, size * 0.22 * (1 - u * 0.5), size * (0.7 + e * 0.5), ko ? 10 : 8, seed)
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(x, y, size * 0.28 * (1 - u), 0, Math.PI * 2)
  g.fill()
  // debris
  g.fillStyle = block ? '#d6eeff' : '#fff3a8'
  for (let i = 0; i < 9; i++) {
    const a = hash(seed + i) * Math.PI * 2
    const d = size * (0.5 + e * (1.6 + hash(seed + i + 20) * 1.4))
    const px = x + Math.cos(a) * d
    const py = y + Math.sin(a) * d + e * e * size * 0.8
    const r = (2 + hash(seed + i + 9) * 4) * fade
    g.fillRect(px - r, py - r, r * 2, r * 2)
  }
  g.restore()
}

/** Smear arc behind a striking limb: the effector path between t-0.09 and t. */
function smear(g: G, track: readonly Key[], eff: Eff, t: number, base: number, flip: boolean, s: number, cx: number, gy: number, color: string, alpha: number): void {
  if (alpha <= 0.02) return
  g.save()
  g.globalAlpha = alpha
  g.fillStyle = color
  g.beginPath()
  const n = 6
  for (let i = 0; i <= n; i++) {
    sample(track, t - 0.09 * (1 - i / n), tmpPose)
    effector(tmpPose, eff, pt)
    const wx = flip ? base - pt.x : base + pt.x
    const x = cx + wx * s
    const y = gy + pt.y * s
    const w = 3 + 13 * (i / n)
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y - w)
  }
  for (let i = n; i >= 0; i--) {
    sample(track, t - 0.09 * (1 - i / n), tmpPose)
    effector(tmpPose, eff, pt)
    const wx = flip ? base - pt.x : base + pt.x
    const x = cx + wx * s
    const y = gy + pt.y * s
    const w = 3 + 13 * (i / n)
    g.lineTo(x, y + w)
  }
  g.closePath()
  g.fill()
  g.restore()
}

function dust(g: G, x: number, y: number, age: number, s: number): void {
  const u = age / 0.6
  if (u < 0 || u > 1) return
  const e = easeOut(u)
  g.save()
  g.globalAlpha = (1 - u) * 0.7
  g.fillStyle = '#c9b8d8'
  for (let i = 0; i < 7; i++) {
    const d = (i - 3) * 22 * s * (0.4 + e)
    g.beginPath()
    g.arc(x + d, y - 6 * s - e * 18 * s * hash(i + 2), (10 + 12 * hash(i)) * s * (0.5 + e * 0.8), 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

// ───────────────────────── HUD ─────────────────────────
function healthBar(g: G, L: Lay, x: number, y: number, w: number, hgt: number, main: number, trail: number, mirror: boolean, heat: number, heatOn: number, name: string, wins: number, t: number): void {
  const sk = hgt * 0.7
  const shape = (inset: number) => {
    if (mirror) quad(g, x + inset, y + inset, x + w - sk - inset, y + inset, x + w - inset, y + hgt - inset, x + sk + inset, y + hgt - inset)
    else quad(g, x + sk + inset, y + inset, x + w - inset, y + inset, x + w - sk - inset, y + hgt - inset, x + inset, y + hgt - inset)
  }
  // frame
  shape(-4)
  g.fillStyle = INK
  g.fill()
  shape(-2)
  g.fillStyle = '#d9dbe8'
  g.fill()
  shape(0)
  g.fillStyle = '#1a0a12'
  g.fill()
  g.save()
  shape(0)
  g.clip()
  const fill = (frac: number, color: string | CanvasGradient) => {
    const fw = w * clamp(frac / 100)
    g.fillStyle = color
    // anchored at the outer edge: damage shows next to the timer
    if (mirror) g.fillRect(x + w - fw, y, fw, hgt)
    else g.fillRect(x, y, fw, hgt)
  }
  fill(trail, '#e0343c')
  const low = main < 30
  const pulse = low ? 0.5 + 0.5 * Math.sin(t * 22) : 0
  fill(main, low ? (pulse > 0.5 ? '#ff7a3c' : '#ff5a2c') : grad(g, `hp:${y}:${hgt}`, (c) => {
    const gr = c.createLinearGradient(0, y, 0, y + hgt)
    gr.addColorStop(0, '#fff8b0')
    gr.addColorStop(0.45, '#ffd84a')
    gr.addColorStop(1, '#e09a10')
    return gr
  }))
  // gloss
  g.fillStyle = 'rgba(255,255,255,.28)'
  g.fillRect(x, y + 2, w, hgt * 0.22)
  g.restore()
  // heat gauge (thin, segmented) under the bar
  const hy = y + hgt + 8
  const hh = Math.max(8, hgt * 0.32)
  const hw = w * 0.72
  const hx = mirror ? x + w - hw - 4 - sk * 0.3 : x + 4 + sk * 0.3
  g.fillStyle = INK
  g.fillRect(hx - 3, hy - 3, hw + 6, hh + 6)
  g.fillStyle = '#0d1430'
  g.fillRect(hx, hy, hw, hh)
  const fw = hw * heat
  const on = heatOn > 0
  const hp = on ? 0.5 + 0.5 * Math.sin(t * 30) : 0
  g.fillStyle = on ? (hp > 0.5 ? '#ffffff' : '#7fd0ff') : '#3d8cff'
  if (mirror) g.fillRect(hx + hw - fw, hy, fw, hh)
  else g.fillRect(hx, hy, fw, hh)
  g.fillStyle = INK
  for (let i = 1; i < 5; i++) g.fillRect(hx + (hw * i) / 5 - 1.5, hy, 3, hh)
  if (on) {
    const lx = mirror ? hx - 10 : hx + hw + 10
    txt(g, L, 'HEAT', lx, hy + hh + 1, { f: 'p', size: Math.max(10, hh * 1.1), align: mirror ? 'right' : 'left', color: hp > 0.5 ? '#fff' : '#7fd0ff', stroke: INK, strokeW: 4 })
  }
  // name
  const ns = L.portrait ? 30 * L.k * 0.9 : 30
  txt(g, L, name, mirror ? x + w - 6 - sk * 0.3 : x + 6 + sk * 0.3, hy + hh + ns * 0.98, { f: 'd', size: ns, align: mirror ? 'right' : 'left', stroke: INK, strokeW: 6, color: '#fff', spacing: 1 })
  // round-win markers next to the timer
  for (let i = 0; i < 2; i++) {
    const mx = mirror ? x + sk * 0.4 + 16 + i * 22 : x + w - sk * 0.4 - 16 - i * 22
    const my = hy + hh * 0.5 + 2
    g.beginPath()
    g.moveTo(mx, my - 8)
    g.lineTo(mx + 8, my)
    g.lineTo(mx, my + 8)
    g.lineTo(mx - 8, my)
    g.closePath()
    g.fillStyle = i < wins ? '#ffd84a' : '#2a2140'
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3
    g.stroke()
  }
}

function hud(g: G, L: Lay, ft: number, inA: number): void {
  if (inA <= 0.01) return
  const { W, portrait } = L
  const y = L.top + (portrait ? 14 : 10)
  const tw = portrait ? 96 : 104
  const pad = portrait ? 16 : 34
  const bw = W / 2 - tw / 2 - pad - 8
  const bh = portrait ? 30 : 30
  const slide = (1 - easeOut(inA)) * (bw + pad + 40)
  const rMain = healthOf('R', ft, false)
  const oMain = healthOf('O', ft, false)
  const rTrail = Math.max(rMain, healthOf('R', ft, true))
  const oTrail = Math.max(oMain, healthOf('O', ft, true))
  const heatR = heatOf('R', ft)
  const heatO = heatOf('O', ft)
  const heatOnR = ft >= HEAT_ON && ft < KO_AT + 0.4 ? 1 : 0
  const wins = ft >= KO_AT + 0.6 ? 1 : 0
  g.save()
  g.translate(-slide, 0)
  healthBar(g, L, pad, y, bw, bh, rMain, rTrail, false, heatR, heatOnR, TXT.name, wins, ft)
  g.restore()
  g.save()
  g.translate(slide, 0)
  healthBar(g, L, W - pad - bw, y, bw, bh, oMain, oTrail, true, heatO, 0, TXT.opponent, 0, ft)
  g.restore()
  // timer
  const clock = ft < 1.0 ? 60 : Math.max(0, 60 - Math.floor((Math.min(ft, KO_AT) - 1.0) / 0.18))
  g.save()
  g.globalAlpha *= clamp(inA * 2)
  const ty = y - 6
  const th = bh + 34
  g.fillStyle = INK
  quad(g, W / 2 - tw / 2 - 6, ty - 4, W / 2 + tw / 2 + 6, ty - 4, W / 2 + tw / 2 - 8, ty + th + 4, W / 2 - tw / 2 + 8, ty + th + 4)
  g.fill()
  g.fillStyle = '#20122a'
  quad(g, W / 2 - tw / 2, ty, W / 2 + tw / 2, ty, W / 2 + tw / 2 - 12, ty + th, W / 2 - tw / 2 + 12, ty + th)
  g.fill()
  g.strokeStyle = '#d9dbe8'
  g.lineWidth = 2
  g.stroke()
  txt(g, L, numStr(clock), W / 2, ty + th - 10, { f: 'd', size: th * 0.95, align: 'center', color: '#fff', stroke: INK, strokeW: 6 })
  g.restore()
}

function comboCounter(g: G, L: Lay, ft: number): void {
  let last: Hit | null = null
  for (const x of HITS) if (x.combo && x.combo >= 2 && ft >= x.t) last = x
  if (!last) return
  // a new combo's first hit ends the previous counter
  for (const x of HITS) if (x.combo === 1 && x.t > last.t && ft >= x.t) return
  const age = ft - last.t
  // the combo ends 0.85 s after its last hit (or when the next combo starts)
  if (age > 0.95) return
  const fade = 1 - win(age, 0.7, 0.95)
  const pop = back(win(age, 0, 0.12))
  const x = L.portrait ? 36 : 54
  const y = L.portrait ? L.top + 300 : L.top + 230
  const sz = L.portrait ? 120 : 110
  g.save()
  g.globalAlpha = fade
  g.translate(x, y)
  g.scale(lerp(1.6, 1, pop), lerp(1.6, 1, pop))
  txt(g, L, numStr(last.combo ?? 0), 0, 0, { f: 'd', size: sz, color: '#ffd84a', stroke: INK, strokeW: 12, skew: -0.12, shadow: '#e0343c' })
  txt(g, L, 'HITS', sz * 0.5, 0, { f: 'd', size: sz * 0.48, color: '#fff', stroke: INK, strokeW: 8, skew: -0.12 })
  g.restore()
}

function bigText(g: G, L: Lay, s: string, u: number, out: number, size: number, color: string, shadow: string, y: number): void {
  if (u <= 0 || out >= 1) return
  const sc = lerp(3.2, 1, back(clamp(u)))
  g.save()
  g.globalAlpha = clamp(u * 3) * (1 - out)
  g.translate(L.W / 2, y)
  g.scale(sc, sc)
  txt(g, L, s, 0, size * 0.36, { f: 'd', size, align: 'center', color, stroke: '#fff', strokeW: size * 0.14, skew: -0.12 })
  txt(g, L, s, 0, size * 0.36, { f: 'd', size, align: 'center', color, stroke: INK, strokeW: size * 0.06, skew: -0.12, shadow })
  g.restore()
}

// ───────────────────────── frame ─────────────────────────
export interface FightOpts {
  /** Extra vertical lift of the ground line (to clear the pop-up after the K.O.), in logical units. */
  lift: number
}


export function drawFight(g: G, L: Lay, ft: number, o: FightOpts): void {
  const { W, H } = L
  const base = arenaFrame(L)
  // finisher zoom (slow motion) and post-K.O. settle
  const slow = ease(win(ft, 4.2, 4.5)) * (1 - ease(win(ft, 4.95, 5.35)))
  const zoom = 1 + 0.22 * slow
  const s = base.s * zoom
  const gy = base.gy - o.lift - slow * (L.portrait ? 30 : 16)
  // poses
  const bob = Math.sin(ft * 8.5) * 2.2
  sample(R_KEYS, ft, pR)
  sample(O_KEYS, ft, pO)
  const idle = (t: number) => (t < 1.05 || (t > 3.05 && t < 3.25) ? 1 : 0.4)
  pR.y += bob * idle(ft)
  pO.y += Math.sin(ft * 8.5 + 1.7) * 2.2 * idle(ft) * (ft < KO_AT ? 1 : 0)
  // camera tracks the pair (clamped so the K.O. flight stays framed)
  const rx = R_BASE + pR.x
  const ox = O_BASE - pO.x
  let camX = (rx + ox) / 2
  camX = clamp(camX, -40, 70)
  // finisher: centre on the impact
  camX = lerp(camX, (rx + ox) / 2 + 10, slow)
  // shake from the latest hit
  let shake = 0
  let seed = 0
  for (const x of HITS) {
    const age = ft - x.t
    if (age < 0 || age > 0.3) continue
    const amp = x.ko ? 26 : x.block ? 4 : 4 + x.dmg * 0.6
    shake = Math.max(shake, amp * (1 - age / 0.3) * (1 - age / 0.3))
    seed = x.t * 100
  }
  const fr = Math.floor(ft * 60)
  cam.shakeX = shake * (hash(fr + seed) - 0.5) * 2
  cam.shakeY = shake * (hash(fr + seed + 31) - 0.5) * 2
  cam.cx = W / 2 - camX * s + cam.shakeX
  cam.gy = gy + cam.shakeY
  cam.s = s

  g.save()
  g.translate(cam.shakeX, cam.shakeY)
  const crowd = Math.max(0, 1 - win(ft, 0, 0.6)) * 0.3 + (ft > KO_AT ? 1 - win(ft, 5.8, 6) : 0)
  arena(g, L, ft, camX, Math.min(1, crowd + hitCheer(ft)), cam.gy - cam.shakeY, s)
  g.restore()

  // slow-motion grade: darken + cool the background
  if (slow > 0.01) {
    g.save()
    g.globalAlpha = slow * 0.45
    g.fillStyle = '#060414'
    g.fillRect(-50, -50, W + 100, H + 100)
    g.restore()
    rays(g, cam.cx + (camX + 60) * s, cam.gy - 150 * s, 160, Math.max(W, H), 70, '#ffffff', slow * 0.12, 77, 0.012)
  }

  // shadows
  const shadowAt = (wx: number, a: number) => {
    g.save()
    g.globalAlpha = a
    g.fillStyle = '#000'
    g.beginPath()
    g.ellipse(cam.cx + wx * s, cam.gy + 3, 62 * s, 11 * s, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  shadowAt(rx, 0.42)
  shadowAt(ox, 0.42 * (pO.g > 0.5 ? 1 : 0.8))

  // afterimages during the finisher
  if (slow > 0.05 && ft < KO_AT + 0.05) {
    for (let i = 3; i >= 1; i--) {
      sample(R_KEYS, ft - i * 0.05, tmpPose)
      g.save()
      g.globalAlpha = slow * (0.32 - i * 0.08)
      drawFigure(g, tmpPose, { outfit: 'shadow', face: 'set', rim: '#7fd0ff' }, cam.cx + R_BASE * s, cam.gy, s, false)
      g.restore()
    }
  }

  // landing dust
  dust(g, cam.cx + (O_BASE + 170) * s, cam.gy, ft - 5.36, s)

  const heatR = ft >= HEAT_ON ? (ft < KO_AT + 0.3 ? 1 : 1 - win(ft, KO_AT + 0.3, KO_AT + 0.9)) : 0
  // draw the one being hit behind the attacker's strike: opponent first
  drawFigure(g, pO, { outfit: 'shadow', face: 'set' }, cam.cx + O_BASE * s, cam.gy, s, true, ft)
  drawFigure(g, pR, { outfit: 'gi', face: faceOf('R', ft), heat: heatR }, cam.cx + R_BASE * s, cam.gy, s, false, ft)
  shot.x = cam.cx + (R_BASE + pR.x) * s
  shot.gy = cam.gy
  shot.s = s

  // strike smears
  for (const x of HITS) {
    const age = ft - x.t
    if (age < -0.09 || age > 0.05) continue
    const a = 0.55 * (1 - clamp(age / 0.05))
    if (x.by === 'R') smear(g, R_KEYS, x.eff, Math.min(ft, x.t), R_BASE, false, s, cam.cx, cam.gy, '#ffffff', a)
    else smear(g, O_KEYS, x.eff, Math.min(ft, x.t), O_BASE, true, s, cam.cx, cam.gy, '#ff9fb2', a)
  }

  // sparks
  for (const x of HITS) {
    const age = ft - x.t
    if (age < 0 || age > 0.6) continue
    const size = (x.ko ? 104 : x.block ? 40 : 40 + x.dmg * 1.6) * (s / 1.4)
    spark(g, cam.cx + x.x * s, cam.gy + x.y * s, age, size, !!x.block, !!x.ko, x.t * 37)
  }

  // letterbox bars in slow motion
  if (slow > 0.01) {
    // inside the safe area (the story HUD and dock cover the true edges)
    const bh = H * 0.045 * slow
    g.fillStyle = '#000'
    g.fillRect(-50, -50, W + 100, L.top + bh + 50)
    g.fillRect(-50, H - L.bot - bh, W + 100, L.bot + bh + 50)
  }
  vignette(g, L)

  // K.O. flash
  const ko = ft - KO_AT
  if (ko >= 0) flash(g, L, 0.85 * (1 - win(ko, 0, 0.1)), '#fff')

  // HUD + texts
  const hudIn = win(ft, 0.05, 0.45) * (1 - win(ft, 5.2, 5.55))
  hud(g, L, ft, hudIn)
  comboCounter(g, L, ft)
  const midY = L.portrait ? cam.gy - 250 * s : L.top + (H - L.top - L.bot) * 0.33
  bigText(g, L, 'ROUND 1', win(ft, 0.12, 0.3), win(ft, 0.62, 0.72), L.portrait ? 140 : 150, '#ffffff', '#3d8cff', midY)
  bigText(g, L, 'FIGHT!', win(ft, 0.72, 0.84), win(ft, 1.05, 1.2), L.portrait ? 180 : 200, '#ffd84a', '#e0343c', midY)
  if (ko > 0.16) {
    // the slam lands after the hit-stop, so the kick itself is seen first
    const u = win(ko, 0.16, 0.32)
    const out = win(ft, 5.18, 5.36)
    // impact rays behind the letters
    rays(g, W / 2, midY, 80, Math.max(W, H) * 0.8, 40, '#fff', (1 - win(ko, 0.18, 0.55)) * 0.35, 91, 0.02)
    bigText(g, L, 'K.O.', u, out, L.portrait ? 240 : 270, '#ff3b4a', INK, midY)
  }
}

/** Crowd excitement spikes after each landed hit. */
function hitCheer(ft: number): number {
  let v = 0
  for (const x of HITS) {
    if (x.block) continue
    const age = ft - x.t
    if (age >= 0 && age < 0.6) v = Math.max(v, 1 - age / 0.6)
  }
  return v * 0.7
}

