/**
 * Chapter 2 frame function: a pure function of scene progress (plus fonts, photos, viewport). No clock, no RAF.
 * Beats: select -> STAGE 1 card -> karate fight (K.O., bow, medal photo) -> STAGE 2 card -> stage bow (photo) ->
 * STAGE 3 card -> council speech (photo) -> ALL STAGES CLEAR -> NEXT LEVEL. The cards wipe over the beat before them
 * and off the beat after them, so they are the only transitions.
 */
import { CARD, CARDS, FS, PHOTO_AT, SEL, T, sec, type BeatKey } from './config'
import { drawCard, drawEnding, wipeEdge, wipeInPath, wipeOutPath } from './cards'
import { arenaFrame, drawFight, shot } from './fight'
import { ease, flash, win, type Assets, type G, type Lay } from './kit'
import { drawPhotoDrop, photoSlot, type SlotRefs } from './photo'
import { drawPopup, popupAt, popupTop } from './popup'
import { councilX, drawCouncil, drawSelect, drawStage, popupFloor, stageX } from './sets'

export type { Assets } from './kit'

const L: Lay = { W: 1280, H: 720, portrait: false, k: 1, top: 0, bot: 0, A: { disp: 'pending', pix: 'pending', photos: {}, reduced: false }, p: 0 }
const refs: SlotRefs = { x: 0, gy: 0, s: 1, popTop: 0 }
/** A hair inside a window, so "the last frame of the beat before" and "the first frame after" stay in their beat. */
const EPS = 1e-6

/** Seconds since progress `a`. */
const since = (p: number, a: number): number => (p - a) / sec(1)

function beatFloor(key: BeatKey, g: G): number {
  return popupFloor(L, popupTop(g, L, key))
}

/** Photo + pop-up layer for whichever beat is showing at p (drawn over the beat, under any wipe). */
function overlays(g: G, p: number, key: BeatKey | null): void {
  if (key) {
    const age = since(p, PHOTO_AT[key])
    if (age >= 0) drawPhotoDrop(g, L, key, photoSlot(L, key, refs), age)
  }
  const pop = popupAt(p)
  if (pop) drawPopup(g, L, pop.key, pop.age, 0)
}

/** Draw every beat except the cards and the finish (those wipe over it). */
function drawBeat(g: G, p: number): void {
  if (p < T.select[1]) {
    const ts = since(p, T.select[0])
    let cursor = 3
    for (let i = 0; i < SEL.cursor.length; i++) cursor -= ease(win(ts, SEL.cursor[i], SEL.cursor[i] + 0.08))
    const lock = ts >= SEL.lock ? 1 - win(ts, SEL.lock, SEL.lock + 0.25) * 0.6 : 0
    const push = ease(win(ts, SEL.out, 1.0))
    g.save()
    if (push > 0) {
      const z = 1 + push * 0.12
      const ox = L.W * (L.portrait ? 0.4 : 0.25)
      g.translate(ox, L.H * 0.55)
      g.scale(z, z)
      g.translate(-ox, -L.H * 0.55)
    }
    drawSelect(g, L, { ts, cursor, lock, you: cursor < 0.5, titleIn: win(ts, 0, 0.18) })
    g.restore()
    if (lock > 0) flash(g, L, 0.55 * (1 - win(ts, SEL.lock, SEL.lock + 0.15)), '#fff')
    return
  }
  if (p < T.card2[0]) {
    const ft = since(p, T.fight[0]) / FS
    const gy = arenaFrame(L).gy
    const pt = popupTop(g, L, 'karate')
    const lift = ease(win(ft, 5.0, 5.45)) * Math.max(0, gy - (pt - 18 * L.k))
    drawFight(g, L, ft, { lift })
    refs.x = shot.x
    refs.gy = shot.gy
    refs.s = shot.s
    refs.popTop = pt
    overlays(g, p, 'karate')
    return
  }
  if (p < T.card3[0]) {
    const fl = beatFloor('stage', g)
    drawStage(g, L, win(p, T.stage[0], T.stage[1]), fl, since(p, T.stage[0]))
    refs.x = stageX(L)
    refs.gy = fl
    refs.s = L.portrait ? 1.45 : 1.15
    refs.popTop = popupTop(g, L, 'stage')
    overlays(g, p, 'stage')
    return
  }
  const fl = beatFloor('council', g)
  drawCouncil(g, L, win(p, T.council[0], T.council[1]), fl, since(p, T.council[0]))
  refs.x = councilX(L)
  refs.gy = fl
  refs.s = L.portrait ? 1.45 : 1.18
  refs.popTop = popupTop(g, L, 'council')
  overlays(g, p, 'council')
}

/** A wipe in over the beat that just ended, then `face` covers the screen; a wipe out reveals the next beat. */
function wiped(g: G, ts: number, a: number, b: number, len: number, face: (g: G, ts: number) => void): void {
  if (ts < CARD.inEnd) {
    drawBeat(g, a - EPS)
    g.save()
    const X = wipeInPath(g, L, ts / CARD.inEnd)
    g.clip()
    face(g, ts)
    g.restore()
    wipeEdge(g, L, X, false)
    return
  }
  const outFrom = CARD.out
  if (b >= 0 && ts > outFrom) {
    drawBeat(g, b + EPS)
    g.save()
    const X = wipeOutPath(g, L, (ts - outFrom) / (len - outFrom))
    g.clip()
    face(g, ts)
    g.restore()
    wipeEdge(g, L, X, true)
    return
  }
  face(g, ts)
}

let cardIdx = 0
function cardFace(g: G, ts: number): void {
  drawCard(g, L, cardIdx, ts)
}
function endFace(g: G, ts: number): void {
  drawEnding(g, L, ts)
}

export function drawFrame(g: G, p: number, vw: number, vh: number, dpr: number, safeTopCss: number, safeBotCss: number, A: Assets): void {
  const portrait = vw / vh < 0.85
  const bw = portrait ? 720 : 1280
  const bh = portrait ? 1280 : 720
  const s = Math.min(vw / bw, vh / bh)
  L.W = vw / s
  L.H = vh / s
  L.portrait = portrait
  L.k = dpr / s
  L.top = safeTopCss * L.k
  L.bot = safeBotCss * L.k
  L.A = A
  L.p = p
  g.setTransform(s, 0, 0, s, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.fillStyle = '#07070d'
  g.fillRect(0, 0, L.W, L.H)

  for (let i = 0; i < CARDS.length; i++) {
    const [a, b] = CARDS[i].win
    if (p >= a && p < b) {
      cardIdx = i
      wiped(g, since(p, a), a, b, (b - a) / sec(1), cardFace)
      return
    }
  }
  if (p >= T.end[0]) {
    wiped(g, since(p, T.end[0]), T.end[0], -1, (T.end[1] - T.end[0]) / sec(1), endFace)
    return
  }
  drawBeat(g, p)
}
