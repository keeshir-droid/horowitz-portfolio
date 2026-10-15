/**
 * Chapter 2 photo drops: the gold frame (same frame, same grade as v1) falls into the scene beside him on two wires
 * while the beat's pop-up is up. Real photos come from config.PHOTOS (graded once in index.tsx); until then an
 * illustrated stand-in with a "PHOTO COMING" tag. The slot never overlaps the pop-up, the fight HUD or him.
 */
import { GRADES, PHOTO_DROP, TXT, type BeatKey } from './config'
import { clamp, easeIn, glowAt, grad, quad, star, txt, win, type G, type Lay } from './kit'
import { INK, STAGE_BOW, copyPose, drawFigure, newPose } from './rig'

const pose2 = newPose()
const frameBorder = (w: number): number => Math.max(16, w * 0.05)

function standIn(g: G, kind: BeatKey, x: number, y: number, w: number, h: number, t: number): void {
  // graded backdrop (magenta -> indigo), same grade as real photos
  g.fillStyle = grad(g, `ph-bg:${Math.round(w)}x${Math.round(h)}`, (c) => {
    const gr = c.createLinearGradient(0, 0, w, h)
    gr.addColorStop(0, '#c2416b')
    gr.addColorStop(1, '#2c2466')
    return gr
  })
  g.save()
  g.translate(x, y)
  g.fillRect(0, 0, w, h)
  if (kind === 'karate') {
    // gi chest + belt with a gold medal on its ribbon
    g.fillStyle = '#f2eef6'
    quad(g, w * 0.18, h, w * 0.3, h * 0.42, w * 0.7, h * 0.42, w * 0.82, h)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = '#d8a066'
    quad(g, w * 0.43, h * 0.42, w * 0.57, h * 0.42, w * 0.5, h * 0.62, w * 0.5, h * 0.62)
    g.fill()
    g.fillStyle = '#141018'
    g.fillRect(w * 0.2, h * 0.86, w * 0.6, h * 0.06)
    // ribbon
    g.fillStyle = '#e0343c'
    quad(g, w * 0.38, h * 0.42, w * 0.45, h * 0.42, w * 0.52, h * 0.66, w * 0.47, h * 0.68)
    g.fill()
    g.fillStyle = '#2e5bff'
    quad(g, w * 0.62, h * 0.42, w * 0.55, h * 0.42, w * 0.48, h * 0.66, w * 0.53, h * 0.68)
    g.fill()
    const mr = Math.min(w, h) * 0.13
    g.save()
    g.translate(w * 0.5, h * 0.72)
    g.rotate(Math.sin(t * 2) * 0.05)
    g.beginPath()
    g.arc(0, 0, mr, 0, Math.PI * 2)
    g.fillStyle = '#ffd84a'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = INK
    g.stroke()
    g.beginPath()
    g.arc(0, 0, mr * 0.7, 0, Math.PI * 2)
    g.strokeStyle = '#c28a10'
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = '#fff6c8'
    star(g, 0, 0, mr * 0.2, mr * 0.45, 5, -Math.PI / 2)
    g.fill()
    g.restore()
    glowAt(g, '#fff3a8', w * 0.45, h * 0.66, mr * 1.6, mr * 1.6, 0.35 + 0.15 * Math.sin(t * 5))
  } else if (kind === 'stage') {
    g.fillStyle = '#7a1426'
    g.fillRect(0, 0, w * 0.16, h)
    g.fillRect(w * 0.84, 0, w * 0.16, h)
    g.fillStyle = 'rgba(255,246,200,.28)'
    quad(g, w * 0.44, 0, w * 0.56, 0, w * 0.78, h * 0.8, w * 0.22, h * 0.8)
    g.fill()
    copyPose(pose2, STAGE_BOW)
    drawFigure(g, pose2, { outfit: 'shadow', face: 'set', rim: '#ffd7a0' }, w * 0.47, h * 0.8, h / 330, false)
    g.fillStyle = '#14081a'
    for (let i = 0; i < 9; i++) {
      g.beginPath()
      g.arc(w * (0.05 + i * 0.112), h * 0.97, h * 0.1, 0, Math.PI * 2)
      g.fill()
    }
  } else {
    g.fillStyle = '#3a5fb0'
    quad(g, w * 0.36, h, w * 0.64, h, w * 0.6, h * 0.55, w * 0.4, h * 0.55)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3
    g.stroke()
    g.beginPath()
    g.arc(w * 0.5, h * 0.72, h * 0.06, 0, Math.PI * 2)
    g.fillStyle = '#ffd84a'
    g.fill()
    g.fillStyle = '#1a1430'
    g.beginPath()
    g.arc(w * 0.5, h * 0.36, h * 0.1, 0, Math.PI * 2)
    g.fill()
    g.fillRect(w * 0.42, h * 0.44, w * 0.16, h * 0.14)
    for (let i = 0; i < GRADES.length; i++) {
      g.beginPath()
      g.arc(w * (0.2 + (i * 0.6) / Math.max(1, GRADES.length - 1)), h * 0.14, h * 0.045, 0, Math.PI * 2)
      g.fillStyle = '#ffd84a'
      g.fill()
    }
  }
  g.restore()
}

/** The gold frame with the beat's photo (or its illustrated stand-in) inside the rect x, y, w, h. */
function drawPhotoFrame(g: G, L: Lay, kind: BeatKey, x: number, y: number, w: number, h: number, t: number): void {
  const img = L.A.photos[kind]
  const b = frameBorder(w)
  // shadow + gold moulding
  g.fillStyle = 'rgba(0,0,0,.45)'
  g.fillRect(x - b + 10, y - b + 14, w + b * 2, h + b * 2)
  g.fillStyle = INK
  g.fillRect(x - b - 3, y - b - 3, w + b * 2 + 6, h + b * 2 + 6)
  g.fillStyle = grad(g, `frame:${Math.round(w)}:${Math.round(b)}`, (c) => {
    const gr = c.createLinearGradient(0, -b, 0, h + b)
    gr.addColorStop(0, '#ffe58a')
    gr.addColorStop(0.3, '#d9a426')
    gr.addColorStop(0.7, '#a8740e')
    gr.addColorStop(1, '#ffd25a')
    return gr
  })
  g.save()
  g.translate(x, y)
  g.fillRect(-b, -b, w + b * 2, h + b * 2)
  g.restore()
  g.strokeStyle = '#7a520a'
  g.lineWidth = 3
  g.strokeRect(x - b * 0.5, y - b * 0.5, w + b, h + b)
  g.fillStyle = INK
  g.fillRect(x - 4, y - 4, w + 8, h + 8)
  if (img) {
    g.save()
    g.beginPath()
    g.rect(x, y, w, h)
    g.clip()
    const iw = (img as HTMLCanvasElement).width || 1
    const ih = (img as HTMLCanvasElement).height || 1
    const kk = Math.max(w / iw, h / ih)
    g.drawImage(img, x + (w - iw * kk) / 2, y + (h - ih * kk) / 2, iw * kk, ih * kk)
    g.restore()
  } else {
    g.save()
    g.beginPath()
    g.rect(x, y, w, h)
    g.clip()
    standIn(g, kind, x, y, w, h, t)
    g.restore()
    // optional label on the stand-in (COPY.photoComing; '' = none, the illustration stands on its own)
    if (TXT.photoComing) {
      const ls = Math.max(8 * L.k, w * 0.028)
      const lw = ls * TXT.photoComing.length * 1.05 + 24
      g.fillStyle = 'rgba(10,8,20,.82)'
      g.fillRect(x + w / 2 - lw / 2, y + h - ls * 2.6, lw, ls * 2)
      txt(g, L, TXT.photoComing, x + w / 2, y + h - ls * 1.1, { f: 'p', size: ls, align: 'center', color: '#ffd84a' })
    }
  }
  // glass sheen
  g.save()
  g.globalAlpha = 0.1
  g.fillStyle = '#fff'
  quad(g, x + w * 0.08, y, x + w * 0.3, y, x + w * 0.1, y + h, x - w * 0.12 + w * 0.08, y + h)
  g.fill()
  g.restore()
}

// ───────────────────────── slot + drop ─────────────────────────
export interface Slot {
  x: number
  y: number
  w: number
  h: number
}
const slot: Slot = { x: 0, y: 0, w: 0, h: 0 }
const ASPECT = 0.72

/** Fit a landscape frame (border included) into the box [x0, x1] x [y0, y1], centred. Shared result object. */
function fit(x0: number, x1: number, y0: number, y1: number, maxW: number, ax = 0.5, ay = 0.5): Slot {
  let w = Math.min(maxW, x1 - x0)
  let b = frameBorder(w)
  w -= b * 2
  let h = w * ASPECT
  if (h + b * 2 > y1 - y0) {
    h = y1 - y0 - b * 2
    w = h / ASPECT
    b = frameBorder(w)
  }
  w = Math.max(40, w)
  h = Math.max(30, h)
  slot.w = w
  slot.h = h
  slot.x = x0 + b + (x1 - x0 - (w + b * 2)) * ax
  slot.y = y0 + b + (y1 - y0 - (h + b * 2)) * ay
  return slot
}

export interface SlotRefs {
  /** His screen x (hip) and the ground line, from the beat that drew him this frame. */
  x: number
  gy: number
  /** Figure scale. */
  s: number
  /** Top of the pop-up box. */
  popTop: number
}

/**
 * Where a beat's photo hangs. Landscape: beside him (left of him after the fight, right of him on the stage and at the
 * podium). Portrait: smaller, above the pop-up, in the space his body leaves free.
 */
export function photoSlot(L: Lay, key: BeatKey, r: SlotRefs): Slot {
  const { W, k } = L
  const bottom = r.popTop - 22 * k
  if (!L.portrait) {
    const top = L.top + 30
    if (key === 'karate') return fit(36, r.x - 110 * r.s, top, bottom, 470, 0.5, 0.4)
    if (key === 'stage') return fit(r.x + 150 * r.s, W - 40, top, bottom, 470, 0.5, 0.4)
    return fit(r.x + 170 * r.s, W - 40, top, bottom, 470, 0.5, 0.4)
  }
  if (key === 'karate') {
    // above his head, over the empty half of the mat
    const head = r.gy - 250 * r.s
    return fit(r.x - 40 * r.s, W - 24, L.top + 28, head, 470, 0.5, 1)
  }
  if (key === 'stage') {
    // top right, beside the audience counter (which sits top left in portrait)
    return fit(W * 0.47, W - 22, L.top + 150 * k, r.gy - 260 * r.s, 400, 0.5, 0)
  }
  // council: right of the podium, below the grade badges
  return fit(r.x + 150 * r.s, W - 22, r.gy - 300 * r.s, r.gy - 30 * r.s, 400, 0.5, 0.5)
}

/** Drop the frame into `sl` (age = seconds since the drop began). Dims the scene a little behind it. */
export function drawPhotoDrop(g: G, L: Lay, kind: BeatKey, sl: Slot, age: number): void {
  if (age < 0) return
  const u = L.A.reduced ? 1 : win(age, 0, PHOTO_DROP)
  // fall (accelerating), a small bounce, then a damped swing on the wires
  const fallU = clamp(u / 0.62)
  const bounce = u > 0.62 ? Math.sin(((u - 0.62) / 0.38) * Math.PI) * 0.05 * (1 - (u - 0.62) / 0.38) : 0
  const startY = -sl.h - 160
  const y = startY + (sl.y - startY) * easeIn(fallU) - bounce * sl.h
  const settle = L.A.reduced ? 0 : 1 - win(age, PHOTO_DROP * 0.6, PHOTO_DROP + 0.7)
  const rot = Math.sin(age * 15) * 0.05 * settle * settle
  // dim the scene slightly
  g.save()
  g.globalAlpha = 0.32 * clamp(u * 2)
  g.fillStyle = '#05030a'
  g.fillRect(-50, -50, L.W + 100, L.H + 100)
  g.restore()
  const b = frameBorder(sl.w)
  const cx = sl.x + sl.w / 2
  g.save()
  g.translate(cx, y - b)
  g.rotate(rot)
  // two wires up out of frame
  g.strokeStyle = INK
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(-sl.w * 0.3, 0)
  g.lineTo(-sl.w * 0.3 - rot * 400, -y - 400)
  g.moveTo(sl.w * 0.3, 0)
  g.lineTo(sl.w * 0.3 - rot * 400, -y - 400)
  g.stroke()
  g.strokeStyle = '#c99a3a'
  g.lineWidth = 2
  g.stroke()
  drawPhotoFrame(g, L, kind, -sl.w / 2, b, sl.w, sl.h, age)
  // a glint sweeping across the glass once it has landed
  const gl = win(age, PHOTO_DROP * 0.7, PHOTO_DROP + 0.35)
  if (gl > 0 && gl < 1) {
    g.save()
    g.beginPath()
    g.rect(-sl.w / 2, b, sl.w, sl.h)
    g.clip()
    g.globalAlpha = 0.35 * (1 - gl)
    g.fillStyle = '#ffffff'
    const gx = -sl.w / 2 - sl.w * 0.3 + gl * sl.w * 1.6
    quad(g, gx, b, gx + sl.w * 0.12, b, gx - sl.w * 0.08, b + sl.h, gx - sl.w * 0.2, b + sl.h)
    g.fill()
    g.restore()
  }
  g.restore()
  // landing puff of gold sparks at the touch-down
  const land = age - PHOTO_DROP * 0.62
  if (!L.A.reduced && land > 0 && land < 0.3) {
    const a = 1 - land / 0.3
    g.save()
    g.globalAlpha = a
    g.fillStyle = '#ffd84a'
    for (let i = 0; i < 4; i++) {
      const sx = i < 2 ? sl.x - b : sl.x + sl.w + b
      const sy = sl.y + (i % 2 ? sl.h + b : -b)
      star(g, sx, sy, 2, 6 + 18 * (1 - a), 4, i)
      g.fill()
    }
    g.restore()
  }
}
