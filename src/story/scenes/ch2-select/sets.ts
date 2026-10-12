/** Chapter 2 sets: the select screen, the stage and the council hall (the fight lives in fight.ts). */
import { AUDIENCE, AUDIENCE_LABEL, GRADES, TXT } from './config'
import { back, clamp, ease, glowAt, grad, hash, lerp, numStr, quad, rays, star, txt, win, type G, type Lay } from './kit'
import { INK, READY, SPEECH, STAGE_BOW, STAND, copyPose, drawFigure, lerpPose, newPose } from './rig'

const pose = newPose()
const pose2 = newPose()

// ───────────────────────── shared backdrops ─────────────────────────
export function selectBG(g: G, L: Lay, t: number): void {
  const { W, H } = L
  g.fillStyle = grad(g, `sel:${W}x${H}`, (c) => {
    const r = c.createRadialGradient(W * 0.3, H * 0.5, 0, W * 0.3, H * 0.5, Math.max(W, H) * 0.85)
    r.addColorStop(0, '#5a1430')
    r.addColorStop(0.55, '#1c0d24')
    r.addColorStop(1, '#0a0912')
    return r
  })
  g.fillRect(-50, -50, W + 100, H + 100)
  // diagonal light slabs drifting
  g.save()
  g.globalAlpha = 0.06
  g.fillStyle = '#ffffff'
  const sh = (t * 40) % 120
  for (let i = -3; i < 16; i++) {
    const x = i * 120 + sh
    quad(g, x, H + 40, x + 40, H + 40, x + 40 + H * 0.45, -40, x + H * 0.45, -40)
    g.fill()
  }
  g.restore()
}

// ───────────────────────── select screen ─────────────────────────
interface Geo {
  panel: [number, number, number, number]
  fig: [number, number, number]
  name: [number, number, number]
  tile: [number, number, number, number]
  title: [number, number, number]
}
function selGeo(L: Lay): Geo {
  const { W, H, top, bot, portrait } = L
  if (portrait) {
    const ty = top + 92
    const tile = Math.min(152, (W - 60) / 4 - 12)
    const rosterH = tile * 2 + 14
    const ry = H - bot - rosterH - 24
    const py = ty + 26
    const ph = ry - py - 40
    return {
      title: [W / 2, ty, 78],
      panel: [30, py, W - 60, ph],
      fig: [W * 0.36, py + ph - 14, Math.min(2.7, (ph - 30) / 232)],
      name: [W * 0.6, py + ph * 0.55, 108],
      tile: [(W - (tile * 4 + 14 * 3)) / 2, ry, tile, 14],
    }
  }
  const ty = top + 66
  const py = ty + 22
  const ph = H - bot - py - 18
  const x0 = Math.max(40, W / 2 - 600)
  const ry = py + 150
  const tile = Math.min(132, (H - bot - 20 - ry - 14) / 2, (W - x0 - 600) / 4)
  return {
    title: [W / 2, ty, 80],
    panel: [x0, py, 500, ph],
    fig: [x0 + 250, py + ph - 14, Math.min(2.0, (ph - 26) / 236)],
    name: [x0 + 556, py + 84, 100],
    tile: [x0 + 560, ry, tile, 14],
  }
}

function panelPath(g: G, x: number, y: number, w: number, h: number): void {
  const k = 36
  quad(g, x + k, y, x + w, y, x + w - k, y + h, x, y + h)
}

function tileFace(g: G, L: Lay, x: number, y: number, s: number, you: boolean): void {
  g.save()
  quad(g, x + 10, y, x + s, y, x + s - 10, y + s, x, y + s)
  g.fillStyle = you ? '#3a2a5a' : '#15132a'
  g.fill()
  g.clip()
  if (you) {
    g.fillStyle = grad(g, `tile:${s}`, (c) => {
      const gr = c.createLinearGradient(0, 0, 0, s)
      gr.addColorStop(0, '#ff5d73')
      gr.addColorStop(1, '#2a1846')
      return gr
    })
    g.save()
    g.translate(x, y)
    g.fillRect(0, 0, s, s)
    g.restore()
    copyPose(pose2, READY)
    drawFigure(g, pose2, { outfit: 'casual', face: 'calm' }, x + s * 0.47, y + s * 2.3, s / 95, false)
  } else {
    copyPose(pose2, STAND)
    g.globalAlpha = 0.5
    drawFigure(g, pose2, { outfit: 'locked', face: 'set' }, x + s * 0.5, y + s * 2.3, s / 95, false)
    g.globalAlpha = 1
    txt(g, L, '?', x + s / 2, y + s * 0.66, { f: 'd', size: s * 0.62, align: 'center', color: '#3a3760', stroke: INK, strokeW: 6 })
  }
  g.restore()
  // frame
  g.strokeStyle = you ? 'rgba(255,255,255,.75)' : '#3a3760'
  g.lineWidth = 3
  quad(g, x + 10, y, x + s, y, x + s - 10, y + s, x, y + s)
  g.stroke()
  // padlock on locked tiles (future chapters)
  if (!you) {
    const lx = x + s - 24
    const ly = y + 26
    g.strokeStyle = '#8a86b8'
    g.lineWidth = 4
    g.beginPath()
    g.arc(lx, ly - 4, 7, Math.PI, 0)
    g.stroke()
    g.fillStyle = '#8a86b8'
    g.fillRect(lx - 10, ly - 4, 20, 15)
  }
}

export interface SelectOpts {
  /** Beat-local seconds. */
  ts: number
  /** Cursor position (0..7, fractional while moving). */
  cursor: number
  /** 0..1 lock flash. */
  lock: number
  /** Whether the big panel shows him (cursor on slot 0) or a locked future chapter. */
  you: boolean
  titleIn: number
}

export function drawSelect(g: G, L: Lay, o: SelectOpts): void {
  const geo = selGeo(L)
  selectBG(g, L, o.ts)
  // title
  const [tx, ty, ts] = geo.title
  const title = TXT.select
  const tIn = back(clamp(o.titleIn))
  g.save()
  // landscape: left-aligned over the panel, so the engine's unlock toast (top right) never covers it
  g.translate(L.portrait ? tx : geo.panel[0] + 10, ty)
  g.scale(lerp(1.5, 1, tIn), lerp(1.5, 1, tIn))
  g.globalAlpha = clamp(o.titleIn * 3)
  const size = Math.min(ts, (L.W - 40) / (title.length * 0.42))
  txt(g, L, title, 0, 0, { f: 'd', size, align: L.portrait ? 'center' : 'left', color: '#ffffff', stroke: INK, strokeW: 10, skew: -0.14, shadow: '#e0343c', spacing: 2 })
  g.restore()
  // panel
  const [px, py, pw, ph] = geo.panel
  g.save()
  g.fillStyle = '#ffd84a'
  g.globalAlpha = 0.9
  panelPath(g, px + 12, py + 12, pw, ph)
  g.fill()
  g.globalAlpha = 1
  panelPath(g, px, py, pw, ph)
  g.fillStyle = o.you ? '#3a1840' : '#15132a'
  g.fill()
  g.save()
  panelPath(g, px, py, pw, ph)
  g.clip()
  if (o.you) rays(g, geo.fig[0], py + ph * 0.36, 40, Math.max(pw, ph) * 1.2, 36, '#ff5d73', 0.22, 5, 0.04)
  glowAt(g, '#ff5d73', geo.fig[0], py + ph * 0.45, pw * 0.6, ph * 0.5, 0.45)
  const [fx, fy, fs] = geo.fig
  if (o.you) {
    copyPose(pose, READY)
    pose.y += Math.sin(o.ts * 3) * 1.2
    drawFigure(g, pose, { outfit: 'casual', face: o.lock > 0 ? 'grin' : 'calm' }, fx, fy, fs * (1 + o.lock * 0.03), false)
  } else {
    copyPose(pose, STAND)
    g.globalAlpha = 0.8
    drawFigure(g, pose, { outfit: 'locked', face: 'set' }, fx, fy, fs, false)
    g.globalAlpha = 1
    txt(g, L, '?', fx, py + ph * 0.5, { f: 'd', size: ph * 0.42, align: 'center', color: '#3a3760', stroke: INK, strokeW: 10 })
  }
  g.restore()
  g.strokeStyle = '#ffffff'
  g.lineWidth = 5
  panelPath(g, px, py, pw, ph)
  g.stroke()
  g.restore()
  // name plate
  const [nx, ny, ns] = geo.name
  if (o.you) {
    const nameSize = L.portrait ? Math.min(ns, pw * 0.22) : ns
    const ax = L.portrait ? px + pw - 30 : nx
    const align: CanvasTextAlign = L.portrait ? 'right' : 'left'
    const ay = L.portrait ? py + ph - 70 : ny
    txt(g, L, TXT.name, ax, ay, { f: 'd', size: nameSize, align, color: '#ffffff', stroke: INK, strokeW: 10, skew: -0.12, shadow: '#e0343c', spacing: 2 })
    const es = L.portrait ? 22 : 17
    txt(g, L, TXT.era, ax + (L.portrait ? 0 : 6), ay + es * 2.1, { f: 'p', size: es, align, color: '#ffc2cc', stroke: INK, strokeW: 6 })
  }
  // roster
  const [rx, ry, rs, gap] = geo.tile
  for (let i = 0; i < 8; i++) {
    const c = i % 4
    const r = (i / 4) | 0
    const x = rx + c * (rs + gap)
    const y = ry + r * (rs + gap)
    tileFace(g, L, x, y, rs, i === 0)
  }
  // cursor
  const cc = o.cursor % 4
  const cr = Math.floor(o.cursor / 4)
  const cx = rx + cc * (rs + gap)
  const cy = ry + cr * (rs + gap)
  const pulse = 0.5 + 0.5 * Math.sin(o.ts * 18)
  const col = o.lock > 0 ? (pulse > 0.5 ? '#ffffff' : '#ffd84a') : '#ff3b5c'
  const m = 7
  const L0 = rs * 0.3
  g.strokeStyle = INK
  g.lineWidth = 11
  bracket(g, cx - m, cy - m, rs + m * 2, L0)
  g.strokeStyle = col
  g.lineWidth = 6
  bracket(g, cx - m, cy - m, rs + m * 2, L0)
  const ls = L.portrait ? 18 : 13
  g.fillStyle = col
  g.fillRect(cx - m, cy - m, ls * 2.6, ls * 1.8)
  txt(g, L, '1P', cx - m + ls * 0.4, cy - m + ls * 1.4, { f: 'p', size: ls, color: INK })
}

function bracket(g: G, x: number, y: number, s: number, l: number): void {
  g.beginPath()
  g.moveTo(x, y + l)
  g.lineTo(x, y)
  g.lineTo(x + l, y)
  g.moveTo(x + s - l, y)
  g.lineTo(x + s, y)
  g.lineTo(x + s, y + l)
  g.moveTo(x + s, y + s - l)
  g.lineTo(x + s, y + s)
  g.lineTo(x + s - l, y + s)
  g.moveTo(x + l, y + s)
  g.lineTo(x, y + s)
  g.lineTo(x, y + s - l)
  g.stroke()
}

export function popupFloor(L: Lay, popTop: number): number {
  return Math.min(L.H * (L.portrait ? 0.7 : 0.84), popTop - 14 * L.k)
}

/** Top of the area that the engine's unlock toast never covers (it spans the full width on phones). */
function clearTop(L: Lay): number {
  return L.top + (L.portrait ? 150 * L.k : 16)
}

// ───────────────────────── stage ─────────────────────────
/** Where he stands on the stage / at the podium (screen x). Left of centre: the photo drops in on the right. */
export const stageX = (L: Lay): number => (L.portrait ? L.W * 0.3 : L.W * 0.42)
export const councilX = (L: Lay): number => (L.portrait ? L.W * 0.3 : L.W * 0.4)

export function drawStage(g: G, L: Lay, u: number, floorY: number, ts: number): void {
  const { W, H } = L
  g.fillStyle = '#100816'
  g.fillRect(-50, -50, W + 100, H + 100)
  const sx0 = L.portrait ? 0 : W * 0.06
  const sx1 = L.portrait ? W : W * 0.94
  const stageTop = L.top + (L.portrait ? 40 : 20)
  // back curtain with soft folds
  g.fillStyle = '#3a0a1a'
  g.fillRect(sx0, stageTop, sx1 - sx0, floorY - stageTop)
  g.fillStyle = '#2c0714'
  for (let x = sx0 + 20; x < sx1; x += 64) g.fillRect(x, stageTop, 22, floorY - stageTop)
  // stage floor
  g.fillStyle = '#4a2a18'
  quad(g, sx0 - 40, floorY, sx1 + 40, floorY, sx1 + 120, floorY + 70, sx0 - 120, floorY + 70)
  g.fill()
  g.fillStyle = INK
  g.fillRect(-50, floorY + 70, W + 100, 14)
  g.fillStyle = '#2a160c'
  g.fillRect(-50, floorY + 84, W + 100, H)
  // spotlight (he stands left of centre so the photo has room on the right)
  const open = ease(win(u, 0.0, 0.2))
  const lit = ease(win(u, 0.02, 0.16))
  const cx = stageX(L)
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = 0.22 * lit
  g.fillStyle = '#fff1c0'
  quad(g, cx - 40, stageTop - 30, cx + 40, stageTop - 30, cx + 170, floorY + 10, cx - 170, floorY + 10)
  g.fill()
  g.globalAlpha = 1
  glowAt(g, '#fff1c0', cx, floorY + 6, 190, 30, 0.6 * lit)
  g.restore()
  // footlights along the lip
  for (let x = sx0 + 30; x < sx1 - 10; x += 90) {
    glowAt(g, '#ffe7a8', x, floorY + 66, 40, 16, 0.5 * lit + 0.15)
    g.fillStyle = '#fff3c4'
    g.fillRect(x - 8, floorY + 62, 16, 6)
  }
  // dust in the beam
  if (lit > 0.05) {
    g.fillStyle = '#fff6dc'
    for (let i = 0; i < 14; i++) {
      const yy = floorY - ((ts * 18 + hash(i) * 400) % (floorY - stageTop))
      const xx = cx + (hash(i + 5) - 0.5) * 220 * ((yy - stageTop) / (floorY - stageTop) + 0.3)
      g.globalAlpha = 0.5 * lit
      g.fillRect(xx, yy, 3, 3)
    }
    g.globalAlpha = 1
  }
  // him: stand -> bow -> up
  const bow = ease(win(u, 0.12, 0.28)) * (1 - ease(win(u, 0.74, 0.92)))
  lerpPose(pose, STAND, STAGE_BOW, bow)
  const s = L.portrait ? 1.45 : 1.15
  drawFigure(g, pose, { outfit: 'casual', face: bow > 0.4 ? 'calm' : 'grin' }, cx - 10, floorY + 2, s, false, ts)
  // curtains (velvet folds)
  const half = (sx1 - sx0) / 2
  const cw = half * (1 - open * 0.84)
  for (const side of [0, 1]) {
    const x = side ? sx1 - cw : sx0
    const folds = 6
    for (let i = 0; i < folds; i++) {
      const fx = x + (cw * i) / folds
      const fw = cw / folds + 1
      g.fillStyle = i % 2 ? '#a41c3a' : '#c42a4a'
      g.fillRect(fx, stageTop, fw, floorY - stageTop + 20)
      g.fillStyle = 'rgba(0,0,0,.28)'
      g.fillRect(fx + fw * 0.7, stageTop, fw * 0.3, floorY - stageTop + 20)
    }
    g.fillStyle = INK
    g.fillRect(side ? x - 4 : x + cw - 2, stageTop, 6, floorY - stageTop + 20)
  }
  // valance + proscenium
  g.fillStyle = '#8e1a2e'
  g.fillRect(-50, stageTop - 10, W + 100, 46)
  g.fillStyle = '#ffd84a'
  g.fillRect(-50, stageTop + 34, W + 100, 5)
  g.fillStyle = INK
  g.fillRect(-50, stageTop - 14, W + 100, 6)
  // audience (foreground silhouettes), clapping after the bow
  const clap = win(u, 0.22, 0.36)
  const rows = 3
  for (let r = rows - 1; r >= 0; r--) {
    const rh = (L.portrait ? 30 : 26) * (1 + r * 0.25)
    const y0 = H - L.bot * 0.3 - r * rh * 1.15 + 10
    const step = rh * 2.4
    g.fillStyle = r === 0 ? '#07040b' : r === 1 ? '#0d0814' : '#140c1c'
    g.beginPath()
    for (let x = -step + (r % 2) * step * 0.5, i = 0; x < W + step; x += step, i++) {
      const bob = clap * Math.abs(Math.sin(ts * 10 + hash(i + r * 31) * 6)) * rh * 0.25
      const y = y0 - bob
      g.moveTo(x + rh * 0.62, y - rh)
      g.arc(x, y - rh, rh * 0.62, 0, Math.PI * 2)
      g.moveTo(x - rh * 1.1, y + rh * 2)
      g.quadraticCurveTo(x - rh * 1.1, y - rh * 0.2, x, y - rh * 0.2)
      g.quadraticCurveTo(x + rh * 1.1, y - rh * 0.2, x + rh * 1.1, y + rh * 2)
      g.closePath()
    }
    g.fill()
  }
  // counter
  const cu = ease(win(u, 0.14, 0.52))
  const n = Math.round(AUDIENCE * cu)
  const bw = 300
  const bx = L.portrait ? (W - bw) / 2 : sx0 + 40
  const by = L.portrait ? clearTop(L) : stageTop + 60
  g.save()
  g.globalAlpha = clamp(win(u, 0.1, 0.16) * 1.5)
  g.fillStyle = 'rgba(8,6,14,.9)'
  g.fillRect(bx, by, bw, 118)
  g.strokeStyle = '#ffd84a'
  g.lineWidth = 3
  g.strokeRect(bx, by, bw, 118)
  txt(g, L, AUDIENCE_LABEL.toUpperCase(), bx + 16, by + 30, { f: 'p', size: 12, color: '#c4c2dc' })
  txt(g, L, numStr(n, true), bx + 16, by + 102, { f: 'd', size: 84, color: n >= AUDIENCE ? '#ffd84a' : '#ffffff', stroke: INK, strokeW: 8 })
  g.restore()
  if (n >= AUDIENCE) {
    const age = u - 0.52
    rays(g, bx + bw / 2, by + 64, 40, 220, 18, '#ffd84a', Math.max(0, 0.5 - age * 3), 4, 0.04)
  }
}

// ───────────────────────── council ─────────────────────────
export function drawCouncil(g: G, L: Lay, u: number, floorY: number, ts: number): void {
  const { W, H } = L
  g.fillStyle = grad(g, `cn:${W}x${H}`, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, '#0a1430')
    gr.addColorStop(1, '#16264a')
    return gr
  })
  g.fillRect(-50, -50, W + 100, H + 100)
  // tall windows with light beams
  for (let i = 0; i < 5; i++) {
    const x = W * (0.08 + i * 0.21)
    g.fillStyle = '#1f3a70'
    g.fillRect(x, L.top + 120, W * 0.07, floorY - L.top - 220)
    g.fillStyle = '#2c4f94'
    g.fillRect(x + 6, L.top + 126, W * 0.07 - 12, (floorY - L.top - 232) * 0.5)
  }
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = 0.07
  g.fillStyle = '#bcd4ff'
  for (let i = 0; i < 5; i++) {
    const x = W * (0.08 + i * 0.21)
    quad(g, x, L.top + 120, x + W * 0.07, L.top + 120, x + W * 0.16, floorY, x + W * 0.04, floorY)
    g.fill()
  }
  g.restore()
  // platform
  g.fillStyle = '#3a2a1a'
  g.fillRect(-50, floorY, W + 100, 24)
  g.fillStyle = INK
  g.fillRect(-50, floorY + 24, W + 100, 8)
  g.fillStyle = '#0c1428'
  g.fillRect(-50, floorY + 32, W + 100, H)
  // him + podium
  const px = councilX(L)
  const s = L.portrait ? 1.45 : 1.18
  const gest = Math.sin(ts * 7.5)
  copyPose(pose, SPEECH)
  pose.a1a = 1.15 + 0.4 * gest
  pose.a1b = 2.0 + 0.5 * Math.sin(ts * 7.5 + 0.8)
  pose.h = -0.06 + 0.06 * Math.sin(ts * 5)
  pose.t = 0.06 + 0.03 * gest
  const talk = 0.5 + 0.5 * Math.sin(ts * 23)
  drawFigure(g, pose, { outfit: 'casual', face: 'talk', talk }, px - 22 * s, floorY, s, false, ts)
  // podium
  const pw = 92 * s
  const ph2 = 120 * s
  const pxl = px - pw / 2 + 30 * s
  g.fillStyle = INK
  quad(g, pxl - 6, floorY + 4, pxl + pw + 6, floorY + 4, pxl + pw - 8, floorY - ph2 - 6, pxl + 8, floorY - ph2 - 6)
  g.fill()
  g.fillStyle = '#3a5fb0'
  quad(g, pxl, floorY, pxl + pw, floorY, pxl + pw - 12, floorY - ph2, pxl + 12, floorY - ph2)
  g.fill()
  g.fillStyle = '#2a4486'
  quad(g, pxl + pw * 0.6, floorY, pxl + pw, floorY, pxl + pw - 12, floorY - ph2, pxl + pw * 0.6 - 6, floorY - ph2)
  g.fill()
  g.fillStyle = INK
  g.fillRect(pxl - 4, floorY - ph2 - 16, pw + 8, 18)
  g.fillStyle = '#22386e'
  g.fillRect(pxl, floorY - ph2 - 13, pw, 12)
  g.beginPath()
  g.arc(pxl + pw / 2, floorY - ph2 * 0.55, 15 * s, 0, Math.PI * 2)
  g.fillStyle = '#ffd84a'
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = '#c28a10'
  star(g, pxl + pw / 2, floorY - ph2 * 0.55, 4 * s, 9 * s, 5, -Math.PI / 2)
  g.fill()
  // microphone
  g.strokeStyle = INK
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(pxl + pw * 0.2, floorY - ph2 - 12)
  g.quadraticCurveTo(pxl + pw * 0.1, floorY - ph2 - 50 * s, pxl + pw * 0.02, floorY - ph2 - 54 * s)
  g.stroke()
  g.fillStyle = '#2a2a36'
  g.beginPath()
  g.ellipse(pxl + pw * 0.02, floorY - ph2 - 56 * s, 7, 10, -0.6, 0, Math.PI * 2)
  g.fill()
  // speech arcs
  const mx = px - 22 * s + 62 * s
  const my = floorY - 192 * s
  g.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const ph = (ts * 1.8 + i / 3) % 1
    const r = 20 + ph * 90
    g.strokeStyle = '#ffd84a'
    g.globalAlpha = (1 - ph) * 0.85
    g.lineWidth = 5
    g.beginPath()
    g.arc(mx, my, r, -0.6, 0.6)
    g.stroke()
  }
  g.globalAlpha = 1
  // grade badges light up one by one
  const n = GRADES.length
  // landscape: the row sits over him, left of the photo that drops in on the right
  const br = L.portrait ? Math.min(46, (W - 60) / n / 2 - 8) : 38
  const gap = br * 2 + (L.portrait ? 14 : 16)
  const bx0 = L.portrait ? W / 2 - (gap * (n - 1)) / 2 : Math.max(br + 30, councilX(L) - 130 - (gap * (n - 1)) / 2)
  const by = L.portrait ? clearTop(L) + br : L.top + 70
  for (let i = 0; i < n; i++) {
    const a = win(u, 0.1 + i * 0.08, 0.16 + i * 0.08)
    const x = bx0 + i * gap
    const pop = a > 0 ? back(a) : 0
    const r = br * (a > 0 ? lerp(1.4, 1, pop) : 1)
    g.beginPath()
    g.arc(x, by, r + 4, 0, Math.PI * 2)
    g.fillStyle = INK
    g.fill()
    g.beginPath()
    g.arc(x, by, r, 0, Math.PI * 2)
    g.fillStyle = a > 0 ? '#ffd84a' : '#1d2a4a'
    g.fill()
    g.beginPath()
    g.arc(x, by, r * 0.74, 0, Math.PI * 2)
    g.strokeStyle = a > 0 ? '#c28a10' : '#2e3e66'
    g.lineWidth = 3
    g.stroke()
    if (a > 0 && a < 1) rays(g, x, by, r, r * 2.6, 12, '#ffd84a', 1 - a, i * 9, 0.06)
    txt(g, L, numStr(GRADES[i]), x, by + r * 0.36, { f: 'd', size: r * 1.05, align: 'center', color: a > 0 ? INK : '#3e507e' })
    txt(g, L, 'GRADE', x, by + r + (L.portrait ? 30 : 24), { f: 'p', size: L.portrait ? 13 : 10, align: 'center', color: a > 0 ? '#ffd84a' : '#5a6a9a' })
  }
  // seated audience
  for (let r = 1; r >= 0; r--) {
    const rh = (L.portrait ? 28 : 24) * (1 + r * 0.2)
    const y0 = H - L.bot * 0.3 - r * rh * 1.2 + 10
    const step = rh * 2.5
    g.fillStyle = r === 0 ? '#050912' : '#0a1222'
    g.beginPath()
    for (let x = -step + (r % 2) * step * 0.5; x < W + step; x += step) {
      g.moveTo(x + rh * 0.6, y0 - rh)
      g.arc(x, y0 - rh, rh * 0.6, 0, Math.PI * 2)
      g.moveTo(x - rh * 1.1, y0 + rh * 2)
      g.quadraticCurveTo(x - rh * 1.1, y0 - rh * 0.2, x, y0 - rh * 0.2)
      g.quadraticCurveTo(x + rh * 1.1, y0 - rh * 0.2, x + rh * 1.1, y0 + rh * 2)
      g.closePath()
    }
    g.fill()
  }
}
