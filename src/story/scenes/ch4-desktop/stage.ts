/**
 * Chapter 4 DOM stage: builds the room (SVG), the CRT screen (HTML desktop) and the full-frame sky once, then
 * `paint(t)` sets every style as a pure function of the scene time t (seconds) and the layout.
 * The screen is NOT scaled with the room: its box is computed from the camera every frame, so the desktop text is
 * laid out at its real pixel size (sharp) and container units always refer to the visible 4:3 screen.
 */
import './desk.css'
import {
  COUNT_NUMBERS,
  COUNT_STEP,
  CUSTOMERS,
  CUSTOMER_0,
  CUSTOMER_STEP,
  CUSTOMER_WALK,
  DECOR,
  ICON_STEP,
  PANE,
  PHONE_TEXT,
  ROOM,
  SCREEN,
  T,
  type Rect,
} from './config'
import { SCREEN_HTML, SHIPPED_COUNT, SHOP_ITEMS, TILE_ORDER, VOTES } from './desktop'
import { projects, projectsLive, TOTAL_PROJECTS } from '../../../content/projects'
import { ROOM_SVG, SKY_HTML } from './room'

export interface StageLayout {
  w: number
  h: number
  /** Phone layout: full-width windows, bigger text, simplified contents. */
  phone: boolean
  /** Where the 4:3 screen sits (viewport px) when the camera is on the screen. */
  target: Rect
  /** Region below the HUD / above the dock. */
  safe: Rect
}

// ───────── math ─────────
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
const eo = (x: number): number => 1 - Math.pow(1 - x, 3)
const io = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const ei = (x: number): number => x * x * x
const f2 = (n: number): string => n.toFixed(2)
const f3 = (n: number): string => n.toFixed(3)

// ───────── camera ─────────
interface Cam {
  s: number
  fx: number
  fy: number
  px: number
  py: number
}
function fit(r: Rect, box: Rect, cover: boolean, zoom = 1): Cam {
  const s = (cover ? Math.max(box.w / r.w, box.h / r.h) : Math.min(box.w / r.w, box.h / r.h)) * zoom
  return { s, fx: r.x + r.w / 2, fy: r.y + r.h / 2, px: box.x + box.w / 2, py: box.y + box.h / 2 }
}
const mixCam = (a: Cam, b: Cam, u: number): Cam => ({
  s: a.s * Math.pow(b.s / a.s, u),
  fx: lerp(a.fx, b.fx, u),
  fy: lerp(a.fy, b.fy, u),
  px: lerp(a.px, b.px, u),
  py: lerp(a.py, b.py, u),
})

interface Cams {
  open: Cam
  screen: Cam
  wide: Cam
  window: Cam
}

function camsFor(L: StageLayout): Cams {
  const view: Rect = { x: 0, y: 0, w: L.w, h: L.h }
  const pad = L.phone ? 6 : 20
  const safePad: Rect = { x: L.safe.x + pad, y: L.safe.y + pad, w: L.safe.w - 2 * pad, h: L.safe.h - 2 * pad }
  return {
    open: fit({ x: 430, y: 150, w: 1000, h: 640 }, safePad, false),
    screen: fit(SCREEN, L.target, false),
    wide: L.phone ? fit({ x: 120, y: 60, w: 600, h: 700 }, view, false) : fit({ x: 30, y: 40, w: 1330, h: 760 }, view, false),
    window: fit(PANE, view, true, 1.06),
  }
}

/** Camera -> room transform (the room always covers the viewport). */
function xform(c: Cam, W: number, H: number): { s: number; ox: number; oy: number } {
  const s = Math.max(c.s, W / ROOM.w, H / ROOM.h)
  let ox = c.px - s * c.fx
  let oy = c.py - s * c.fy
  ox = Math.min(0, Math.max(W - s * ROOM.w, ox))
  oy = Math.min(0, Math.max(H - s * ROOM.h, oy))
  return { s, ox, oy }
}

// ───────── windows ─────────
const WIN_SPANS: Record<string, readonly [number, number]> = {
  'w-mail': T.mail,
  'w-err': [T.err, T.mail[1]],
  'w-setup': T.setup,
  'w-pet': T.pet,
  'w-tyc': T.tyc,
  'w-feed': T.feed,
  'w-chat': T.chat,
  'w-fold': T.fold,
  'w-test': T.test,
  'w-ad': T.ad,
  'w-class': [T.cls[0], T.min[1]],
}
/** Taskbar buttons: [label, open, close]. After the minimise the last ones stay as un-pressed buttons. */
const TASKS: readonly (readonly [string, number, number])[] = [
  ['Inbox', T.mail[0], T.off[0]],
  ['Setup', T.setup[0], T.setup[1]],
  ['product sheet.doc', T.pet[0], T.pet[1]],
  ['Décor Tycoon', T.tyc[0], T.tyc[1]],
  ['Feed', T.feed[0], T.feed[1]],
  ['Chat', T.chat[0], T.chat[1]],
  ['21 in 21', T.fold[0], T.fold[1]],
  ['Idea Tester', T.test[0], T.test[1]],
  ['Ad Maker', T.ad[0], T.ad[1]],
  ['Prototyping class', T.cls[0], 999],
]
/** Mouse cursor waypoints (t, x cqw, y cqh); hidden outside CURSOR_ON and on phone. */
const CURSOR_PATH: readonly (readonly [number, number, number])[] = [
  [3.6, 62, 70],
  [4.35, 8.5, 6.5],
  [8.8, 8.5, 6.5],
  [10.8, 50, 46],
  [18.6, 60, 62],
  [21.25, 80, 77],
  [24, 84, 80],
  [29, 12, 88],
  [48.4, 80, 82],
  [52.4, 31, 37],
  [55.6, 31, 37],
  [57.6, 50, 60],
  [58.6, 50, 44],
  [61, 60, 70],
]
const CURSOR_ON: readonly (readonly [number, number])[] = [
  [3.6, T.off[0]],
  [T.setup[0], T.badge[0]],
]
const HOT_TILE = { idx: 2, t: [52.4, T.fold[1]] as const }

const SETUP_LINES: readonly (readonly [number, string])[] = [
  [0, 'Joining a startup accelerator in India…'],
  [20.0, 'Learning to build real businesses…'],
  [T.setupDone, 'Done. Plan B is now Plan A.'],
]
const TYPED = 'A lamp shaped like a cloud'

const q = <E extends Element = HTMLElement>(root: ParentNode, sel: string): E => root.querySelector(sel) as E
const qa = <E extends Element = HTMLElement>(root: ParentNode, sel: string): E[] => [...root.querySelectorAll<E>(sel)]

export class DeskStage {
  readonly root: HTMLElement
  private layout: StageLayout | null = null
  private reduced = false
  private cams: Cams | null = null
  private tasksKey = ''
  /** Tile under the real pointer / keyboard focus in the 21-in-21 folder (-1 = none). */
  private hover = -1
  private lastT = 0
  private detailIdx = -2
  private e: ReturnType<typeof build>

  constructor(host: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'c4-root'
    host.appendChild(this.root)
    this.e = build(this.root)
    const grid = this.e.wins['w-fold']
    const pick = (ev: Event): void => {
      const el = (ev.target as Element | null)?.closest?.('[data-tile]') as HTMLElement | null
      this.hover = el ? Number(el.dataset.tile) : -1
      this.paintDetail(this.lastT)
    }
    const leave = (): void => {
      this.hover = -1
      this.paintDetail(this.lastT)
    }
    grid.addEventListener('pointerover', pick)
    grid.addEventListener('focusin', pick)
    grid.addEventListener('pointerout', leave)
    grid.addEventListener('focusout', leave)
  }

  /** The folder's detail line: the hovered/focused project, else the one the cursor points at. Text from projects.ts. */
  private paintDetail(t: number): void {
    const hot = TILE_ORDER[HOT_TILE.idx]
    const idx = this.hover >= 0 ? this.hover : t >= HOT_TILE.t[0] ? hot : -1
    if (idx === this.detailIdx) return
    this.detailIdx = idx
    const p = idx >= 0 ? projects[idx] : undefined
    const d = this.e.foldDetail
    d.style.visibility = p ? 'visible' : 'hidden'
    if (!p) return
    const [b, s] = [d.firstElementChild as HTMLElement, d.lastElementChild as HTMLElement]
    b.textContent = p.url || p.kind === 'skill' ? `Day ${p.day} · ${p.title}:` : `Day ${p.day}:`
    s.textContent = p.blurb + (p.url ? ' (click to open)' : '')
  }

  setLayout(L: StageLayout, reduced: boolean): void {
    const o = this.layout
    if (o && o.w === L.w && o.h === L.h && o.phone === L.phone && this.reduced === reduced && o.target.h === L.target.h) return
    this.layout = L
    this.reduced = reduced
    this.cams = camsFor(L)
    this.root.classList.toggle('c4-phone', L.phone)
    this.root.classList.toggle('c4-reduced', reduced)
    this.e.screen.style.setProperty('--tx', L.phone ? String(PHONE_TEXT) : '1')
  }

  setDodge(transform: string): void {
    this.e.dodge.style.transform = transform
  }

  /** Set a style property only when it changed (cheap repeated paints). */
  private st(el: HTMLElement | SVGElement, prop: string, v: string): void {
    const m = (el as unknown as { __c4?: Record<string, string> }).__c4 ?? ((el as unknown as { __c4: Record<string, string> }).__c4 = {})
    if (m[prop] === v) return
    m[prop] = v
    el.style.setProperty(prop, v)
  }
  private at(el: Element, name: string, v: string): void {
    if (el.getAttribute(name) !== v) el.setAttribute(name, v)
  }
  private show(el: HTMLElement | SVGElement, on: boolean, disp = ''): void {
    this.st(el, 'display', on ? disp : 'none')
  }
  private txt(el: HTMLElement, s: string): void {
    if (el.textContent !== s) el.textContent = s
  }

  /** Open/close a window over [a, b]. Returns false (and hides it) outside. */
  private win(el: HTMLElement, t: number, a: number, b: number, pop = 0.4, out = 0.3): boolean {
    const on = t >= a && t <= b
    this.show(el, on, 'flex')
    if (!on) return false
    const i = eo(seg(t, a, a + pop))
    const x = seg(t, b - out, b)
    this.st(el, 'opacity', f3(i * (1 - x)))
    this.st(el, 'transform', this.reduced ? 'none' : `scale(${f3(lerp(0.86, 1, i) * lerp(1, 0.92, x))})`)
    return true
  }

  paint(t: number): void {
    this.lastT = t
    const L = this.layout
    const C = this.cams
    if (!L || !C) return
    const E = this.e
    const R = this.reduced

    // ── camera ──
    let cam: Cam
    let dip = 0
    if (R) {
      const zm = (T.zoom[0] + T.zoom[1]) / 2
      const pm = (T.pull[0] + T.pull[1]) / 2
      cam = t < zm ? C.open : t < pm ? C.screen : C.wide
      dip = Math.max(1 - Math.abs(t - zm) / 0.45, 1 - Math.abs(t - pm) / 0.6, 0)
    } else if (t < T.zoom[0]) cam = C.open
    else if (t < T.zoom[1]) cam = mixCam(C.open, C.screen, io(seg(t, T.zoom[0], T.zoom[1])))
    else if (t < T.pull[0]) cam = C.screen
    else if (t < T.pull[1]) cam = mixCam(C.screen, C.wide, io(seg(t, T.pull[0], T.pull[1])))
    else if (t < T.push[0]) cam = C.wide
    else cam = mixCam(C.wide, C.window, ei(seg(t, T.push[0], T.push[1])) * 0.35 + io(seg(t, T.push[0], T.push[1])) * 0.65)
    const X = xform(cam, L.w, L.h)
    this.st(E.room, 'transform', `translate(${f2(X.ox)}px, ${f2(X.oy)}px) scale(${X.s.toFixed(5)})`)
    this.st(E.dip, 'opacity', f3(clamp01(dip)))
    const sx = X.ox + X.s * SCREEN.x
    const sy = X.oy + X.s * SCREEN.y
    this.st(E.screen, 'left', `${f2(sx)}px`)
    this.st(E.screen, 'top', `${f2(sy)}px`)
    this.st(E.screen, 'width', `${f2(X.s * SCREEN.w)}px`)
    this.st(E.screen, 'height', `${f2(X.s * SCREEN.h)}px`)

    // ── room lighting ──
    const g = seg(t, T.gold[0], T.gold[1])
    const on = t >= T.crtOn
    const dead = t > T.off[0] + 0.3 && t < T.cont[1] - 0.3 ? 0.4 : 1
    this.at(E.led, 'fill', on ? '#5bea5b' : '#3a3a2c')
    this.at(E.glow, 'opacity', on ? f3((0.55 + 0.45 * seg(t, T.crtOn, 2)) * dead * (1 - g)) : '0')
    this.at(E.dark, 'opacity', f3(on ? lerp(0.5, 0.16, seg(t, T.crtOn, 2)) * (1 - g) : 0.5))
    this.at(E.gold, 'opacity', f3(g))
    this.at(E.night, 'opacity', f3(1 - g))
    this.at(E.wallGold, 'opacity', f3(0.5 * g))
    this.at(E.sunlight, 'opacity', f3(g))
    const skyK = R ? seg(t, T.push[0] + 0.4, T.push[1]) : seg(t, T.sky[0], T.sky[1])
    this.show(E.sky, skyK > 0, 'block')
    this.st(E.sky, 'opacity', f3(skyK))
    // the screen is not needed once the sky covers everything
    this.show(E.screen, skyK < 1)

    // ── power on / boot ──
    const lineOn = t >= T.powerLine[0] && t < T.powerLine[1]
    const offA = seg(t, T.off[0], T.off[1])
    const offLine = !R && t >= T.off[0] && offA >= 0.4 && t < T.off[1]
    const blackOn = t < T.boot[0] + 0.05 || (t >= T.off[0] && t < T.cont[0] + 0.3 && (R || offA >= 0.4))
    this.show(E.black, blackOn, 'block')
    if (blackOn) {
      this.st(E.black, 'opacity', R && t >= T.off[0] ? f3(offA) : '1')
      this.show(E.line, lineOn || offLine)
      if (lineOn) {
        this.st(E.line, 'height', '100%')
        this.st(E.line, 'opacity', '1')
        this.st(E.line, 'transform', `translateY(-50%) scaleY(${f3(lerp(0.004, 1, eo(seg(t, T.powerLine[0] + 0.05, T.powerLine[1]))))})`)
      } else if (offLine) {
        const k = seg(offA, 0.4, 0.75)
        this.st(E.line, 'height', '0.8cqh')
        this.st(E.line, 'opacity', f3(1 - seg(offA, 0.8, 1)))
        this.st(E.line, 'transform', `translateY(-50%) scaleX(${f3(lerp(1, 0.015, eo(k)))})`)
      }
    }
    const bootOn = t >= T.boot[0] && t < T.boot[1]
    this.show(E.boot, bootOn, 'flex')
    if (bootOn) {
      this.st(E.boot, 'opacity', f3(1 - seg(t, T.boot[1] - 0.4, T.boot[1])))
      E.bootBar.forEach((el, i) => this.st(el, 'left', `${(((t * 1.4 + i * 0.09) % 1.3) * 100 - 15).toFixed(1)}%`))
    }

    // ── the desk (hidden while the screen is dead / the arcade is up) ──
    const deskOn = t >= T.boot[0] && !(t >= T.off[0] + (R ? 0.8 : 0.32) && t < T.cont[1] - 0.45)
    this.show(E.desk, deskOn)
    if (deskOn) {
      if (t >= T.off[0] && t < T.off[1]) {
        if (R) {
          this.st(E.desk, 'transform', 'none')
          this.st(E.desk, 'filter', 'none')
        } else {
          const k = eo(seg(offA, 0, 0.4))
          this.st(E.desk, 'transform', `scale(${f3(lerp(1, 1.02, k))}, ${f3(lerp(1, 0.006, k))})`)
          this.st(E.desk, 'filter', `brightness(${f2(1 + 1.6 * k)})`)
        }
      } else {
        this.st(E.desk, 'transform', 'none')
        this.st(E.desk, 'filter', 'none')
      }
      this.paintDesk(t, L)
    }

    // ── CONTINUE? ──
    const contOn = t >= T.cont[0] && t < T.cont[1]
    this.show(E.cont, contOn, 'flex')
    if (contOn) {
      this.st(E.cont, 'opacity', f3(seg(t, T.cont[0], T.cont[0] + 0.3) * (1 - seg(t, T.cont[1] - 0.4, T.cont[1]))))
      const pressed = t >= T.yes
      const k = Math.max(0, Math.min(COUNT_NUMBERS.length - 1, Math.floor((t - T.count0) / COUNT_STEP)))
      this.txt(E.contN, pressed ? '' : String(COUNT_NUMBERS[k]))
      this.show(E.contN, !pressed)
      this.show(E.contS, !pressed)
      this.st(E.contS, 'visibility', (t * 2.5) % 1 < 0.6 ? 'visible' : 'hidden')
      const build = t >= T.build
      this.txt(E.contQ, pressed ? (build ? 'So I started building.' : 'YES') : 'CONTINUE?')
      E.contQ.classList.toggle('yes', pressed && !build)
      E.contQ.classList.toggle('small', build)
      this.st(E.cont, 'background', pressed && t < T.yes + 0.16 && !R ? '#fff' : '#000')
    }

    // ── pitch slideshow ──
    const pitchOn = t >= T.pitch[0] && t < T.pitch[1]
    this.show(E.pitch, pitchOn, 'block')
    if (pitchOn) {
      this.st(E.pitch, 'opacity', f3(seg(t, T.pitch[0], T.pitch[0] + 0.5) * (1 - seg(t, T.pitch[1] - 0.4, T.pitch[1]))))
      this.at(E.spot, 'opacity', f3(seg(t, T.pitch[0] + 0.4, T.pitch[0] + 1)))
      this.at(E.presenter, 'transform', `translate(${(R ? 0 : lerp(-40, 0, eo(seg(t, T.pitch[0] + 0.6, T.pitch[0] + 1.6)))).toFixed(1)} 0)`)
      this.st(E.pitchCap, 'opacity', f3(seg(t, T.pitch[0] + 1.1, T.pitch[0] + 1.6)))
    }
  }

  private paintDesk(t: number, L: StageLayout): void {
    const E = this.e
    const R = this.reduced
    const W = E.wins

    // desktop icon mail badge
    this.st(E.mailBadge, 'opacity', t >= T.mailPing && t < T.mail[0] + 0.2 ? '1' : '0')

    // mail + error
    if (this.win(W['w-mail'], t, ...WIN_SPANS['w-mail'], 0.4, 0.01)) {
      this.st(W['w-mail'], 'filter', t > T.err ? 'grayscale(.6) brightness(.85)' : 'none')
    }
    if (this.win(W['w-err'], t, ...WIN_SPANS['w-err'], 0.18, 0.01)) {
      const shake = !R && t < T.err + 0.4 ? Math.sin(t * 90) * (1 - seg(t, T.err, T.err + 0.4)) * 1.3 : 0
      this.st(W['w-err'], 'translate', `${f2(shake)}cqw 0`)
    }

    // setup wizard
    if (this.win(W['w-setup'], t, ...WIN_SPANS['w-setup'])) {
      this.st(E.setupBar, 'width', `${(eo(seg(t, T.setupBar[0], T.setupBar[1])) * 100).toFixed(1)}%`)
      let line = SETUP_LINES[0][1]
      for (const [a, s] of SETUP_LINES) if (t >= a) line = s
      this.txt(E.setupLine, line)
      this.txt(E.setupNext, t >= T.setupDone - 0.3 ? 'Finish' : 'Next >')
    }

    // pet brand
    if (this.win(W['w-pet'], t, ...WIN_SPANS['w-pet'])) {
      for (const el of E.petSteps) {
        const a = T.petSteps[Number(el.dataset.step)] ?? T.pet[0]
        const k = eo(seg(t, a, a + 0.5))
        this.st(el, 'opacity', f3(k))
        this.st(el, 'transform', R ? 'none' : `translateY(${f2((1 - k) * 0.6)}em)`)
      }
    }

    // décor tycoon
    if (this.win(W['w-tyc'], t, ...WIN_SPANS['w-tyc'], 0.5)) this.paintTycoon(t, L)

    // feed + chat
    if (this.win(W['w-feed'], t, ...WIN_SPANS['w-feed'])) {
      const k = io(seg(t, T.posts[0], T.posts[1]))
      this.st(E.posts, 'transform', `translateY(calc((-100% + var(--fv)) * ${f3(k)}))`)
      E.folBars.forEach((b, i) => {
        const h = 3 + 17 * (0.2 + 0.2 * i) * (0.3 + 0.7 * seg(k, i * 0.12, i * 0.12 + 0.45))
        this.at(b, 'y', f2(20 - h))
        this.at(b, 'height', f2(h))
      })
    }
    if (this.win(W['w-chat'], t, ...WIN_SPANS['w-chat'], 0.25)) {
      const nudge = !R && t < T.chat[0] + 0.5 ? Math.sin(t * 80) * 1.4 * (1 - seg(t, T.chat[0], T.chat[0] + 0.5)) : 0
      this.st(W['w-chat'], 'translate', `${f2(nudge)}cqw 0`)
      this.st(E.chat2, 'opacity', f3(seg(t, T.chat[0] + 0.5, T.chat[0] + 0.7)))
      this.show(E.chatTyping, t >= T.typing && t < T.chatYes)
      this.st(E.chatYes, 'opacity', f3(seg(t, T.chatYes, T.chatYes + 0.2)))
    }

    // 21 in 21
    if (this.win(W['w-fold'], t, ...WIN_SPANS['w-fold'])) {
      let shown = 0
      TILE_ORDER.forEach((idx, k) => {
        const el = E.tiles[idx]
        if (!el) return
        const a = k < SHIPPED_COUNT ? T.icon0 + k * ICON_STEP : T.locked0 + (k - SHIPPED_COUNT) * 0.06
        const v = eo(seg(t, a, a + 0.35))
        if (k < SHIPPED_COUNT && t >= a) shown++
        this.st(el, 'opacity', f3(v))
        this.st(el, 'transform', R ? 'none' : `scale(${f3(lerp(0.4, 1, v))})`)
      })
      const hot = TILE_ORDER[HOT_TILE.idx]
      E.tiles[hot]?.classList.toggle('hot', !L.phone && t >= HOT_TILE.t[0] && t < HOT_TILE.t[1])
      this.paintDetail(t)
      this.txt(E.foldStatus, t < T.locked0 ? `${shown} of ${TOTAL_PROJECTS} shipped` : `${projectsLive} of ${TOTAL_PROJECTS} shipped · click one to open it`)
    }

    // idea tester + ad maker
    if (this.win(W['w-test'], t, ...WIN_SPANS['w-test'])) {
      this.txt(E.typed, TYPED.slice(0, Math.round(seg(t, T.typed[0], T.typed[1]) * TYPED.length)))
      this.st(E.caret, 'opacity', (t * 2.5) % 1 < 0.5 ? '1' : '0')
      const k = io(seg(t, T.votes[0], T.votes[1]))
      E.vars.forEach((d, i) => {
        this.st(d, 'opacity', f3(eo(seg(t, T.variants + i * 0.2, T.variants + 0.4 + i * 0.2))))
        this.st(E.voteBars[i], 'width', `${(VOTES[i] * k).toFixed(1)}%`)
        this.txt(E.votePct[i], `${Math.round(VOTES[i] * k)}% would buy`)
      })
      this.st(E.winner, 'opacity', f3(seg(t, T.winner, T.winner + 0.2)))
      this.txt(E.voteLbl, t < T.winner ? 'AI customers voting…' : 'Variant B wins. Make it.')
    }
    if (this.win(W['w-ad'], t, ...WIN_SPANS['w-ad'], 0.3)) {
      this.st(E.adBar, 'width', `${(seg(t, T.adBar[0], T.adBar[1]) * 100).toFixed(1)}%`)
      this.st(E.adOut, 'opacity', f3(seg(t, T.adDone - 0.3, T.adDone + 0.1)))
      this.txt(E.adLbl, t < T.adDone ? 'Rendering…' : 'Ad ready ✓')
    }

    // badge + class, then minimise
    const mk = seg(t, T.min[0], T.min[1])
    const minimise = (el: HTMLElement): void => {
      if (mk <= 0) return
      this.st(el, 'opacity', f3(1 - mk * mk))
      this.st(el, 'transform', R ? 'none' : `translate(${f2(-mk * 30)}cqw, ${f2(mk * 50)}cqh) scale(${f3(lerp(1, 0.06, eo(mk)))})`)
    }
    const badgeOn = t >= T.badge[0] && t < T.min[1]
    this.show(E.badge, badgeOn, 'block')
    if (badgeOn) {
      const drop = eo(seg(t, T.badgeDrop[0], T.badgeDrop[1]))
      const t1 = T.badgeDrop[1]
      const sw = !R && t > t1 ? 9 * Math.exp(-(t - t1) * 1.2) * Math.sin((t - t1) * 6) : 0
      this.st(E.badge, 'opacity', R ? f3(seg(t, T.badge[0], T.badge[0] + 0.4)) : '1')
      this.st(E.badge, 'transform', R ? 'none' : `translateY(${f2(lerp(-90, 0, drop))}cqh) rotate(${f2(sw)}deg)`)
      // on phone the badge has the screen to itself, then the class window covers it
      minimise(E.badge)
    }
    if (this.win(W['w-class'], t, ...WIN_SPANS['w-class'], 0.4, 0.01)) {
      E.flow.forEach((el) => this.st(el, 'opacity', f3(eo(seg(t, T.cls[0] + 0.4 + Number(el.dataset.fw) * 0.35, T.cls[0] + 0.7 + Number(el.dataset.fw) * 0.35)))))
      E.seats.forEach((s, i) => {
        const k = seg(t, T.seats[0] + i * 0.07, T.seats[0] + i * 0.07 + 0.25)
        this.st(s, 'fill', k > 0.5 ? '#c4501b' : '#bdbdbd')
        this.st(s, 'opacity', f3(0.45 + 0.55 * k))
      })
      minimise(W['w-class'])
    }

    // taskbar
    const tasks = TASKS.filter(([, a, b]) => t >= a && (t < b || (b === 999 && t >= a)))
      .slice(L.phone ? -1 : -3)
      .map(([n]) => `<div class="c4-task${t < T.min[0] ? ' on' : ''}">${n}</div>`)
      .join('')
    if (tasks !== this.tasksKey) {
      this.tasksKey = tasks
      E.tasks.innerHTML = tasks
    }

    // cursor
    const cOn = !L.phone && CURSOR_ON.some(([a, b]) => t >= a && t < b)
    this.show(E.cursor, cOn, 'block')
    if (cOn) {
      let x = CURSOR_PATH[0][1]
      let y = CURSOR_PATH[0][2]
      for (let i = 0; i < CURSOR_PATH.length - 1; i++) {
        const [ta, xa, ya] = CURSOR_PATH[i]
        const [tb, xb, yb] = CURSOR_PATH[i + 1]
        if (t >= ta && t <= tb) {
          const u = io(seg(t, Math.max(ta, tb - 1.1), tb))
          x = lerp(xa, xb, u)
          y = lerp(ya, yb, u)
          break
        }
        if (t > tb) {
          x = xb
          y = yb
        }
      }
      this.st(E.cursor, 'transform', `translate(${f2(x)}cqw, ${f2(y)}cqh)`)
    }
  }

  private paintTycoon(t: number, L: StageLayout): void {
    const E = this.e
    const R = this.reduced
    const u = seg(t, T.counter[0], T.counter[1])
    const v = u <= 0 ? 0 : DECOR.start * Math.exp(Math.log(DECOR.revenue / DECOR.start) * Math.pow(u, 1.15))
    this.txt(E.cash, u >= 1 ? `~$${DECOR.revenue.toLocaleString('en-US')}` : `$${Math.round(Math.min(v, DECOR.revenue - 10)).toLocaleString('en-US')}`)
    this.st(E.timebar, 'width', `${(u * 88).toFixed(1)}%`)
    this.st(E.interest, 'width', `${(eo(seg(t, T.interest[0], T.interest[1])) * 100).toFixed(1)}%`)
    const pts: string[] = []
    for (let i = 0; i < 32; i++) {
      const k = (i / 31) * u
      pts.push(`${(k * 100).toFixed(1)} ${(60 - 56 * Math.pow(k, 2.4)).toFixed(1)}`)
    }
    this.at(E.gline, 'd', `M${pts.join(' L')}`)
    this.st(E.tycDone, 'opacity', f3(seg(t, T.tycDone, T.tycDone + 0.5)))
    const m = seg(t, T.tycMsg, T.tycMsg + 0.4)
    this.st(E.tycMsg, 'opacity', f3(m))
    this.st(E.tycMsg, 'transform', R ? 'none' : `translateY(${f2((1 - eo(m)) * 0.8)}em)`)
    this.st(E.tycSide, 'opacity', L.phone ? f3(seg(t, T.tycDone - 0.1, T.tycDone + 0.4)) : '1')

    E.items.forEach((g, i) => {
      const k = eo(seg(t, T.tyc[0] + 0.5 + i * 0.12, T.tyc[0] + 0.8 + i * 0.12))
      const [x, y] = SHOP_ITEMS[i]
      this.at(g, 'transform', `translate(${x} ${y}) scale(${f3(Math.max(0.001, k))})`)
    })
    const plus: number[] = [-1, -1, -1]
    for (let i = 0; i < CUSTOMERS; i++) {
      const g = E.custs[i]
      const d = (t - (CUSTOMER_0 + i * CUSTOMER_STEP)) / CUSTOMER_WALK
      if (d < 0 || d > 1) {
        this.show(g, false)
        if (d > 1 && d < 1.3) plus[i % 3] = d
        continue
      }
      const [ix, iy] = SHOP_ITEMS[i % SHOP_ITEMS.length]
      const sy = iy + 40
      let x: number
      let y: number
      if (d < 0.45) {
        const k = d / 0.45
        x = lerp(12, ix, k)
        y = lerp(194, sy, k)
      } else if (d < 0.55) {
        x = ix
        y = sy
      } else {
        const k = (d - 0.55) / 0.45
        x = lerp(ix, 194, k)
        y = lerp(sy, 194, k)
      }
      const bob = R ? 0 : Math.abs(Math.sin(d * 28)) * 2.4
      this.show(g, true)
      this.at(g, 'transform', `translate(${x.toFixed(1)} ${(y - bob).toFixed(1)})`)
    }
    E.plus.forEach((el, j) => {
      const d = plus[j]
      this.show(el, d > 0)
      if (d > 0) {
        const k = (d - 1) / 0.3
        this.at(el, 'y', (140 - k * 26).toFixed(1))
        this.at(el, 'opacity', f3(1 - k))
      }
    })
  }

  destroy(): void {
    this.root.remove()
  }
}

function build(root: HTMLElement) {
  root.innerHTML = `<div class="c4-dodge"><div class="c4-room">${ROOM_SVG}</div><div class="c4-screen">${SCREEN_HTML}</div></div><div class="c4-sky">${SKY_HTML}</div><div class="c4-dip"></div>`
  const k = <E extends Element = HTMLElement>(name: string): E => q<E>(root, `[data-k="${name}"]`)
  const wins: Record<string, HTMLElement> = {}
  for (const el of qa(root, '.c4-win')) wins[el.dataset.w ?? ''] = el
  const tiles: Record<number, HTMLElement> = {}
  for (const el of qa(root, '[data-tile]')) tiles[Number(el.dataset.tile)] = el
  const vars = qa(root, '.test-var')
  return {
    dodge: q(root, '.c4-dodge'),
    room: q(root, '.c4-room'),
    screen: q(root, '.c4-screen'),
    sky: q(root, '.c4-sky'),
    dip: q(root, '.c4-dip'),
    led: k<SVGElement>('led'),
    glow: k<SVGElement>('glow'),
    dark: k<SVGElement>('dark'),
    gold: k<SVGElement>('gold'),
    night: k<SVGElement>('night'),
    wallGold: k<SVGElement>('wallGold'),
    sunlight: k<SVGElement>('sunlight'),
    desk: k('desk'),
    black: k('black'),
    line: k('line'),
    boot: k('boot'),
    bootBar: qa(root, '.boot-bar i'),
    cont: k('cont'),
    contQ: k('contQ'),
    contN: k('contN'),
    contS: k('contS'),
    pitch: k('pitch'),
    spot: k<SVGElement>('spot'),
    presenter: k<SVGElement>('presenter'),
    pitchCap: k('pitchCap'),
    mailBadge: k('mailBadge'),
    wins,
    setupBar: k('setupBar'),
    setupLine: k('setupLine'),
    setupNext: k('setupNext'),
    petSteps: qa(root, '.w-pet [data-step]'),
    cash: k('cash'),
    timebar: k('timebar'),
    interest: k('interest'),
    gline: k<SVGElement>('gline'),
    tycDone: k('tycDone'),
    tycMsg: k('tycMsg'),
    tycSide: k('tycSide'),
    items: qa<SVGElement>(root, '[data-item]'),
    custs: qa<SVGElement>(root, '[data-cust]'),
    plus: qa<SVGElement>(root, '[data-plus]'),
    posts: k('posts'),
    folBars: qa<SVGElement>(root, '[data-fb]'),
    chat2: k('chat2'),
    chatTyping: k('chatTyping'),
    chatYes: k('chatYes'),
    tiles,
    foldStatus: k('foldStatus'),
    foldDetail: k('foldDetail'),
    typed: k('typed'),
    caret: k('caret'),
    vars,
    voteBars: vars.map((d) => q(d, '.test-bar i')),
    votePct: vars.map((d) => q(d, '.test-pct')),
    winner: q(root, '.test-winner'),
    voteLbl: k('voteLbl'),
    adBar: k('adBar'),
    adOut: k('adOut'),
    adLbl: k('adLbl'),
    badge: k('badge'),
    flow: qa(root, '.cls-flow [data-fw]'),
    seats: qa<SVGElement>(root, '.cls-seats svg'),
    tasks: k('tasks'),
    cursor: k<SVGElement>('cursor'),
  }
}
