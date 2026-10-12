/**
 * Arcade interstitials for Chapter 2: the STAGE n cards between beats and the finish (ALL STAGES CLEAR, then
 * NEXT LEVEL ▸ <next era>). Pure functions of card-local seconds; render.ts handles the wipe in/out over the
 * neighbouring beats. Words: generic game words, the stage names, and stats/eras from src/content via config.
 */
import { BEATS, CARD, CARDS, END, RESULTS, TXT, type BeatKey } from './config'
import { back, clamp, ease, easeIn, easeOut, flash, glowAt, grad, hash, lerp, measure, quad, rays, star, txt, win, type G, type Lay } from './kit'
import { INK } from './rig'

/** Horizontal run of the slanted wipe edge. */
const slantOf = (L: Lay): number => L.H * 0.36

// ───────────────────────── wipes ─────────────────────────
/** Path of the region covered by a wipe coming in from the left (v 0..1). */
export function wipeInPath(g: G, L: Lay, v: number): number {
  const sl = slantOf(L)
  const X = lerp(-sl - 20, L.W + 20, easeIn(clamp(v)) * 0.35 + clamp(v) * 0.65)
  quad(g, -60, -60, X + sl, -60, X, L.H + 60, -60, L.H + 60)
  return X
}
/** Path of the card region still covering the screen while it wipes off to the right (v 0..1). */
export function wipeOutPath(g: G, L: Lay, v: number): number {
  const sl = slantOf(L)
  const X = lerp(-sl - 60, L.W + 20, easeIn(clamp(v)))
  quad(g, X + sl, -60, L.W + sl + 200, -60, L.W + sl + 200, L.H + 60, X, L.H + 60)
  return X
}
/** The bright slash riding the wipe edge (X = the edge's bottom x). */
export function wipeEdge(g: G, L: Lay, X: number, gold: boolean): void {
  const sl = slantOf(L)
  const w = 26
  g.fillStyle = '#e0343c'
  quad(g, X + sl - w * 1.6, -60, X + sl + 2, -60, X + 2, L.H + 60, X - w * 1.6, L.H + 60)
  g.fill()
  g.fillStyle = gold ? '#ffd84a' : '#ffffff'
  quad(g, X + sl - w * 0.5, -60, X + sl + 2, -60, X + 2, L.H + 60, X - w * 0.5, L.H + 60)
  g.fill()
}

// ───────────────────────── stage card ─────────────────────────
function cardBG(g: G, L: Lay, ts: number, cy: number, bandH: number): void {
  const { W, H } = L
  g.fillStyle = '#0b0610'
  g.fillRect(-60, -60, W + 120, H + 120)
  // halftone-ish dot rows fading toward the band
  g.fillStyle = 'rgba(255,93,115,.10)'
  for (let y = 18; y < H; y += 36) {
    const off = ((y / 36) & 1) * 18
    for (let x = off; x < W; x += 36) {
      const d = Math.abs(y - cy) / (H * 0.5)
      const r = 5 * (1 - clamp(d))
      if (r > 0.6) g.fillRect(x - r, y - r, r * 2, r * 2)
    }
  }
  // the red band (slanted), with a dark core stripe
  const tilt = W * 0.05
  g.fillStyle = grad(g, `cardband:${W}x${H}:${Math.round(cy)}:${Math.round(bandH)}`, (c) => {
    const gr = c.createLinearGradient(0, cy - bandH / 2, 0, cy + bandH / 2)
    gr.addColorStop(0, '#ff3b5c')
    gr.addColorStop(0.5, '#c0182e')
    gr.addColorStop(1, '#6a0b1c')
    return gr
  })
  quad(g, -60, cy - bandH / 2 + tilt, W + 60, cy - bandH / 2 - tilt, W + 60, cy + bandH / 2 - tilt, -60, cy + bandH / 2 + tilt)
  g.fill()
  g.fillStyle = INK
  quad(g, -60, cy + bandH / 2 + tilt, W + 60, cy + bandH / 2 - tilt, W + 60, cy + bandH / 2 - tilt + 10, -60, cy + bandH / 2 + tilt + 10)
  g.fill()
  g.fillStyle = '#ffd84a'
  quad(g, -60, cy - bandH / 2 + tilt - 8, W + 60, cy - bandH / 2 - tilt - 8, W + 60, cy - bandH / 2 - tilt, -60, cy - bandH / 2 + tilt)
  g.fill()
  // speed streaks racing left through the band
  g.save()
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 26; i++) {
    const yy = cy + (hash(i + 1) - 0.5) * bandH * 0.9
    const len = 60 + hash(i + 7) * 260
    const sp = 2600 + hash(i + 3) * 2400
    const x = W + 100 - ((ts * sp + hash(i + 5) * (W + 400)) % (W + 400))
    g.globalAlpha = 0.18 + 0.3 * hash(i + 9)
    g.fillRect(x, yy, len, 2 + (i % 3))
  }
  g.restore()
}

const tmpLine = { a: 0 }
/**
 * One stage card (i = 0..2) at card-local seconds ts. The title slams in, a slash cuts it, speed lines burst behind
 * it and the stage's name sits underneath.
 */
export function drawCard(g: G, L: Lay, i: number, ts: number): void {
  const c = CARDS[i]
  const { W, H, portrait } = L
  const cy = L.top + (H - L.top - L.bot) * 0.46
  const bandH = portrait ? 330 : 250
  cardBG(g, L, ts, cy, bandH)
  const slam = win(ts, 0.03, CARD.slam)
  const impact = ts - CARD.slam
  // shake on impact
  const sh = impact > 0 && impact < 0.1 ? (1 - impact / 0.1) * 12 : 0
  const fr = Math.floor(ts * 60)
  g.save()
  g.translate((hash(fr + i * 7) - 0.5) * sh * 2, (hash(fr + 31) - 0.5) * sh * 2)
  // speed-line burst behind the title
  if (impact > -0.02) {
    const bu = easeOut(win(impact, -0.02, 0.24))
    rays(g, W / 2, cy, 60 + bu * 120, Math.max(W, H) * (0.5 + bu * 0.5), 56, '#ffffff', 0.55 * (1 - win(impact, 0.08, 0.3)) + 0.12, 40 + i * 9, 0.016)
  }
  glowAt(g, '#ffd84a', W / 2, cy, W * 0.35, bandH * 0.7, 0.25 * slam)
  // title (slammed)
  const size = Math.min(portrait ? 210 : 230, (W - 80) / (c.title.length * 0.42))
  const sc = lerp(2.6, 1, back(slam))
  const split = impact > 0.05 ? 10 * ease(win(impact, 0.05, 0.1)) * (1 - 0.7 * win(impact, 0.1, 0.25)) : 0
  if (slam > 0) {
    g.save()
    g.globalAlpha = clamp(slam * 3)
    g.translate(W / 2, cy)
    g.scale(sc, sc)
    // the slash line (through the title centre, rising to the right)
    tmpLine.a = -0.28
    const ca = Math.cos(tmpLine.a)
    const sa = Math.sin(tmpLine.a)
    for (let half = 0; half < (split > 0 ? 2 : 1); half++) {
      g.save()
      if (split > 0) {
        // clip to one side of the slash and slide that half along it
        const sgn = half ? 1 : -1
        g.beginPath()
        g.moveTo(-ca * 2000, -sa * 2000)
        g.lineTo(ca * 2000, sa * 2000)
        g.lineTo(ca * 2000 - sa * 2000 * sgn, sa * 2000 + ca * 2000 * sgn)
        g.lineTo(-ca * 2000 - sa * 2000 * sgn, -sa * 2000 + ca * 2000 * sgn)
        g.closePath()
        g.clip()
        g.translate(ca * split * sgn, sa * split * sgn)
      }
      txt(g, L, c.title, 0, size * 0.36, { f: 'd', size, align: 'center', color: '#ffffff', stroke: '#ffffff', strokeW: size * 0.16, skew: -0.12 })
      txt(g, L, c.title, 0, size * 0.36, { f: 'd', size, align: 'center', color: '#ffffff', stroke: INK, strokeW: size * 0.07, skew: -0.12, shadow: '#e0343c' })
      g.restore()
    }
    // the slash itself
    const su = win(impact, 0.02, 0.1)
    if (su > 0 && impact < 0.3) {
      const len = size * 3.2
      const a = 1 - win(impact, 0.12, 0.3)
      g.globalAlpha = a
      g.fillStyle = '#ffffff'
      const x0 = -len / 2
      const x1 = x0 + len * easeOut(su)
      const nx = -sa * 5
      const ny = ca * 5
      quad(g, ca * x0, sa * x0, ca * x1 + nx, sa * x1 + ny, ca * x1 - nx, sa * x1 - ny, ca * x0, sa * x0)
      g.fill()
    }
    g.restore()
  }
  // stage name under the title
  const nu = easeOut(win(ts, CARD.slam + 0.02, CARD.slam + 0.1))
  if (nu > 0) {
    const ns = 18 * L.k
    const nw = measure(g, L, c.name, 'p', ns) + ns * c.name.length * 0.3 + ns * 2.4
    const ny = cy + bandH / 2 + (portrait ? 64 : 46) * L.k * 0.6 + 24
    const nx = W / 2 + (1 - nu) * W * 0.4
    g.save()
    g.globalAlpha = nu
    g.fillStyle = INK
    quad(g, nx - nw / 2 + 14, ny - ns * 1.5, nx + nw / 2 + 14, ny - ns * 1.5, nx + nw / 2 - 14, ny + ns * 0.9, nx - nw / 2 - 14, ny + ns * 0.9)
    g.fill()
    g.strokeStyle = '#ffd84a'
    g.lineWidth = 3
    g.stroke()
    txt(g, L, c.name, nx, ny + ns * 0.1, { f: 'p', size: ns, align: 'center', color: '#ffd84a', spacing: ns * 0.3 })
    g.restore()
  }
  g.restore()
  // white impact flash
  if (impact > 0) flash(g, L, 0.55 * (1 - win(impact, 0, 0.08)), '#fff')
}

// ───────────────────────── finish ─────────────────────────
const ALL_SPLIT = TXT.allClear.lastIndexOf(' ')
const ALL_A = TXT.allClear.slice(0, ALL_SPLIT)
const ALL_B = TXT.allClear.slice(ALL_SPLIT + 1)

function icon(g: G, key: BeatKey, x: number, y: number, r: number): void {
  g.save()
  g.translate(x, y)
  g.lineWidth = Math.max(2, r * 0.1)
  g.strokeStyle = INK
  if (key === 'karate') {
    // gold medal on a ribbon
    g.fillStyle = '#e0343c'
    quad(g, -r * 0.55, -r * 1.05, -r * 0.15, -r * 1.05, r * 0.2, -r * 0.2, -r * 0.2, -r * 0.2)
    g.fill()
    g.fillStyle = '#2e5bff'
    quad(g, r * 0.55, -r * 1.05, r * 0.15, -r * 1.05, -r * 0.2, -r * 0.2, r * 0.2, -r * 0.2)
    g.fill()
    g.beginPath()
    g.arc(0, r * 0.2, r * 0.62, 0, Math.PI * 2)
    g.fillStyle = '#ffd84a'
    g.fill()
    g.stroke()
    g.fillStyle = '#fff6c8'
    star(g, 0, r * 0.2, r * 0.14, r * 0.34, 5, -Math.PI / 2)
    g.fill()
  } else if (key === 'stage') {
    // an audience: three heads and shoulders
    for (let i = -1; i <= 1; i++) {
      const hx = i * r * 0.62
      const hy = i === 0 ? -r * 0.12 : r * 0.08
      g.fillStyle = i === 0 ? '#ffd84a' : '#ffc2cc'
      g.beginPath()
      g.arc(hx, hy - r * 0.32, r * 0.26, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      g.beginPath()
      g.moveTo(hx - r * 0.42, hy + r * 0.6)
      g.quadraticCurveTo(hx - r * 0.42, hy - r * 0.02, hx, hy - r * 0.02)
      g.quadraticCurveTo(hx + r * 0.42, hy - r * 0.02, hx + r * 0.42, hy + r * 0.6)
      g.closePath()
      g.fill()
      g.stroke()
    }
  } else {
    // podium with the council seal
    g.fillStyle = '#3a5fb0'
    quad(g, -r * 0.62, r * 0.8, r * 0.62, r * 0.8, r * 0.48, -r * 0.5, -r * 0.48, -r * 0.5)
    g.fill()
    g.stroke()
    g.fillStyle = '#22386e'
    g.fillRect(-r * 0.7, -r * 0.72, r * 1.4, r * 0.24)
    g.strokeRect(-r * 0.7, -r * 0.72, r * 1.4, r * 0.24)
    g.beginPath()
    g.arc(0, r * 0.12, r * 0.26, 0, Math.PI * 2)
    g.fillStyle = '#ffd84a'
    g.fill()
    g.stroke()
  }
  g.restore()
}

function chip(g: G, L: Lay, key: BeatKey, x: number, y: number, w: number, h: number, u: number): void {
  if (u <= 0) return
  const sc = lerp(1.5, 1, back(clamp(u)))
  g.save()
  g.globalAlpha = clamp(u * 3)
  g.translate(x + w / 2, y + h / 2)
  g.scale(sc, sc)
  g.translate(-w / 2, -h / 2)
  const sk = h * 0.22
  g.fillStyle = 'rgba(0,0,0,.5)'
  quad(g, sk + 7, 7, w + 7, 7, w - sk + 7, h + 7, 7, h + 7)
  g.fill()
  g.fillStyle = '#1c0d24'
  quad(g, sk, 0, w, 0, w - sk, h, 0, h)
  g.fill()
  g.strokeStyle = '#ffd84a'
  g.lineWidth = 3
  g.stroke()
  const r = h * 0.34
  icon(g, key, sk * 0.5 + h * 0.5, h * 0.5, r)
  const tx = sk * 0.5 + h * 0.98
  // fit the stat between the icon and the check mark
  const room = w - sk - h * 0.5 - tx - 6
  const mw = measure(g, L, RESULTS[key], 'd', 100)
  const ss = Math.min(h * 0.5, mw > 0 ? (room / mw) * 100 : h * 0.5)
  txt(g, L, RESULTS[key], tx, h * 0.56, { f: 'd', size: ss, color: '#ffffff', stroke: INK, strokeW: 5 })
  txt(g, L, TXT.floors[key], tx, h * 0.84, { f: 'p', size: Math.max(9, h * 0.13), color: '#ffc2cc' })
  // check mark
  const cx = w - sk - h * 0.28
  g.strokeStyle = '#ffd84a'
  g.lineWidth = h * 0.07
  g.beginPath()
  g.moveTo(cx - h * 0.12, h * 0.5)
  g.lineTo(cx - h * 0.03, h * 0.6)
  g.lineTo(cx + h * 0.14, h * 0.36)
  g.stroke()
  g.restore()
}

/** The finish at seconds `es` into T.end. */
export function drawEnding(g: G, L: Lay, es: number): void {
  const { W, H, portrait } = L
  // background: deep plum with a gold bloom and slow rays
  g.fillStyle = grad(g, `endbg:${W}x${H}`, (c) => {
    const r = c.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.8)
    r.addColorStop(0, '#4a1838')
    r.addColorStop(0.6, '#1a0b22')
    r.addColorStop(1, '#09070f')
    return r
  })
  g.fillRect(-60, -60, W + 120, H + 120)
  const area0 = L.top
  const area1 = H - L.bot
  const areaH = area1 - area0
  const titleY = area0 + areaH * (portrait ? 0.13 : 0.2)
  rays(g, W / 2, titleY, 80, Math.max(W, H) * 0.9, 44, '#ffd84a', 0.08 + 0.1 * (1 - win(es, END.slam, END.slam + 0.4)), 3 + Math.floor(es * 6), 0.02)
  // ALL STAGES CLEAR
  const tu = win(es, 0.0, END.slam)
  if (tu > 0) {
    const sc = lerp(2.4, 1, back(tu))
    g.save()
    g.globalAlpha = clamp(tu * 3)
    g.translate(W / 2, titleY)
    g.scale(sc, sc)
    if (portrait) {
      const s1 = Math.min(150, (W - 50) / (ALL_A.length * 0.42))
      txt(g, L, ALL_A, 0, 0, { f: 'd', size: s1, align: 'center', color: '#ffd84a', stroke: INK, strokeW: 12, skew: -0.12, shadow: '#e0343c', spacing: 2 })
      txt(g, L, ALL_B, 0, s1 * 0.92, { f: 'd', size: s1, align: 'center', color: '#ffd84a', stroke: INK, strokeW: 12, skew: -0.12, shadow: '#e0343c', spacing: 2 })
    } else {
      const s1 = Math.min(128, (W - 80) / (TXT.allClear.length * 0.42))
      txt(g, L, TXT.allClear, 0, s1 * 0.36, { f: 'd', size: s1, align: 'center', color: '#ffd84a', stroke: INK, strokeW: 12, skew: -0.12, shadow: '#e0343c', spacing: 2 })
    }
    g.restore()
  }
  // result chips
  if (portrait) {
    const cw = Math.min(560, W - 80)
    const ch = 104
    const y0 = titleY + 180
    for (let i = 0; i < BEATS.length; i++) chip(g, L, BEATS[i], (W - cw) / 2, y0 + i * (ch + 18), cw, ch, win(es, END.chips[i], END.chips[i] + 0.1))
  } else {
    const ch = 92
    const cw = Math.min(330, (W - 120) / 3)
    const gap = 22
    const x0 = (W - (cw * 3 + gap * 2)) / 2
    const y0 = titleY + 70
    for (let i = 0; i < BEATS.length; i++) chip(g, L, BEATS[i], x0 + i * (cw + gap), y0, cw, ch, win(es, END.chips[i], END.chips[i] + 0.1))
  }
  // NEXT LEVEL ▸ HIGH SCHOOL
  const nu = easeOut(win(es, END.next, END.next + 0.12))
  if (nu <= 0) return
  const by = area0 + areaH * (portrait ? 0.76 : 0.74)
  const bandH = portrait ? 250 : 170
  const tilt = W * 0.04
  g.save()
  g.globalAlpha = clamp(nu * 2)
  // band slides in from the right
  const off = (1 - nu) * W
  g.translate(off, 0)
  g.fillStyle = '#120914'
  quad(g, -60, by - bandH / 2 + tilt, W + 60, by - bandH / 2 - tilt, W + 60, by + bandH / 2 - tilt, -60, by + bandH / 2 + tilt)
  g.fill()
  g.fillStyle = '#e0343c'
  quad(g, -60, by - bandH / 2 + tilt - 8, W + 60, by - bandH / 2 - tilt - 8, W + 60, by - bandH / 2 - tilt, -60, by - bandH / 2 + tilt)
  g.fill()
  quad(g, -60, by + bandH / 2 + tilt, W + 60, by + bandH / 2 - tilt, W + 60, by + bandH / 2 - tilt + 8, -60, by + bandH / 2 + tilt + 8)
  g.fill()
  const es2 = portrait ? 104 : 92
  const ky = by - bandH * 0.18
  // "NEXT LEVEL" + a drawn ▸ (Bebas Neue has no arrow glyphs) + the next era
  const ks = es2 * 0.62
  const kw = measure(g, L, TXT.nextLevel, 'd', ks)
  const ew = measure(g, L, TXT.nextEra, 'd', es2)
  const aw = es2 * 0.34
  const total = kw + aw + ew + es2 * 0.5
  const base = ky + es2 * 0.32
  let x = W / 2 - total / 2
  txt(g, L, TXT.nextLevel, x, base, { f: 'd', size: ks, color: '#ffffff', stroke: INK, strokeW: 6, skew: -0.1 })
  x += kw + es2 * 0.2
  // a drawn ▸, centred on the small caps
  const ay = base - ks * 0.36
  g.fillStyle = '#ffd84a'
  g.beginPath()
  g.moveTo(x, ay - aw * 0.55)
  g.lineTo(x + aw, ay)
  g.lineTo(x, ay + aw * 0.55)
  g.closePath()
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 3
  g.stroke()
  x += aw + es2 * 0.3
  const full = es >= END.barTo
  const pop = full ? back(win(es, END.barTo, END.barTo + 0.12)) : 0
  g.save()
  g.translate(x + ew / 2, base)
  const ps = full ? lerp(1.3, 1, pop) : 1
  g.scale(ps, ps)
  txt(g, L, TXT.nextEra, -ew / 2, 0, { f: 'd', size: es2, color: full ? '#ffd84a' : '#ffffff', stroke: INK, strokeW: 9, skew: -0.12, shadow: '#e0343c' })
  g.restore()
  // level-up bar
  const bw = Math.min(W - 80, portrait ? 600 : 640)
  const bh = portrait ? 34 : 24
  const bx = (W - bw) / 2
  const byy = by + bandH * 0.2
  const fill = easeIn(win(es, END.barFrom, END.barTo))
  g.fillStyle = INK
  g.fillRect(bx - 5, byy - 5, bw + 10, bh + 10)
  g.fillStyle = '#2a1840'
  g.fillRect(bx, byy, bw, bh)
  g.fillStyle = full ? '#fff3a8' : '#ffd84a'
  g.fillRect(bx, byy, bw * fill, bh)
  g.fillStyle = 'rgba(255,255,255,.35)'
  g.fillRect(bx, byy + 2, bw * fill, bh * 0.25)
  g.fillStyle = INK
  for (let i = 1; i < 10; i++) g.fillRect(bx + (bw * i) / 10 - 1.5, byy, 3, bh)
  if (fill > 0 && fill < 1) glowAt(g, '#ffffff', bx + bw * fill, byy + bh / 2, 40, bh * 1.4, 0.8)
  g.restore()
  // burst when the bar fills
  if (full) {
    const bu = es - END.barTo
    const cx = W / 2 + off
    const cy = ky
    rays(g, cx, cy, 60, Math.max(W, H) * (0.4 + bu * 1.2), 40, '#ffd84a', 0.7 * (1 - win(bu, 0.05, 0.35)), 21, 0.03)
    g.save()
    g.globalAlpha = 1 - win(bu, 0, 0.3)
    g.fillStyle = '#fff6c8'
    star(g, cx, cy, 30, 120 + bu * 500, 10, bu * 3)
    g.fill()
    g.restore()
    flash(g, L, 0.45 * (1 - win(bu, 0, 0.12)), '#fff')
  }
}
