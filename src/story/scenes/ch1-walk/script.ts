import { BOXES, TYPE_FRAC } from './config.ts'

/** Pure text-box logic: one page per box; what is typed is a function of progress only. */
export interface BoxPlan {
  id: string
  entries: readonly string[]
  at: readonly [number, number]
  text: string
  /** Progress at which the text has finished typing (unlocks fire here). */
  completeAt: number
}

export const PLANS: BoxPlan[] = BOXES.map((b) => ({
  id: b.id,
  entries: b.entries ?? [],
  at: b.at,
  text: b.text,
  completeAt: b.at[0] + TYPE_FRAC * (b.at[1] - b.at[0]),
}))

export function wrap(text: string, cols: number): string[] {
  const out: string[] = []
  for (const seg of text.split('\n')) out.push(...wrapSeg(seg, cols))
  return out
}
function wrapSeg(text: string, cols: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= cols) cur += ' ' + w
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

const wrapped = new Map<string, [string, string]>()
function linesFor(i: number, cols: number): [string, string] {
  const key = `${i}:${cols}`
  let v = wrapped.get(key)
  if (!v) {
    const l = wrap(PLANS[i].text, cols)
    v = [l[0] ?? '', l[1] ?? '']
    wrapped.set(key, v)
  }
  return v
}

export interface BoxState {
  box: number
  typed: number
  complete: boolean
  l1: string
  l2: string
}
export const boxState: BoxState = { box: -1, typed: 0, complete: false, l1: '', l2: '' }

/** Fills and returns the shared `boxState` (no allocation after warm-up). `still` = reduced motion: fully typed. */
export function boxAt(p: number, still: boolean, cols: number): BoxState {
  const o = boxState
  o.box = -1
  o.l1 = ''
  o.l2 = ''
  o.typed = 0
  o.complete = false
  for (let i = 0; i < PLANS.length; i++) {
    const b = PLANS[i]
    if (p < b.at[0] || p > b.at[1]) continue
    const [l1, l2] = linesFor(i, cols)
    const n = l1.length + l2.length
    const u = (p - b.at[0]) / (b.at[1] - b.at[0])
    const typed = still ? n : Math.min(n, Math.floor((u / TYPE_FRAC) * n))
    o.box = i
    o.typed = typed
    o.complete = typed >= n
    o.l1 = l1.slice(0, typed)
    o.l2 = typed > l1.length ? l2.slice(0, typed - l1.length) : ''
    return o
  }
  return o
}
