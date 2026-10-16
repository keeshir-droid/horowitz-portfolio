import * as THREE from 'three'
import { rng } from './util'

/**
 * Procedural CanvasTextures for the opening. Everything is painted with 2D-canvas primitives
 * (no pixel loops over big canvases) so the whole set builds in a few milliseconds.
 */

type Ctx = CanvasRenderingContext2D

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, g: c.getContext('2d')! }
}

function tex(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: [number, number]; wrap?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  if (opts.wrap !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1])
  t.anisotropy = 4
  return t
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h},${s}%,${l}%,${a})`

/** Speckle noise: many tiny translucent rects. */
function speckle(g: Ctx, w: number, h: number, n: number, seed: number, light: string, dark: string, size = 2) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? light : dark
    g.fillRect(r() * w, r() * h, size * (0.5 + r()), size * (0.5 + r()))
  }
}

// ---------------------------------------------------------------- exterior

/** Brick: 8 bricks x 8 courses per tile; tile = 2.0 m x 0.64 m. Returns colour + bump. */
export function brickTextures() {
  const W = 512
  const H = 256
  const col = canvas(W, H)
  const bmp = canvas(W, H)
  const r = rng(11)
  col.g.fillStyle = '#5a524c'
  col.g.fillRect(0, 0, W, H)
  bmp.g.fillStyle = '#202020'
  bmp.g.fillRect(0, 0, W, H)
  const bw = 64
  const bh = 32
  const m = 3
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? bw / 2 : 0
    for (let k = -1; k < 9; k++) {
      const x = k * bw + off
      const y = row * bh
      const l = 24 + r() * 11
      const hue = 6 + r() * 16
      col.g.fillStyle = hsl(hue, 24 + r() * 16, l)
      col.g.fillRect(x + m / 2, y + m / 2, bw - m, bh - m)
      // a little shading inside each brick
      col.g.fillStyle = hsl(hue, 30, l - 8, 0.35)
      col.g.fillRect(x + m / 2, y + bh - m - 5, bw - m, 4)
      col.g.fillStyle = hsl(hue, 30, l + 10, 0.18)
      col.g.fillRect(x + m / 2, y + m / 2, bw - m, 4)
      bmp.g.fillStyle = `rgb(${200 + r() * 40 | 0},${200 + r() * 40 | 0},${200 + r() * 40 | 0})`
      bmp.g.fillRect(x + m / 2 + 1, y + m / 2 + 1, bw - m - 2, bh - m - 2)
    }
  }
  speckle(col.g, W, H, 2600, 3, 'rgba(255,220,200,0.07)', 'rgba(0,0,0,0.12)')
  speckle(bmp.g, W, H, 1800, 4, 'rgba(255,255,255,0.15)', 'rgba(0,0,0,0.25)')
  return { map: tex(col.c, { repeat: [1 / 2, 1 / 0.64] }), bump: tex(bmp.c, { srgb: false, repeat: [1 / 2, 1 / 0.64] }) }
}

/** Slate roof shingles; tile = 1.2 m square. */
export function roofTexture() {
  const S = 256
  const { c, g } = canvas(S, S)
  const r = rng(21)
  g.fillStyle = '#16161f'
  g.fillRect(0, 0, S, S)
  const rows = 8
  const rh = S / rows
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? 16 : 0
    for (let k = -1; k < 9; k++) {
      const l = 14 + r() * 8
      g.fillStyle = hsl(230, 10, l)
      g.fillRect(k * 32 + off + 1, row * rh + 1, 30, rh - 3)
      g.fillStyle = 'rgba(0,0,0,0.45)'
      g.fillRect(k * 32 + off + 1, row * rh + rh - 6, 30, 4)
    }
  }
  return tex(c, { repeat: [1 / 1.2, 1 / 1.2] })
}

/** Dark night lawn; tile = 2 m. */
export function grassTexture() {
  const S = 256
  const { c, g } = canvas(S, S)
  g.fillStyle = '#2a4334'
  g.fillRect(0, 0, S, S)
  const r = rng(31)
  for (let i = 0; i < 2600; i++) {
    g.strokeStyle = r() < 0.5 ? 'rgba(60,96,70,0.35)' : 'rgba(5,12,10,0.45)'
    g.lineWidth = 1
    const x = r() * S
    const y = r() * S
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 5)
    g.stroke()
  }
  return tex(c, { repeat: [1 / 2, 1 / 2] })
}

/** Pavement slabs; tile = 1.5 m. */
export function concreteTexture() {
  const S = 256
  const { c, g } = canvas(S, S)
  g.fillStyle = '#3d3f48'
  g.fillRect(0, 0, S, S)
  speckle(g, S, S, 2200, 41, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.15)')
  g.fillStyle = 'rgba(0,0,0,0.5)'
  g.fillRect(0, 0, S, 3)
  g.fillRect(0, 0, 3, S)
  return tex(c, { repeat: [1 / 1.5, 1 / 1.5] })
}

/** Distant apartment block windows (emissive map). */
export function buildingWindowsTexture(seed: number) {
  const W = 128
  const H = 256
  const { c, g } = canvas(W, H)
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  const r = rng(seed)
  for (let y = 8; y < H - 8; y += 18) {
    for (let x = 8; x < W - 8; x += 20) {
      const on = r() < 0.22
      g.fillStyle = on ? (r() < 0.7 ? '#ffcf8a' : '#9fd8ff') : '#0b0d1a'
      g.fillRect(x, y, 10, 10)
    }
  }
  const t = tex(c, { wrap: false })
  t.magFilter = THREE.NearestFilter
  return t
}

/** A lit window seen from outside: warm glow behind drawn curtains. */
export function litWindowTexture(warm: boolean) {
  const W = 128
  const H = 160
  const { c, g } = canvas(W, H)
  const grad = g.createRadialGradient(W / 2, H * 0.55, 4, W / 2, H * 0.55, W * 0.8)
  grad.addColorStop(0, warm ? '#ffcf8a' : '#6f8fd8')
  grad.addColorStop(1, warm ? '#6a3a1c' : '#14183a')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // curtain folds
  for (let i = 0; i < 12; i++) {
    g.fillStyle = `rgba(0,0,0,${0.08 + (i % 3) * 0.06})`
    g.fillRect((i / 12) * W, 0, W / 24, H)
  }
  // a gap in the middle of the curtains
  g.fillStyle = warm ? 'rgba(255,230,180,0.35)' : 'rgba(170,200,255,0.25)'
  g.fillRect(W / 2 - 6, 0, 12, H)
  return tex(c, { wrap: false })
}

/** The moon with a few soft maria/craters. */
export function moonTexture() {
  const S = 256
  const { c, g } = canvas(S, S)
  g.fillStyle = '#f2efe4'
  g.fillRect(0, 0, S, S)
  const r = rng(51)
  for (let i = 0; i < 26; i++) {
    const x = r() * S
    const y = r() * S
    const rad = 6 + r() * 30
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, 'rgba(150,150,165,0.45)')
    grad.addColorStop(1, 'rgba(150,150,165,0)')
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  return tex(c, { wrap: false })
}

/** White radial falloff, used for additive glows (lamp bulbs, moon halo). */
export function glowTexture() {
  const S = 128
  const { c, g } = canvas(S, S)
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  grad.addColorStop(0.6, 'rgba(255,255,255,0.1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  return tex(c, { wrap: false })
}

/** Soft black blob for contact shadows / ambient occlusion under objects. */
export function blobTexture() {
  const S = 128
  const { c, g } = canvas(S, S)
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(0,0,0,0.85)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.45)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  return tex(c, { wrap: false, srgb: false })
}

/** Linear dark-to-clear strip, for corner occlusion along walls. */
export function edgeAOTexture() {
  const { c, g } = canvas(4, 64)
  const grad = g.createLinearGradient(0, 0, 0, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.7)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 64)
  return tex(c, { wrap: false, srgb: false })
}

// ---------------------------------------------------------------- room

/** Wood floor planks running along z; tile = 1.6 m. Colour + bump. */
export function floorTextures() {
  const S = 512
  const col = canvas(S, S)
  const bmp = canvas(S, S)
  const r = rng(61)
  bmp.g.fillStyle = '#ddd'
  bmp.g.fillRect(0, 0, S, S)
  const pw = 64
  for (let i = 0; i < 8; i++) {
    let y = -r() * 300
    while (y < S) {
      const len = 180 + r() * 260
      const l = 24 + r() * 9
      const hue = 20 + r() * 8
      col.g.fillStyle = hsl(hue, 38, l)
      col.g.fillRect(i * pw, y, pw, len)
      // grain
      for (let k = 0; k < 7; k++) {
        col.g.strokeStyle = hsl(hue, 40, l - 6 - r() * 5, 0.55)
        col.g.lineWidth = 1 + r()
        col.g.beginPath()
        const gx = i * pw + 4 + r() * (pw - 8)
        col.g.moveTo(gx, y)
        col.g.bezierCurveTo(gx + (r() - 0.5) * 10, y + len * 0.3, gx + (r() - 0.5) * 10, y + len * 0.7, gx + (r() - 0.5) * 6, y + len)
        col.g.stroke()
      }
      // plank end joint
      col.g.fillStyle = 'rgba(0,0,0,0.55)'
      col.g.fillRect(i * pw, y, pw, 2)
      bmp.g.fillStyle = '#222'
      bmp.g.fillRect(i * pw, y, pw, 2)
      y += len
    }
    col.g.fillStyle = 'rgba(0,0,0,0.6)'
    col.g.fillRect(i * pw, 0, 2, S)
    bmp.g.fillStyle = '#111'
    bmp.g.fillRect(i * pw, 0, 2, S)
  }
  return { map: tex(col.c, { repeat: [1 / 1.6, 1 / 1.6] }), bump: tex(bmp.c, { srgb: false, repeat: [1 / 1.6, 1 / 1.6] }) }
}

/** Subtle kid's-room wallpaper: soft stripes + tiny stars, in the wall's own tone. Tile = 0.8 m. */
export function wallpaperTexture(base: string, seed: number) {
  const S = 256
  const { c, g } = canvas(S, S)
  g.fillStyle = base
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)'
    g.fillRect(i * 32, 0, 32, S)
  }
  const r = rng(seed)
  g.fillStyle = 'rgba(255,240,200,0.13)'
  for (let i = 0; i < 18; i++) {
    const x = (i % 4) * 64 + 16 + ((i >> 2) % 2) * 32
    const y = Math.floor(i / 4) * 52 + 20 + r() * 4
    star(g, x, y, 5, 2.2)
  }
  speckle(g, S, S, 900, seed + 1, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.05)')
  return tex(c, { repeat: [1 / 0.8, 1 / 0.8] })
}

function star(g: Ctx, x: number, y: number, R: number, r: number, pts = 5) {
  g.beginPath()
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2
    const rad = i % 2 ? r : R
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
  }
  g.closePath()
  g.fill()
}

/** Round braided rug: rings + a ring of little stars. */
export function rugTexture() {
  const S = 512
  const { c, g } = canvas(S, S)
  const cx = S / 2
  const rings: [number, string][] = [
    [256, '#6a2f52'],
    [244, '#e8c9a8'],
    [236, '#7a3b5e'],
    [200, '#9c4f78'],
    [190, '#7a3b5e'],
    [130, '#5b2a48'],
    [122, '#e8c9a8'],
    [116, '#8a456c'],
    [60, '#b0608a'],
    [52, '#7a3b5e'],
  ]
  for (const [rad, col] of rings) {
    g.fillStyle = col
    g.beginPath()
    g.arc(cx, cx, rad, 0, Math.PI * 2)
    g.fill()
  }
  // braid texture: fine concentric strokes
  for (let rad = 8; rad < 256; rad += 5) {
    g.strokeStyle = rad % 10 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.05)'
    g.lineWidth = 2
    g.beginPath()
    g.arc(cx, cx, rad, 0, Math.PI * 2)
    g.stroke()
  }
  g.fillStyle = '#ffd27a'
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    star(g, cx + Math.cos(a) * 160, cx + Math.sin(a) * 160, 13, 5.5)
  }
  speckle(g, S, S, 3000, 71, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.1)')
  return tex(c, { wrap: false })
}

/** Patchwork quilt; tile = 0.6 m. */
export function quiltTexture() {
  const S = 256
  const { c, g } = canvas(S, S)
  const cols = ['#2f5d8a', '#3a6c9c', '#284f78', '#4a79a6']
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      g.fillStyle = cols[(x + y * 3) % 4]
      g.fillRect(x * 64, y * 64, 64, 64)
    }
  g.strokeStyle = 'rgba(230,220,200,0.35)'
  g.setLineDash([4, 4])
  g.lineWidth = 2
  for (let i = 0; i <= 4; i++) {
    g.beginPath()
    g.moveTo(i * 64, 0)
    g.lineTo(i * 64, S)
    g.moveTo(0, i * 64)
    g.lineTo(S, i * 64)
    g.stroke()
  }
  speckle(g, S, S, 1200, 81, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.08)')
  return tex(c, { repeat: [1 / 0.6, 1 / 0.6] })
}

/** Curtain fabric: deep teal with tiny yellow stars. Tile = 0.5 m. */
export function curtainTexture() {
  const S = 128
  const { c, g } = canvas(S, S)
  g.fillStyle = '#1d5d68'
  g.fillRect(0, 0, S, S)
  g.fillStyle = 'rgba(255,214,120,0.75)'
  star(g, 32, 32, 7, 3)
  star(g, 96, 96, 7, 3)
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.arc(96, 30, 2, 0, Math.PI * 2)
  g.arc(30, 94, 2, 0, Math.PI * 2)
  g.fill()
  return tex(c, { repeat: [1 / 0.5, 1 / 0.5] })
}

/** Fine fabric noise (bump) for clothes and the bean bag. */
export function fabricBump() {
  const S = 128
  const { c, g } = canvas(S, S)
  g.fillStyle = '#808080'
  g.fillRect(0, 0, S, S)
  for (let y = 0; y < S; y += 2) {
    g.fillStyle = y % 4 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
    g.fillRect(0, y, S, 1)
  }
  speckle(g, S, S, 1500, 91, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.2)', 1.5)
  return tex(c, { srgb: false, repeat: [6, 6] })
}

/** The CRT's picture: a bright blue "no signal" field with scanlines and a vignette. */
export function tvScreenTexture() {
  const W = 256
  const H = 192
  const { c, g } = canvas(W, H)
  const grad = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.65)
  grad.addColorStop(0, '#a6e6ff')
  grad.addColorStop(0.6, '#7fd6ff')
  grad.addColorStop(1, '#3f8fc0')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 3) {
    g.fillStyle = 'rgba(0,20,60,0.18)'
    g.fillRect(0, y, W, 1)
  }
  speckle(g, W, H, 900, 101, 'rgba(255,255,255,0.12)', 'rgba(0,30,80,0.1)', 1.5)
  return tex(c, { wrap: false })
}

/** Cartridge label for the handheld (no real brand). */
export function cartLabelTexture() {
  const W = 128
  const H = 96
  const { c, g } = canvas(W, H)
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#ff5d73')
  grad.addColorStop(1, '#ffc857')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#1b1b2a'
  g.fillRect(0, H - 22, W, 22)
  g.fillStyle = '#fff'
  g.font = 'bold 15px sans-serif'
  g.textAlign = 'center'
  g.fillText('QUEST', W / 2, H - 6)
  g.fillStyle = '#4cc9f0'
  g.beginPath()
  g.arc(W / 2, 34, 18, 0, Math.PI * 2)
  g.fill()
  return tex(c, { wrap: false })
}

/** Embossed wordmark under the handheld's screen (matches the boot logo; not a real brand). */
export function gbWordmarkTexture() {
  const W = 256
  const H = 48
  const { c, g } = canvas(W, H)
  g.clearRect(0, 0, W, H)
  g.fillStyle = '#2f3a8c'
  g.font = 'italic bold 30px sans-serif'
  g.textBaseline = 'middle'
  g.fillText('NAWKA', 8, H / 2 + 2)
  g.font = 'bold 15px sans-serif'
  g.fillText('POCKET', 128, H / 2 + 4)
  return tex(c, { wrap: false })
}

// ---------------------------------------------------------------- posters

const PW = 256
const PH = 358

function posterBase(bg: string, bg2: string) {
  const { c, g } = canvas(PW, PH)
  g.fillStyle = '#f3ecdc'
  g.fillRect(0, 0, PW, PH)
  const grad = g.createLinearGradient(0, 0, 0, PH)
  grad.addColorStop(0, bg)
  grad.addColorStop(1, bg2)
  g.fillStyle = grad
  g.fillRect(10, 10, PW - 20, PH - 20)
  return { c, g }
}

function title(g: Ctx, text: string, y: number, col: string, size = 30) {
  g.fillStyle = col
  g.font = `900 ${size}px "Arial Black", Impact, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, PW / 2, y)
}

function dots(g: Ctx, n: number, seed: number, col: string, yMax = PH) {
  const r = rng(seed)
  g.fillStyle = col
  for (let i = 0; i < n; i++) {
    g.beginPath()
    g.arc(14 + r() * (PW - 28), 14 + r() * (yMax - 28), 0.8 + r() * 1.6, 0, Math.PI * 2)
    g.fill()
  }
}

/** 0: rocket launch on red. */
function posterRocket() {
  const { c, g } = posterBase('#ff6b80', '#c8324d')
  dots(g, 40, 111, 'rgba(255,255,255,0.8)', 240)
  // flame
  const fx = PW / 2
  g.fillStyle = '#ffc857'
  g.beginPath()
  g.moveTo(fx - 22, 236)
  g.quadraticCurveTo(fx, 330, fx + 22, 236)
  g.fill()
  g.fillStyle = '#fff3c4'
  g.beginPath()
  g.moveTo(fx - 11, 236)
  g.quadraticCurveTo(fx, 290, fx + 11, 236)
  g.fill()
  // fins
  g.fillStyle = '#4cc9f0'
  g.beginPath()
  g.moveTo(fx - 30, 170)
  g.lineTo(fx - 58, 240)
  g.lineTo(fx - 30, 228)
  g.fill()
  g.beginPath()
  g.moveTo(fx + 30, 170)
  g.lineTo(fx + 58, 240)
  g.lineTo(fx + 30, 228)
  g.fill()
  // body
  g.fillStyle = '#f7f3ea'
  g.beginPath()
  g.moveTo(fx, 60)
  g.bezierCurveTo(fx + 44, 100, fx + 36, 200, fx + 30, 238)
  g.lineTo(fx - 30, 238)
  g.bezierCurveTo(fx - 36, 200, fx - 44, 100, fx, 60)
  g.fill()
  g.fillStyle = '#1b2a4a'
  g.beginPath()
  g.arc(fx, 140, 15, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#4cc9f0'
  g.beginPath()
  g.arc(fx, 140, 10, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#c8324d'
  g.fillRect(fx - 32, 200, 64, 8)
  title(g, 'BLAST OFF', 36, '#fff3c4', 28)
  return tex(c, { wrap: false })
}

/** 1: dinosaur on cyan. */
function posterDino() {
  const { c, g } = posterBase('#6ed7f5', '#2b9dc4')
  // volcano + ground
  g.fillStyle = '#1f6b86'
  g.beginPath()
  g.moveTo(40, 300)
  g.lineTo(110, 150)
  g.lineTo(140, 150)
  g.lineTo(220, 300)
  g.fill()
  g.fillStyle = '#ff7a59'
  g.beginPath()
  g.arc(125, 140, 14, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#145066'
  g.fillRect(10, 290, PW - 20, 58)
  // T-rex silhouette
  g.fillStyle = '#0d3b4d'
  g.beginPath()
  g.ellipse(120, 248, 46, 30, -0.25, 0, Math.PI * 2) // body
  g.fill()
  g.beginPath()
  g.moveTo(80, 250)
  g.quadraticCurveTo(40, 268, 22, 300) // tail
  g.lineTo(34, 302)
  g.quadraticCurveTo(60, 280, 92, 268)
  g.fill()
  g.beginPath()
  g.ellipse(160, 205, 18, 26, 0.5, 0, Math.PI * 2) // neck
  g.fill()
  g.beginPath()
  g.roundRect(150, 168, 62, 30, 10) // head
  g.fill()
  g.fillRect(170, 194, 36, 10) // jaw
  g.fillRect(104, 268, 16, 38) // legs
  g.fillRect(132, 266, 16, 40)
  g.fillRect(100, 300, 26, 8)
  g.fillRect(128, 300, 26, 8)
  g.fillRect(160, 228, 18, 6) // little arm
  g.fillStyle = '#6ed7f5'
  g.beginPath()
  g.arc(196, 178, 3.5, 0, Math.PI * 2)
  g.fill()
  title(g, 'DINOSAURS', 38, '#0d3b4d', 28)
  return tex(c, { wrap: false })
}

/** 2: planets on yellow. */
function posterPlanets() {
  const { c, g } = posterBase('#ffd27a', '#f0a93c')
  g.strokeStyle = 'rgba(90,50,20,0.25)'
  g.lineWidth = 1.5
  for (let r = 50; r < 190; r += 34) {
    g.beginPath()
    g.ellipse(PW / 2, 210, r, r * 0.45, 0, 0, Math.PI * 2)
    g.stroke()
  }
  // saturn
  g.fillStyle = '#c4622d'
  g.beginPath()
  g.arc(PW / 2, 200, 44, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.18)'
  g.fillRect(PW / 2 - 44, 186, 88, 8)
  g.strokeStyle = '#7a3b1c'
  g.lineWidth = 7
  g.beginPath()
  g.ellipse(PW / 2, 202, 76, 16, -0.25, 0, Math.PI * 2)
  g.stroke()
  const planets: [number, number, number, string][] = [
    [50, 120, 12, '#4cc9f0'],
    [205, 110, 18, '#ff5d73'],
    [62, 290, 9, '#2f5d8a'],
    [196, 300, 14, '#9bbc0f'],
  ]
  for (const [x, y, r, col] of planets) {
    g.fillStyle = col
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  dots(g, 30, 131, 'rgba(120,60,20,0.5)')
  title(g, 'PLANETS', 40, '#5a2a10', 30)
  return tex(c, { wrap: false })
}

/** 3: pixel-art adventure on Game Boy green. */
function posterPixel() {
  const { c, g } = posterBase('#9bbc0f', '#8bac0f')
  const art = [
    '....0000....',
    '...000000...',
    '...0.00.0...',
    '...000000...',
    '....0000....',
    '..00000000..',
    '.0.000000.0.',
    '.0.000000.0.',
    '...00..00...',
    '..000..000..',
  ]
  const px = 14
  const ox = PW / 2 - (12 * px) / 2
  g.fillStyle = '#0f380f'
  art.forEach((row, y) => [...row].forEach((ch, x) => ch === '0' && g.fillRect(ox + x * px, 110 + y * px, px, px)))
  g.fillStyle = '#306230'
  for (let x = 10; x < PW - 10; x += 16) g.fillRect(x, 270, 14, 14)
  g.fillStyle = '#0f380f'
  g.font = 'bold 22px monospace'
  g.textAlign = 'center'
  g.fillText('LEVEL 1', PW / 2, 60)
  g.font = 'bold 14px monospace'
  g.fillText('PRESS START', PW / 2, 320)
  return tex(c, { wrap: false })
}

/** 4: robot (right wall). */
function posterRobot() {
  const { c, g } = posterBase('#ffd27a', '#ffb547')
  g.fillStyle = '#2f5d8a'
  g.beginPath()
  g.roundRect(78, 150, 100, 110, 12)
  g.fill()
  g.beginPath()
  g.roundRect(92, 88, 72, 56, 10)
  g.fill()
  g.fillRect(124, 70, 8, 20)
  g.fillStyle = '#ff5d73'
  g.beginPath()
  g.arc(128, 66, 7, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#9fe8ff'
  g.beginPath()
  g.arc(112, 114, 9, 0, Math.PI * 2)
  g.arc(144, 114, 9, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#ffc857'
  g.fillRect(100, 180, 56, 40)
  g.fillStyle = '#2f5d8a'
  g.fillRect(50, 160, 24, 70)
  g.fillRect(182, 160, 24, 70)
  g.fillRect(96, 262, 22, 44)
  g.fillRect(138, 262, 22, 44)
  title(g, 'ROBOTS', 38, '#7a3b1c', 30)
  return tex(c, { wrap: false })
}

export function posterTextures() {
  return [posterRocket(), posterDino(), posterPlanets(), posterPixel(), posterRobot()]
}
