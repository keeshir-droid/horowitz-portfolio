import { BANNER, BREAK, PROPS } from './config.ts'
import { bakeKid, D_BACK, D_FRONT, D_SIDE, F_BLINK, F_IDLE, type KidSprite } from './kid.ts'
import { drawChess, drawEasel, drawRobot, drawScience, PROP_SIZE } from './props.ts'
import { drawTextScaled } from './font.ts'
import { boxAt } from './script.ts'
import { buildWorld, FLOWERS, MAIN_HOUSE, PAL, POND_RECTS, posAt, ROUTE_LEN, sAt, WH, WORLD_W, type Pos } from './world.ts'

export interface FrameInput {
  p: number
  /** Seconds; frozen by the harness for deterministic frames. */
  t: number
  /** Walking (progress is changing AND the kid is on a travel stretch). */
  moving: boolean
  /** Progress is going backwards: he turns around. */
  reverse: boolean
  /** Manual prop replays: -1 = none, else 0..1. */
  manual: Float32Array
  ambient: boolean
  reduced: boolean
}
export interface FrameOut {
  walkFrame: number
  /** Total characters typed so far across the visible box (page*1000 + typed), -1 when no box. */
  charId: number
  boxVisible: boolean
  boxComplete: boolean
  propOn: Uint8Array
  /** x,y,w,h per prop, logical px. */
  propRect: Float32Array
  H: number
}
export interface Renderer {
  /** Logical viewport w x h (w = 240 landscape, 192 portrait; portrait switches to the compact text font). */
  resize(w: number, h: number): void
  draw(inp: FrameInput, out: FrameOut): void
  setPhoto(shades: Uint8Array | null): void
  /** Call when the web font has loaded (drops cached glyph bitmaps). */
  refreshFont(): void
  dispose(): void
}

const FONT = '8px "Ch1Pixel"'
let fontOk = false
let fontPromise: Promise<boolean> | null = null
/** Self-hosted Press Start 2P (public/fonts). Resolves true only once the face is really loaded; text is skipped until then. */
export const isPixelFontReady = (): boolean => fontOk
export function loadPixelFont(): Promise<boolean> {
  if (fontPromise) return fontPromise
  fontPromise = (async () => {
    try {
      const face = new FontFace('Ch1Pixel', `url(${import.meta.env.BASE_URL}fonts/PressStart2P.ttf)`)
      await face.load()
      document.fonts.add(face)
      fontOk = true
    } catch {
      fontOk = false
    }
    return fontOk
  })()
  return fontPromise
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ease = (v: number) => v * v * (3 - 2 * v)
/** Crisp (thresholded) 8x8 glyph bitmaps: Press Start 2P antialiases when rasterised, which looks muddy when scaled up. */
const glyphs = new Map<string, HTMLCanvasElement>()
function glyph(ch: string, color: string): HTMLCanvasElement {
  const key = ch + color
  let c = glyphs.get(key)
  if (c) return c
  c = document.createElement('canvas')
  c.width = 8
  c.height = 8
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.font = FONT
  g.textBaseline = 'top'
  g.fillStyle = color
  g.fillText(ch, 0, 0)
  const img = g.getImageData(0, 0, 8, 8)
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0
  g.putImageData(img, 0, 0)
  let any = false
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) any = true
  if (any) glyphs.set(key, c) // never cache a blank bitmap (font not really usable yet)
  return c
}
const SEPIA = ['#2a1a14', '#7a5238', '#c49a6c', '#f2e2c0']

export function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const g = canvas.getContext('2d')
  if (!g) return null
  const world = buildWorld()
  const kid = bakeKid()
  let H = 208
  let W = 240
  let mini = false
  let photo: HTMLCanvasElement | null = null
  const pos: Pos = { x: 0, y: 0, dx: 0, dy: 1 }
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c
    g.fillRect(x, y, w, h)
  }

  const txt = (s: string, x: number, y: number, color: string, scale = 1) => {
    if (mini) {
      drawTextScaled(g, s, x, y, color, scale)
      return
    }
    if (!fontOk) return
    for (let i = 0; i < s.length; i++) if (s[i] !== ' ') g.drawImage(glyph(s[i], color), x + i * 8, y)
  }

  const adv = () => (mini ? 4 : 8)
  const textBox = (l1: string, l2: string, complete: boolean, t: number, reduced: boolean) => {
    const bh = mini ? 24 : 34
    const y = H - bh - 3
    R(1, y, W - 2, bh, '#000')
    R(3, y + 2, W - 6, bh - 4, '#fff')
    R(4, y + 3, W - 8, bh - 6, '#1a1a2e')
    R(5, y + 4, W - 10, bh - 8, '#fff')
    const ty = mini ? y + 6 : y + 8
    const lh = mini ? 7 : 11
    txt(mini ? l1.toUpperCase() : l1, 8, ty, '#1a1a2e')
    txt(mini ? l2.toUpperCase() : l2, 8, ty + lh, '#1a1a2e')
    if (complete && (reduced || Math.floor(t * 2.5) % 2 === 0)) {
      const ax = W - 14
      const ay = y + bh - 9
      R(ax, ay, 5, 1, '#1a1a2e')
      R(ax + 1, ay + 1, 3, 1, '#1a1a2e')
      R(ax + 2, ay + 2, 1, 1, '#1a1a2e')
    }
  }

  const banner = (p: number) => {
    const pin = ease(clamp01((p - BANNER.in[0]) / (BANNER.in[1] - BANNER.in[0])))
    const pout = ease(clamp01((p - BANNER.out[0]) / (BANNER.out[1] - BANNER.out[0])))
    const bw = BANNER.line2.length * adv() + 14
    const bh = mini ? 21 : 26
    const x = Math.round(-bw - 4 + (bw + 7) * pin - (bw + 7) * pout)
    if (x < -bw) return
    R(x, 3, bw, bh, '#000')
    R(x + 2, 5, bw - 4, bh - 4, '#fff')
    R(x + 3, 6, bw - 6, bh - 6, '#1a1a2e')
    txt(BANNER.line1, x + 8, mini ? 9 : 10, '#ffd84a')
    txt(BANNER.line2, x + 8, mini ? 17 : 19, '#ffffff')
  }

  const house = (camX: number, camY: number, s: number, ph: HTMLCanvasElement | null) => {
    const { x, y, roofH } = MAIN_HOUSE
    const wy = y + roofH - camY
    if (wy > H || wy + 40 < 0) return
    const hx = x - camX
    // right window: framed picture or a lit window
    R(hx + 47, wy + 9, 20, 18, PAL.wood)
    if (ph) g.drawImage(ph, hx + 48, wy + 12)
    else {
      R(hx + 47, wy + 9, 20, 18, PAL.win)
      R(hx + 56, wy + 9, 1, 18, PAL.winD)
      R(hx + 47, wy + 17, 20, 1, PAL.winD)
    }
    // door
    const open = s > ROUTE_LEN - 40
    const dx = hx + 34
    R(dx - 1, wy + 11, 14, 21, PAL.ink)
    R(dx, wy + 12, 12, 20, open ? '#2a1a12' : PAL.door)
    if (!open) {
      R(dx + 1, wy + 13, 10, 1, '#c08850')
      R(dx + 2, wy + 15, 8, 6, PAL.doorD)
      R(dx + 9, wy + 22, 2, 2, PAL.win)
    } else R(dx, wy + 12, 12, 3, '#3d2a1e')
    R(dx - 3, wy + 31, 18, 3, PAL.wallD)
    R(dx - 3, wy + 31, 18, 1, PAL.ink)
  }

  const kidSprite = (inp: FrameInput, s: number, out: FrameOut, camX: number, camY: number, p: number) => {
    posAt(s, pos)
    let dx = pos.dx
    let dy = pos.dy
    if (inp.reverse) {
      dx = -dx
      dy = -dy
    }
    // at a stop (standing still) he looks at the prop
    let at = -1
    if (!inp.moving)
      for (let i = 0; i < PROPS.length; i++) if (p >= PROPS[i].pause[0] && p <= PROPS[i].pause[1]) at = i
    if (at >= 0) {
      dx = PROPS[at].side
      dy = 0
    }
    const dir = dx !== 0 ? D_SIDE : dy > 0 ? D_FRONT : D_BACK
    const walk = inp.moving
    const wf = ((s / 5) | 0) & 3
    out.walkFrame = wf
    let f = walk ? wf : F_IDLE
    if (!walk && Math.floor(inp.t * 1000) % 3200 < 170) f = F_BLINK
    const spr: KidSprite = kid[dir][f]
    const sx = Math.round(pos.x - camX)
    const sy = Math.round(pos.y - camY)
    const bob = walk && (wf & 1) === 1 ? 1 : 0
    const alpha = clamp01((ROUTE_LEN - s) / 16)
    if (alpha <= 0) return
    g.globalAlpha = alpha
    R(sx - 4, sy - 1, 8, 2, 'rgba(32,56,40,.4)')
    if (dir === D_SIDE && dx < 0) {
      g.save()
      g.translate(sx, 0)
      g.scale(-1, 1)
      g.drawImage(spr.c, -(spr.w >> 1), sy - spr.h + 2 - bob)
      g.restore()
    } else g.drawImage(spr.c, sx - (spr.w >> 1), sy - spr.h + 2 - bob)
    g.globalAlpha = 1
  }

  return {
    resize(w, h) {
      W = w
      H = h
      mini = w !== 240
      canvas.width = W
      canvas.height = h
      g.imageSmoothingEnabled = false
    },
    setPhoto(shades) {
      if (!shades) {
        photo = null
        return
      }
      const c = document.createElement('canvas')
      c.width = 18
      c.height = 10
      const pg = c.getContext('2d')!
      for (let i = 0; i < shades.length; i++) {
        pg.fillStyle = SEPIA[shades[i]]
        pg.fillRect(i % 18, (i / 18) | 0, 1, 1)
      }
      photo = c
    },
    draw(inp, out) {
      const p = inp.p < 0 ? 0 : inp.p > 1 ? 1 : inp.p
      const s = sAt(p)
      posAt(s, pos)
      const kyScreen = Math.min(Math.round(H * 0.56), H - (mini ? 24 : 34) - 22)
      let camY = Math.round(pos.y - kyScreen)
      camY = camY < 0 ? 0 : camY > WH - H ? WH - H : camY
      const camX = (WORLD_W - W) >> 1
      g.imageSmoothingEnabled = false
      g.drawImage(world, camX, camY, W, H, 0, 0, W, H)
      // flowers (2-frame sway)
      {
        const fr = inp.ambient ? Math.floor(inp.t * 2.5) & 1 : 0
        for (let i = 0; i < FLOWERS.length; i++) {
          const f = FLOWERS[i]
          const y = f[1] - camY
          if (y < -4 || y > H) continue
          const x = f[0] - camX
          if (x < -4 || x > W) continue
          R(x + fr, y, 1, 1, f[2])
          R(x - 1 + fr, y + 1, 3, 1, f[2])
          R(x + fr, y + 2, 1, 1, f[2])
          R(x, y + 1, 1, 1, '#f8d848')
          R(x, y + 3, 1, 2, PAL.grassD)
        }
      }
      // ambient pond shimmer
      if (inp.ambient) {
        const k = Math.floor(inp.t * 2) % 3
        for (const r of POND_RECTS) {
          const y = r.y - camY
          if (y > H || y + r.h < 0) continue
          const rx = r.x - camX
          R(rx + 12 + k * 4, y + 8, 4, 1, PAL.waterL)
          R(rx + 4 + ((k + 1) % 3) * 6, y + 14, 3, 1, PAL.waterL)
        }
      }
      house(camX, camY, s, photo)
      // props
      for (let i = 0; i < PROPS.length; i++) {
        const pr = PROPS[i]
        const sz = PROP_SIZE[pr.kind]
        const x = pr.x - camX
        const y = pr.y - camY
        const visible = y > -20 && y < H + 4
        const near = p >= pr.pause[0] - 0.03 && p <= pr.pause[1] + 0.02
        out.propOn[i] = visible && near ? 1 : 0
        out.propRect[i * 4] = x
        out.propRect[i * 4 + 1] = y
        out.propRect[i * 4 + 2] = sz[0]
        out.propRect[i * 4 + 3] = sz[1]
        if (!visible) continue
        const m = inp.manual[i]
        const auto = clamp01((p - pr.play[0]) / (pr.play[1] - pr.play[0]))
        const a = m >= 0 ? m : auto
        if (pr.kind === 'easel') drawEasel(g, x, y, a)
        else if (pr.kind === 'chess') drawChess(g, x, y, a)
        else if (pr.kind === 'science') drawScience(g, x, y, a)
        else drawRobot(g, x, y, a)
      }
      kidSprite(inp, s, out, camX, camY, p)

      // UI layers
      banner(p)
      const b = boxAt(p, inp.reduced, mini ? Math.floor((W - 14) / 4) : Math.floor((W - 14) / 8))
      out.boxVisible = b.box >= 0 && (mini || fontOk)
      out.boxComplete = b.complete
      out.charId = b.box >= 0 ? b.box * 1000 + b.typed : -1
      if (b.box >= 0 && (mini || fontOk)) textBox(b.l1, b.l2, b.complete, inp.t, inp.reduced)

      // Chapter 2 break: white flash, stripe wipe, black title card
      const [f0, f1] = BREAK.flash
      if (!inp.reduced && p > f0 && p < f1) {
        const f = (p - f0) / (f1 - f0)
        g.globalAlpha = f < 0.4 ? f / 0.4 : 1 - (f - 0.4) / 0.6
        R(0, 0, W, H, '#fff')
        g.globalAlpha = 1
      }
      const [w0, w1] = BREAK.wipe
      if (p > w0) {
        const q = clamp01((p - w0) / (w1 - w0))
        const rows = Math.ceil(H / 16)
        for (let i = 0; i < rows; i++) {
          const c = clamp01(q * 1.3 - (i / rows) * 0.3)
          if (c <= 0) continue
          const bw = Math.round(c * W)
          const y = i * 16
          if (i % 2 === 0) {
            R(0, y, bw, 16, '#000')
            if (c < 1) R(bw, y, 4, 16, '#fff')
          } else {
            R(W - bw, y, bw, 16, '#000')
            if (c < 1) R(W - bw - 4, y, 4, 16, '#fff')
          }
        }
      }
      if (p >= BREAK.title[0]) {
        R(0, 0, W, H, '#000')
        const fade = clamp01((1 - p) / 0.015)
        g.globalAlpha = fade
        const sc = mini ? 2 : 1
        const cw = mini ? 8 : 8
        const cx = W >> 1
        const cy = Math.round(H / 2) - 24
        if (p > BREAK.title[0] + 0.004) txt(BREAK.line1, cx - ((BREAK.line1.length * cw) >> 1), cy, '#c8c6e0', sc)
        if (p > BREAK.title[0] + 0.016) {
          txt(BREAK.line2, cx - ((BREAK.line2.length * cw) >> 1), cy + 26, '#ff5d73', sc)
          txt(BREAK.line3, cx - ((BREAK.line3.length * cw) >> 1), cy + 40, '#ff5d73', sc)
        }
        g.globalAlpha = 1
      }
    },
    refreshFont() {
      glyphs.clear()
    },
    dispose() {
      glyphs.clear()
      photo = null
    },
  }
}

