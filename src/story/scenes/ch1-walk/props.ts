import { PAL } from './world.ts'

type G = CanvasRenderingContext2D
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c
  g.fillRect(x, y, w, h)
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Footprints (w x h) in logical px, for the focusable overlay buttons. */
export const PROP_SIZE = { easel: [14, 14], chess: [14, 12], science: [14, 12], robot: [9, 13] } as const

const EASEL_COLS = ['#ff6b81', '#4a6fc8', '#ffd84a', '#4adf8a', '#ff9f43', '#9b6bd6', '#4aa3df', '#ff6b81', '#ffd84a', '#4a6fc8', '#4adf8a', '#ff9f43']
/** Easel: the painting fills with colour blocks as `a` goes 0..1. */
export function drawEasel(g: G, x: number, y: number, a: number): void {
  R(g, x - 1, y + 13, 16, 2, 'rgba(0,0,0,.18)')
  R(g, x + 2, y + 10, 2, 4, PAL.woodD)
  R(g, x + 10, y + 10, 2, 4, PAL.woodD)
  R(g, x, y, 14, 12, '#000')
  R(g, x + 1, y + 1, 12, 10, '#fff')
  const n = Math.floor(clamp01(a) * 12 + 0.0001)
  for (let i = 0; i < n; i++) R(g, x + 1 + (i % 4) * 3, y + 1 + ((i / 4) | 0) * 3, 3, 3, EASEL_COLS[i])
  if (n < 12) R(g, x + 1 + (n % 4) * 3, y + 1 + (((n / 4) | 0) * 3), 3, 3, '#f0eefa')
}

/** Chess table with a knight that hops between squares as `a` goes 0..1. */
export function drawChess(g: G, x: number, y: number, a: number): void {
  R(g, x - 1, y + 11, 16, 2, 'rgba(0,0,0,.18)')
  R(g, x, y, 14, 12, '#000')
  R(g, x + 1, y + 1, 12, 10, PAL.wood)
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) R(g, x + 1 + i * 3, y + 1 + j * 3, 3, 3, (i + j) % 2 ? '#fff' : '#3a2a1a')
  // knight: three positions, two hops
  const t = clamp01(a)
  const pos = [[2, 3], [7, 2], [4, 5]]
  const seg = t < 0.5 ? 0 : 1
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const sx = pos[seg][0] + (pos[seg + 1][0] - pos[seg][0]) * u
  const sy = pos[seg][1] + (pos[seg + 1][1] - pos[seg][1]) * u
  const hop = t > 0 && t < 1 ? Math.round(Math.sin(u * Math.PI) * 4) : 0
  const kx = Math.round(x + sx)
  const ky = Math.round(y + sy) - hop
  R(g, kx + 1, ky + 1, 3, 5, '#000')
  R(g, kx, ky, 3, 5, '#fff')
  R(g, kx, ky + 1, 1, 2, '#000')
  R(g, kx + 1, ky, 1, 1, '#000')
}

/** Science bench: beaker bubbles, then a star pops. */
export function drawScience(g: G, x: number, y: number, a: number): void {
  R(g, x - 1, y + 10, 16, 2, 'rgba(0,0,0,.18)')
  R(g, x, y, 14, 10, '#000')
  R(g, x + 1, y + 1, 12, 8, '#9aa4c8')
  R(g, x + 3, y + 2, 3, 5, '#b6f0ff')
  R(g, x + 3, y + 5, 3, 2, '#4adf8a')
  R(g, x + 8, y + 3, 3, 4, '#ff6b81')
  R(g, x + 9, y + 2, 1, 1, '#fff')
  const t = clamp01(a)
  if (t > 0.02 && t < 0.98) {
    for (let i = 0; i < 3; i++) {
      const f = (t * 2.2 + i * 0.34) % 1
      R(g, x + 3 + (i % 2) + (i === 2 ? 1 : 0), Math.round(y + 4 - f * 9), 1, 1, i === 1 ? '#fff' : '#b6f0ff')
    }
  }
  if (t > 0.55 && t < 0.97) {
    const k = Math.sin(clamp01((t - 0.55) / 0.42) * Math.PI)
    const r = Math.round(1 + k * 2)
    const cx = x + 5
    const cy = y - 6 - Math.round(k * 3)
    R(g, cx - r, cy, r * 2 + 1, 1, '#ffd84a')
    R(g, cx, cy - r, 1, r * 2 + 1, '#ffd84a')
    R(g, cx - 1, cy - 1, 3, 3, '#fff6b0')
  }
}

/** Toy robot: beeps (eyes/antenna flash) and takes a few steps left as `a` goes 0..1 (a < 0 = resting). */
export function drawRobot(g: G, x: number, y: number, a: number): void {
  const t = clamp01(a)
  const walk = t > 0.15 ? clamp01((t - 0.15) / 0.7) : 0
  const ox = -Math.round(walk * 9)
  const step = Math.floor(walk * 6) % 2
  const bx = x + ox
  const beep = t > 0.02 && Math.floor(t * 12) % 2 === 0
  R(g, bx - 1, y + 10, 11, 2, 'rgba(0,0,0,.18)')
  R(g, bx + 1, y + 9 - (step === 1 && walk > 0 && walk < 1 ? 1 : 0), 2, 2, '#444')
  R(g, bx + 6, y + 9 - (step === 0 && walk > 0 && walk < 1 ? 1 : 0), 2, 2, '#444')
  R(g, bx, y, 9, 10, '#000')
  R(g, bx + 1, y + 1, 7, 8, '#c0c6d8')
  R(g, bx + 2, y + 3, 2, 2, beep ? '#ffffff' : '#ff4d4d')
  R(g, bx + 5, y + 3, 2, 2, beep ? '#ffffff' : '#ff4d4d')
  R(g, bx + 3, y + 6, 3, 1, '#555')
  R(g, bx + 4, y - 2, 1, 2, '#000')
  R(g, bx + 3, y - 3, 3, 1, beep ? '#fff6b0' : '#ffd84a')
}

/** Sky-blue star burst colours for the little 'ding' on a win box. */
export const SPARK = '#fff6b0'
