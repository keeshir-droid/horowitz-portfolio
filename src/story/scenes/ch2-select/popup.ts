/**
 * The Chapter 2 pop-up: one box per beat at the bottom of the screen (the fight HUD owns the top). Same position and
 * style for all three. Like Chapter 1: one page, typed once, then held; skipped until the fonts are ready.
 * All words come from src/content/entries.ts via config.COPY.
 */
import { BEATS, COPY, POP, TYPE_SECONDS, sec, type BeatKey } from './config'
import { clamp, easeOut, fontOf, fontsReady, quad, txt, win, type G, type Lay } from './kit'
import { INK } from './rig'

interface Box {
  x: number
  y: number
  w: number
  h: number
  statW: number
  headSize: number
  subSize: number
  kickSize: number
  statSize: number
  head: string[]
  sub: string[]
}

const cache = new Map<number, Box>()

function wrapInto(g: G, text: string, maxW: number, out: string[]): void {
  out.length = 0
  let cur = ''
  for (const w of text.split(' ')) {
    const t = cur ? `${cur} ${w}` : w
    if (cur && g.measureText(t).width > maxW) {
      out.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) out.push(cur)
}

/** Box geometry for a beat in this layout (cached; recomputed only when the layout changes). */
export function popupBox(g: G, L: Lay, key: BeatKey): Box | null {
  if (!fontsReady(L)) return null
  const id = BEATS.indexOf(key) * 1e8 + Math.round(L.W) * 1e4 + Math.round(L.H) + (L.portrait ? 0.5 : 0) + (L.bot % 97) * 1e-3
  const hit = cache.get(id)
  if (hit) return hit
  const c = COPY[key]
  const k = L.k
  const margin = (L.portrait ? 12 : 24) * k
  const w = Math.min(L.W - margin * 2, 1040 * k)
  const x = (L.W - w) / 2
  const headSize = (L.portrait ? 25 : 32) * k
  const subSize = (L.portrait ? 19 : 22) * k
  const kickSize = (L.portrait ? 9 : 10) * k
  const statSize = (L.portrait ? 30 : 46) * k
  const pad = (L.portrait ? 14 : 20) * k
  // stat block width from the stat text
  const sf = fontOf(L, 'd', statSize)
  if (!sf) return null
  g.font = sf
  const statW = L.portrait ? 0 : Math.max(120 * k, g.measureText(c.stat).width + 40 * k)
  // the right edge is slanted (sk) and the text starts sk/2 in: keep clear of both
  const textW = w - statW - pad * 2 - 16 * k * 1.6 - (L.portrait ? 0 : 30 * k)
  const head: string[] = []
  const sub: string[] = []
  g.font = fontOf(L, 'd', headSize) ?? sf
  wrapInto(g, c.head, textW, head)
  g.font = fontOf(L, 'd', subSize) ?? sf
  wrapInto(g, c.sub, textW, sub)
  const statRow = L.portrait ? statSize * 1.05 : 0
  const h = pad * 2 + kickSize * 1.8 + statRow + head.length * headSize * 1.02 + sub.length * subSize * 1.12 + 4 * k
  const y = L.H - L.bot - h - 12 * k
  const box: Box = { x, y, w, h, statW, headSize, subSize, kickSize, statSize, head, sub }
  if (cache.size > 40) cache.clear()
  cache.set(id, box)
  return box
}

/** Top edge of the pop-up for a beat (or a sensible estimate before fonts load). */
export function popupTop(g: G, L: Lay, key: BeatKey): number {
  const b = popupBox(g, L, key)
  return b ? b.y : L.H - L.bot - (L.portrait ? 230 : 150) * L.k
}

const res = { key: 'karate' as BeatKey, age: 0, left: 0 }
/** Which pop-up is up at progress p (or null), seconds since it appeared and seconds left (shared result object). */
export function popupAt(p: number): { key: BeatKey; age: number; left: number } | null {
  for (const key of BEATS) {
    const [a, b] = POP[key]
    if (p >= a && p <= b) {
      res.key = key
      res.age = (p - a) / sec(1)
      res.left = (b - p) / sec(1)
      return res
    }
  }
  return null
}

function typed(lines: string[], n: number, i: number): string {
  // characters before line i
  let before = 0
  for (let j = 0; j < i; j++) before += lines[j].length + 1
  const left = n - before
  if (left <= 0) return ''
  return left >= lines[i].length ? lines[i] : lines[i].slice(0, left)
}

export function drawPopup(g: G, L: Lay, key: BeatKey, age: number, outU: number): void {
  const b = popupBox(g, L, key)
  if (!b) return
  const c = COPY[key]
  const k = L.k
  const inU = L.A.reduced ? 1 : easeOut(win(age, 0, 0.16))
  if (inU <= 0) return
  const total = c.head.length + 1 + c.sub.length
  const n = L.A.reduced ? total : Math.floor(clamp(age / TYPE_SECONDS) * total)
  const pad = (L.portrait ? 14 : 20) * k
  g.save()
  g.globalAlpha = inU * (1 - outU)
  g.translate(0, (1 - inU) * 40 * k + outU * 30 * k)
  const { x, y, w, h } = b
  const sk = 16 * k
  // shadow + panel
  g.fillStyle = 'rgba(0,0,0,.5)'
  quad(g, x + sk + 8 * k, y + 8 * k, x + w + 8 * k, y + 8 * k, x + w - sk + 8 * k, y + h + 8 * k, x + 8 * k, y + h + 8 * k)
  g.fill()
  g.fillStyle = 'rgba(10,8,22,.96)'
  quad(g, x + sk, y, x + w, y, x + w - sk, y + h, x, y + h)
  g.fill()
  g.strokeStyle = '#f4f1e8'
  g.lineWidth = 3 * k
  g.stroke()
  // red accent edge
  g.fillStyle = '#ff3b5c'
  quad(g, x + sk, y, x + w, y, x + w - 1.2 * k, y + 5 * k, x + sk - 1.2 * k, y + 5 * k)
  g.fill()
  let tx = x + pad + sk * 0.5
  let ty = y + pad
  if (!L.portrait) {
    // gold stat block
    const sx = x + sk * 0.5 + 10 * k
    g.fillStyle = '#ffd84a'
    quad(g, sx + 12 * k, y + 14 * k, sx + b.statW, y + 14 * k, sx + b.statW - 12 * k, y + h - 14 * k, sx, y + h - 14 * k)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3 * k
    g.stroke()
    txt(g, L, c.stat, sx + b.statW / 2, y + h / 2 + b.statSize * 0.36, { f: 'd', size: b.statSize, align: 'center', color: INK })
    tx = sx + b.statW + 20 * k
  }
  // kicker
  ty += b.kickSize
  txt(g, L, c.kicker.toUpperCase(), tx, ty, { f: 'p', size: b.kickSize, color: '#ff8fa0' })
  ty += b.kickSize * 0.8
  if (L.portrait) {
    ty += b.statSize
    txt(g, L, c.stat, tx, ty, { f: 'd', size: b.statSize, color: '#ffd84a', stroke: INK, strokeW: 5 * k })
  }
  // headline, then supporting line (typed)
  for (let i = 0; i < b.head.length; i++) {
    ty += b.headSize * 1.02
    const s = typed(b.head, n, i)
    if (s) txt(g, L, s, tx, ty, { f: 'd', size: b.headSize, color: '#ffffff', spacing: 0.5 })
  }
  const nSub = n - (c.head.length + 1)
  for (let i = 0; i < b.sub.length; i++) {
    ty += b.subSize * 1.12
    const s = typed(b.sub, nSub, i)
    if (s) txt(g, L, s, tx, ty, { f: 'd', size: b.subSize, color: '#cfd2e6', spacing: 0.5 })
  }
  // done-typing marker (blinks like Chapter 1's arrow)
  if (n >= total && (L.A.reduced || Math.floor(age * 2.5) % 2 === 0)) {
    const ax = x + w - sk - 18 * k
    const ay = y + h - 16 * k
    g.fillStyle = '#ffd84a'
    g.beginPath()
    g.moveTo(ax - 8 * k, ay - 6 * k)
    g.lineTo(ax + 8 * k, ay - 6 * k)
    g.lineTo(ax, ay + 4 * k)
    g.closePath()
    g.fill()
  }
  g.restore()
}
