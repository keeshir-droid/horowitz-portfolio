/** Shared helpers for the Chapter 2 canvas: layout, easing, text with self-hosted fonts, cached gradients. */
export type G = CanvasRenderingContext2D

export type FontState = 'pending' | 'ok' | 'fail'

/** Everything the (pure) frame function may read besides progress. */
export interface Assets {
  disp: FontState
  pix: FontState
  /** Colour-graded photo bitmaps per beat (absent = illustrated stand-in). */
  photos: Partial<Record<'karate' | 'stage' | 'council', CanvasImageSource>>
  reduced: boolean
}

export interface Lay {
  /** Logical canvas size: at least 1280x720 (landscape) or 720x1280 (portrait), extended to fill the viewport. */
  W: number
  H: number
  portrait: boolean
  /** Logical units per CSS pixel (text sizes are given in CSS px and multiplied by this). */
  k: number
  /** Safe area (logical units) kept clear for the story HUD at the top and the chapter dock at the bottom. */
  top: number
  bot: number
  A: Assets
  /** Scene progress 0..1. */
  p: number
}

export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v)
export const win = (p: number, a: number, b: number): number => clamp((p - a) / (b - a))
export const ease = (v: number): number => v * v * (3 - 2 * v)
export const easeOut = (v: number): number => 1 - (1 - v) * (1 - v) * (1 - v)
export const easeIn = (v: number): number => v * v * v
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const back = (v: number): number => {
  const c = 1.9
  return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2)
}
export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// ───────────────────────── text ─────────────────────────
export interface TxtOpts {
  f: 'd' | 'p'
  /** Size in logical units. */
  size: number
  color?: string
  align?: CanvasTextAlign
  stroke?: string
  strokeW?: number
  skew?: number
  shadow?: string
  alpha?: number
  spacing?: number
}

export function fontOf(L: Lay, f: 'd' | 'p', size: number): string | null {
  if (f === 'd') {
    if (L.A.disp === 'ok') return `${size}px Ch2Disp`
    if (L.A.disp === 'fail') return `900 ${size * 0.84}px Impact, "Arial Narrow Bold", sans-serif`
    return null
  }
  if (L.A.pix === 'ok') return `${size}px Ch2Pixel`
  if (L.A.pix === 'fail') return `bold ${size * 1.1}px monospace`
  return null
}

export const fontsReady = (L: Lay): boolean => L.A.disp !== 'pending' && L.A.pix !== 'pending'

export function txt(g: G, L: Lay, s: string, x: number, y: number, o: TxtOpts): void {
  const font = fontOf(L, o.f, o.size)
  if (!font) return
  g.save()
  g.font = font
  g.textAlign = o.align ?? 'left'
  g.textBaseline = 'alphabetic'
  g.lineJoin = 'round'
  if (o.spacing) g.letterSpacing = `${o.spacing}px`
  if (o.alpha !== undefined) g.globalAlpha *= clamp(o.alpha)
  g.translate(x, y)
  if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0)
  if (o.shadow) {
    g.fillStyle = o.shadow
    g.fillText(s, o.size * 0.04 + 3, o.size * 0.05 + 3)
  }
  if (o.stroke) {
    g.strokeStyle = o.stroke
    g.lineWidth = o.strokeW ?? o.size * 0.12
    g.strokeText(s, 0, 0)
  }
  g.fillStyle = o.color ?? '#fff'
  g.fillText(s, 0, 0)
  g.restore()
}

export function measure(g: G, L: Lay, s: string, f: 'd' | 'p', size: number): number {
  const font = fontOf(L, f, size)
  if (!font) return 0
  g.font = font
  return g.measureText(s).width
}

// ───────────────────────── shapes ─────────────────────────
export function rect(g: G, x: number, y: number, w: number, h: number, color: string): void {
  g.fillStyle = color
  g.fillRect(x, y, w, h)
}

export function quad(g: G, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.closePath()
}

export function flash(g: G, L: Lay, a: number, color = '#fff'): void {
  if (a <= 0.01) return
  g.save()
  g.globalAlpha = clamp(a)
  g.fillStyle = color
  g.fillRect(-50, -50, L.W + 100, L.H + 100)
  g.restore()
}

/** Radial burst of tapered rays (speed lines / impact). Deterministic per seed. */
export function rays(g: G, cx: number, cy: number, r0: number, r1: number, n: number, color: string, alpha: number, seed = 0, width = 0.03): void {
  if (alpha <= 0.01) return
  g.save()
  g.globalAlpha *= alpha
  g.fillStyle = color
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i + seed) * 0.3
    const rin = r0 + hash(i + 7 + seed) * (r1 - r0) * 0.35
    const rout = r1 * (0.65 + hash(i + 3 + seed) * 0.5)
    const w = width * (0.4 + hash(i + 11 + seed))
    g.moveTo(cx + Math.cos(a - w) * rout, cy + Math.sin(a - w) * rout)
    g.lineTo(cx + Math.cos(a) * rin, cy + Math.sin(a) * rin)
    g.lineTo(cx + Math.cos(a + w) * rout, cy + Math.sin(a + w) * rout)
    g.closePath()
  }
  g.fill()
  g.restore()
}

/** Star-shaped spark polygon. */
export function star(g: G, cx: number, cy: number, rIn: number, rOut: number, n: number, rot: number): void {
  g.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2
    const r = i % 2 ? rIn : rOut
    if (i) g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    else g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  g.closePath()
}

// ───────────────────────── cached gradients ─────────────────────────
/**
 * Gradients are built once per layout (key includes the size) and reused every frame. Build them in coordinates
 * that do not move (screen space of the current layout), or in unit space and draw under a transform.
 */
const gradCache = new Map<string, CanvasGradient>()
let gradCtx: G | null = null
export function grad(g: G, key: string, make: (g: G) => CanvasGradient): CanvasGradient {
  if (gradCtx !== g) {
    gradCache.clear()
    gradCtx = g
  }
  let v = gradCache.get(key)
  if (!v) {
    v = make(g)
    if (gradCache.size > 160) gradCache.clear()
    gradCache.set(key, v)
  }
  return v
}

/** Unit radial glow (centre 0,0 radius 1) in a colour: draw under translate/scale. */
export function glow(g: G, color: string): CanvasGradient {
  return grad(g, `glow:${color}`, (c) => {
    const r = c.createRadialGradient(0, 0, 0, 0, 0, 1)
    r.addColorStop(0, color)
    r.addColorStop(1, 'rgba(0,0,0,0)')
    return r
  })
}

export function glowAt(g: G, color: string, x: number, y: number, rx: number, ry: number, alpha: number): void {
  if (alpha <= 0.01) return
  g.save()
  g.globalAlpha *= alpha
  g.translate(x, y)
  g.scale(rx, ry)
  g.fillStyle = glow(g, color)
  g.beginPath()
  g.arc(0, 0, 1, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** Cached number strings (timer, counters) so text never allocates per frame after warm-up. */
const numCache = new Map<number, string>()
export function numStr(n: number, grouped = false): string {
  const key = grouped ? -n - 1 : n
  let s = numCache.get(key)
  if (s === undefined) {
    s = grouped ? n.toLocaleString('en-US') : String(n)
    if (numCache.size > 4000) numCache.clear()
    numCache.set(key, s)
  }
  return s
}
