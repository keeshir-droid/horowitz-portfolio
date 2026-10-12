import { KEYS, PROPS } from './config.ts'
import { drawText, textWidth } from './font.ts'

/** Game Boy Color-era palette, Pokemon Red/Blue overworld feel: soft greens, dark outlines, 3-tone shading. */
export const PAL = {
  grass: '#88c070', grassD: '#58a038', grassL: '#a8d888',
  path: '#e8d098', pathE: '#c8a064', pathD: '#a88048', pathP: '#d4b478',
  water: '#58a8e8', waterL: '#a8d8f8', waterD: '#3878c0', shore: '#d0ecfa',
  ink: '#202838', wall: '#f8f0d8', wallS: '#d8c8a0', wallD: '#b8a478',
  roofR: '#d84838', roofRL: '#f08068', roofRD: '#a83028', roofB: '#4878d0', roofBL: '#78a0f0', roofBD: '#3050a0',
  door: '#a06830', doorD: '#784820', win: '#f8d848', winD: '#c09820', glass: '#a8d8f0', sill: '#c0a050',
  treeD: '#285830', tree: '#38883a', treeL: '#68b058', wood: '#a9764a', woodD: '#7a5030',
  white: '#f8f8f8', fenceD: '#8890a8', lamp: '#f8d848', flowerR: '#f06080', flowerY: '#f8d848', flowerW: '#ffffff',
}

export const WORLD_W = 240
export const WH = 768
export const PATH_HW = 8

/** The ONE route: bottom (town entrance) to the house door. Axis-aligned S-curve, never loops or forks. */
export const ROUTE: ReadonlyArray<readonly [number, number]> = [
  [128, 744], [128, 696], [104, 696], [104, 584], [152, 584], [152, 456], [104, 456], [104, 328], [152, 328], [152, 232], [128, 232], [128, 112],
]
const NSEG = ROUTE.length - 1
const segStart = new Float32Array(NSEG + 1)
for (let i = 0; i < NSEG; i++) segStart[i + 1] = segStart[i] + Math.abs(ROUTE[i + 1][0] - ROUTE[i][0]) + Math.abs(ROUTE[i + 1][1] - ROUTE[i][1])
export const ROUTE_LEN = segStart[NSEG]

/** Distance along the route for scene progress (pure, monotonic non-decreasing). */
export function sAt(p: number): number {
  if (p <= KEYS[0][0]) return KEYS[0][1]
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i][0]) {
      const a = KEYS[i - 1]
      const b = KEYS[i]
      return b[0] === a[0] ? b[1] : a[1] + ((p - a[0]) / (b[0] - a[0])) * (b[1] - a[1])
    }
  }
  return KEYS[KEYS.length - 1][1]
}

export interface Pos {
  x: number
  y: number
  dx: number
  dy: number
}
/** Position and travel direction at distance s (writes into `o`, no allocation). */
export function posAt(s: number, o: Pos): Pos {
  const d = s < 0 ? 0 : s > ROUTE_LEN ? ROUTE_LEN : s
  let i = 0
  while (i < NSEG - 1 && d > segStart[i + 1]) i++
  const a = ROUTE[i]
  const b = ROUTE[i + 1]
  const l = segStart[i + 1] - segStart[i]
  const u = l > 0 ? (d - segStart[i]) / l : 0
  o.dx = Math.sign(b[0] - a[0])
  o.dy = Math.sign(b[1] - a[1])
  o.x = a[0] + (b[0] - a[0]) * u
  o.y = a[1] + (b[1] - a[1]) * u
  return o
}

/** True while the kid is actually travelling (not standing at a stop) at progress p. */
export function travelling(p: number): boolean {
  return Math.abs(sAt(Math.min(1, p + 0.002)) - sAt(Math.max(0, p - 0.002))) > 0.05
}

// ───────────────────────── layout ─────────────────────────

type G = CanvasRenderingContext2D
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c
  g.fillRect(x, y, w, h)
}
/** Rect with a 1px dark outline. */
const OR = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  R(g, x, y, w, h, PAL.ink)
  R(g, x + 1, y + 1, w - 2, h - 2, c)
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
interface HouseDef extends Rect {
  red: boolean
}
/** 64 x 48 houses: 24px roof + 24px wall. */
const HOUSES: HouseDef[] = [
  { x: 16, y: 640, w: 64, h: 48, red: true },
  { x: 160, y: 696, w: 64, h: 48, red: false },
  { x: 16, y: 536, w: 64, h: 48, red: false },
  { x: 168, y: 512, w: 64, h: 48, red: true },
  { x: 16, y: 372, w: 64, h: 48, red: true },
  { x: 168, y: 262, w: 64, h: 48, red: false },
  { x: 168, y: 140, w: 64, h: 48, red: true },
  { x: 16, y: 160, w: 64, h: 48, red: false },
]
export const MAIN_HOUSE = { x: 88, y: 48, w: 80, roofH: 40, wallH: 32 }
const PONDS: Rect[] = [
  { x: 168, y: 604, w: 44, h: 28 },
  { x: 24, y: 456, w: 40, h: 24 },
]
export const POND_RECTS = PONDS
const TALL_GRASS: Rect = { x: 176, y: 636, w: 48, h: 32 }

const BLOCK_RECTS: Rect[] = [
  ...HOUSES.map((h) => ({ x: h.x - 2, y: h.y - 4, w: h.w + 4, h: h.h + 14 })),
  ...PONDS.map((p) => ({ x: p.x - 4, y: p.y - 4, w: p.w + 8, h: p.h + 8 })),
  { x: MAIN_HOUSE.x - 6, y: 30, w: MAIN_HOUSE.w + 12, h: 100 },
  { x: 76, y: 706, w: 44, h: 22 },
  TALL_GRASS,
  ...PROPS.map((p) => ({ x: p.x - 4, y: p.y - 6, w: 26, h: 28 })),
]

/** Is (x,y) within `r` px of the path, a building, a pond or a prop? */
function blocked(x: number, y: number, r: number): boolean {
  for (let i = 0; i < NSEG; i++) {
    const a = ROUTE[i]
    const b = ROUTE[i + 1]
    if (
      x >= Math.min(a[0], b[0]) - PATH_HW - r &&
      x <= Math.max(a[0], b[0]) + PATH_HW + r &&
      y >= Math.min(a[1], b[1]) - PATH_HW - r &&
      y <= Math.max(a[1], b[1]) + PATH_HW + r
    )
      return true
  }
  for (const h of BLOCK_RECTS) if (x >= h.x - r && x <= h.x + h.w + r && y >= h.y - r && y <= h.y + h.h + r) return true
  return false
}

/** Flowers (2-frame sway is drawn by the renderer). */
export const FLOWERS: Array<[number, number, string]> = []
{
  let n = 4242
  const cols = [PAL.flowerR, PAL.flowerY, PAL.flowerW]
  for (let i = 0; i < 90; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const x = 18 + (n % 204)
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const y = 20 + (n % 720)
    if (!blocked(x, y, 6) && (x < 12 || x > 18)) FLOWERS.push([x, y, cols[i % 3]])
  }
}

// ───────────────────────── drawing ─────────────────────────

function pathLayer(g: G): void {
  const seg = (grow: number, c: string) => {
    g.fillStyle = c
    for (let i = 0; i < NSEG; i++) {
      const a = ROUTE[i]
      const b = ROUTE[i + 1]
      const x0 = Math.min(a[0], b[0]) - PATH_HW - grow
      const y0 = Math.min(a[1], b[1]) - PATH_HW - grow
      g.fillRect(x0, y0, Math.abs(b[0] - a[0]) + PATH_HW * 2 + grow * 2, Math.abs(b[1] - a[1]) + PATH_HW * 2 + grow * 2)
    }
  }
  seg(2, PAL.pathD)
  seg(1, PAL.pathE)
  seg(0, PAL.path)
  let n = 7
  for (let i = 0; i < 500; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const x = 90 + (n % 76)
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const y = 100 + (n % 650)
    if (blocked(x, y, -2)) R(g, x, y, 2, 1, PAL.pathP)
  }
}

function tree16(g: G, x: number, y: number): void {
  R(g, x + 2, y + 14, 12, 2, 'rgba(32,56,40,.35)')
  for (let j = 0; j < 15; j++) {
    for (let i = 0; i < 16; i++) {
      const d = (i - 7.5) ** 2 + (j - 7) ** 2
      if (d > 56) continue
      let c = PAL.ink
      if (d <= 42) {
        c = PAL.tree
        if ((i - 5) ** 2 + (j - 5) ** 2 < 10) c = PAL.treeL
        else if (j > 8 || i > 10) c = PAL.treeD
      }
      R(g, x + i, y + j, 1, 1, c)
    }
  }
  R(g, x + 7, y + 4, 2, 1, PAL.treeD)
  R(g, x + 5, y + 8, 2, 1, PAL.treeL)
}

function roofBody(g: G, x: number, y: number, w: number, h: number, red: boolean): void {
  const mid = red ? PAL.roofR : PAL.roofB
  const lt = red ? PAL.roofRL : PAL.roofBL
  const dk = red ? PAL.roofRD : PAL.roofBD
  R(g, x - 2, y, w + 4, h, PAL.ink)
  R(g, x - 1, y + 1, w + 2, h - 2, mid)
  R(g, x - 1, y + 1, w + 2, 3, lt) // ridge highlight
  for (let r = 6; r < h - 4; r += 4) {
    R(g, x - 1, r + y, w + 2, 1, dk)
    for (let c = ((r / 4) & 1) * 4; c < w; c += 8) R(g, x + c, y + r - 3, 1, 3, dk)
  }
  R(g, x - 1, y + h - 4, w + 2, 3, dk) // eave shadow
  R(g, x - 1, y + 1, 2, h - 2, dk)
  R(g, x + w - 1, y + 1, 2, h - 2, dk)
}

function win(g: G, x: number, y: number, w: number, h: number): void {
  OR(g, x, y, w, h, PAL.win)
  R(g, x + 1, y + 1, w - 2, 2, '#fff1a0')
  R(g, x + (w >> 1), y + 1, 1, h - 2, PAL.winD)
  R(g, x + 1, y + (h >> 1), w - 2, 1, PAL.winD)
  OR(g, x - 1, y + h, w + 2, 3, PAL.sill)
}

function smallHouse(g: G, h: HouseDef): void {
  const rh = 24
  R(g, h.x - 1, h.y + h.h, h.w + 2, 3, 'rgba(32,56,40,.3)')
  // chimney
  OR(g, h.x + h.w - 18, h.y - 7, 8, 12, '#b0584a')
  R(g, h.x + h.w - 17, h.y - 8, 6, 2, PAL.ink)
  roofBody(g, h.x, h.y, h.w, rh, h.red)
  OR(g, h.x, h.y + rh, h.w, h.h - rh, PAL.wall)
  R(g, h.x + 1, h.y + h.h - 4, h.w - 2, 3, PAL.wallS)
  win(g, h.x + 6, h.y + rh + 5, 12, 10)
  win(g, h.x + h.w - 18, h.y + rh + 5, 12, 10)
  const dx = h.x + (h.w >> 1) - 5
  OR(g, dx, h.y + rh + 6, 10, h.h - rh - 6, PAL.door)
  R(g, dx + 2, h.y + rh + 8, 6, 5, PAL.doorD)
  R(g, dx + 7, h.y + rh + 14, 1, 1, PAL.win)
  OR(g, dx - 2, h.y + h.h - 1, 14, 3, PAL.wallD)
}

function fenceH(g: G, x: number, y: number, n: number): void {
  R(g, x, y + 4, n * 6 - 2, 1, PAL.fenceD)
  for (let i = 0; i < n; i++) {
    R(g, x + i * 6, y, 4, 8, PAL.fenceD)
    R(g, x + i * 6 + 1, y + 1, 2, 6, PAL.white)
  }
}
function fenceV(g: G, x: number, y: number, n: number): void {
  R(g, x + 3, y, 1, n * 6 - 2, PAL.fenceD)
  for (let i = 0; i < n; i++) {
    R(g, x, y + i * 6, 8, 4, PAL.fenceD)
    R(g, x + 1, y + i * 6 + 1, 6, 2, PAL.white)
  }
}

function lamp(g: G, x: number, y: number): void {
  R(g, x - 3, y + 1, 7, 2, 'rgba(32,56,40,.3)')
  R(g, x - 1, y - 12, 3, 13, PAL.ink)
  OR(g, x - 3, y - 17, 7, 6, '#505878')
  R(g, x - 2, y - 16, 5, 4, PAL.lamp)
}

function mailbox(g: G, x: number, y: number): void {
  R(g, x + 2, y + 5, 2, 5, PAL.woodD)
  OR(g, x, y, 6, 6, '#d84838')
  R(g, x + 1, y + 1, 4, 1, PAL.roofRL)
}

function signpost(g: G, x: number, y: number, label: string): void {
  const w = textWidth(label) + 8 // 4px margin each side
  const bx = x + 14 - Math.floor(w / 2) // keep post centred where it was
  R(g, bx + Math.floor(w / 2) - 1, y + 10, 2, 8, PAL.woodD)
  OR(g, bx, y, w, 11, PAL.wood)
  R(g, bx + 1, y + 1, w - 2, 1, '#c89060')
  drawText(g, label, bx + 4, y + 3, '#ffffff')
}

function pond(g: G, r: Rect): void {
  OR(g, r.x - 2, r.y - 2, r.w + 4, r.h + 4, PAL.shore)
  R(g, r.x, r.y, r.w, r.h, PAL.water)
  R(g, r.x, r.y + r.h - 4, r.w, 4, PAL.waterD)
  R(g, r.x, r.y, 2, 2, PAL.shore)
  R(g, r.x + r.w - 2, r.y, 2, 2, PAL.shore)
  R(g, r.x + 4, r.y + 4, 8, 1, PAL.waterL)
}

function tallGrass(g: G, r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y += 8)
    for (let x = r.x; x < r.x + r.w; x += 8) {
      R(g, x, y, 8, 8, PAL.grassD)
      R(g, x + 1, y + 1, 2, 5, PAL.treeD)
      R(g, x + 4, y + 2, 2, 5, PAL.treeD)
      R(g, x + 2, y, 1, 3, PAL.grassL)
      R(g, x + 5, y + 1, 1, 3, PAL.grassL)
    }
}

function mainHouse(g: G): void {
  const { x, y, w, roofH, wallH } = MAIN_HOUSE
  const wy = y + roofH
  R(g, x - 2, wy + wallH, w + 4, 3, 'rgba(32,56,40,.3)')
  OR(g, x + 56, y - 10, 10, 16, '#b0584a')
  R(g, x + 55, y - 11, 12, 3, PAL.ink)
  R(g, x + 57, y - 9, 8, 1, '#d07868')
  roofBody(g, x, y, w, roofH, true)
  R(g, x + 2, y + 18, w - 4, 1, PAL.roofRD)
  OR(g, x, wy, w, wallH, PAL.wall)
  R(g, x + 1, wy + wallH - 4, w - 2, 3, PAL.wallS)
  // display window with the shelf of small trophies (left)
  OR(g, x + 4, wy + 6, 26, 20, PAL.ink)
  R(g, x + 5, wy + 7, 24, 18, PAL.glass)
  R(g, x + 5, wy + 7, 24, 2, '#d8f0fc')
  for (const sy of [wy + 15, wy + 23]) {
    R(g, x + 5, sy, 24, 2, PAL.wood)
    R(g, x + 5, sy + 1, 24, 1, PAL.woodD)
  }
  const cups = [['#f8d848', 11], ['#e0e4f0', 18], ['#f8d848', 25], ['#d0904a', 12], ['#f8d848', 19], ['#e0e4f0', 26]] as const
  cups.forEach(([col, cx], i) => {
    const cy = i < 3 ? wy + 8 : wy + 16
    const kx = x + cx - 3
    R(g, kx, cy, 5, 3, col)
    R(g, kx + 2, cy + 3, 1, 2, col)
    R(g, kx, cy + 5, 5, 2, col)
    R(g, kx, cy, 1, 1, '#fff')
  })
  OR(g, x + 3, wy + 26, 28, 3, PAL.sill)
  OR(g, x + 46, wy + 8, 22, 20, PAL.ink) // right window frame (photo or lit window drawn by the renderer)
}

/** Pre-render the whole static world once (WORLD_W x WH). */
export function buildWorld(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = WORLD_W
  c.height = WH
  const g = c.getContext('2d')!
  R(g, 0, 0, WORLD_W, WH, PAL.grass)
  let n = 99
  for (let i = 0; i < 260; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const x = n % WORLD_W
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const y = n % WH
    if (!blocked(x, y, 2)) {
      R(g, x, y + 1, 1, 2, PAL.grassD)
      R(g, x + 1, y, 1, 3, PAL.grassD)
      R(g, x + 2, y + 1, 1, 2, PAL.grassD)
    }
  }
  pathLayer(g)
  tallGrass(g, TALL_GRASS)
  PONDS.forEach((p) => pond(g, p))
  // garden fences and mailboxes in front of the houses
  for (const h of HOUSES) {
    const fy = h.y + h.h + 6
    const side = h.x < 100 ? 1 : 0
    fenceH(g, h.x - 2, fy, 5)
    fenceH(g, h.x + h.w - 28, fy, 5)
    mailbox(g, side ? h.x + h.w + 4 : h.x - 6, fy - 2)
  }
  fenceV(g, 118, 640, 4)
  fenceV(g, 136, 524, 4)
  fenceH(g, 118, 598, 4)
  HOUSES.forEach((h) => smallHouse(g, h))
  mainHouse(g)
  signpost(g, 82, 710, 'WELCOME')
  const lamps = [[116, 620], [140, 560], [116, 420], [140, 340], [112, 214], [144, 214], [112, 168], [144, 168]]
  lamps.forEach(([x, y]) => lamp(g, x, y))
  // dense tree-line borders (2x2-block trees)
  const put = (x: number, y: number) => {
    if (!blocked(x + 8, y + 8, 6)) tree16(g, x, y)
  }
  for (let y = -8; y < WH; y += 16) {
    put(0, y)
    put(224, y)
    if (y % 32 === 0) {
      put(14, y + 8)
      put(210, y + 8)
    }
  }
  for (let x = 0; x < WORLD_W; x += 16) {
    put(x, 0)
    put(x + 8, 14)
    if (x < 112 || x > 144) put(x, WH - 16)
  }
  for (const [x, y] of [[100, 500], [96, 420], [124, 340], [130, 232], [60, 300], [196, 440]]) put(x, y)
  return c
}
