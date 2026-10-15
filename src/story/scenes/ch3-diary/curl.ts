/**
 * Corner page-curl geometry (ported from docs/CHAPTER3-DIARY-PROTOTYPE.html). Pure: returns CSS strings.
 * Coordinates are the turning page's own box (W x H px, origin top-left). The bottom-right corner C0 = (W, H)
 * travels to C = (W - 2Wf, H - lift * H * sin(pi f)); the fold line is the perpendicular bisector of C0-C.
 *  - front: the page clipped to the part that has not lifted yet
 *  - flap: the back of the page, mirrored into paper coordinates then reflected across the fold (matrix)
 *  - shades: a soft shadow on the page underneath, a crease on the front, and a gradient across the flap
 */
type P2 = [number, number]
interface Pt {
  x: number
  y: number
}

function clipPoly(poly: readonly P2[], M: Pt, n: Pt, keepPos: boolean): P2[] {
  const s = (p: P2): number => (p[0] - M.x) * n.x + (p[1] - M.y) * n.y
  const inside = (v: number): boolean => (keepPos ? v >= 0 : v < 0)
  const out: P2[] = []
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i]
    const B = poly[(i + 1) % poly.length]
    const sa = s(A)
    const sb = s(B)
    if (inside(sa)) out.push(A)
    if (inside(sa) !== inside(sb)) {
      const k = sa / (sa - sb)
      out.push([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k])
    }
  }
  return out
}

const polygon = (pts: readonly P2[]): string =>
  pts.length < 3 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`

/** A linear gradient perpendicular to the fold, starting at P0 (dark) and fading over `len` of the box. */
function grad(W: number, H: number, g: Pt, P0: Pt, color: string, len: number): string {
  const ang = (Math.atan2(g.x, -g.y) * 180) / Math.PI
  const L = Math.abs(W * g.x) + Math.abs(H * g.y) || 1
  const p = ((P0.x - W / 2) * g.x + (P0.y - H / 2) * g.y) / L + 0.5
  return `linear-gradient(${ang.toFixed(2)}deg, ${color} ${(p * 100).toFixed(2)}%, transparent ${((p + len) * 100).toFixed(2)}%)`
}

export interface CurlStyles {
  frontClip: string
  frontShade: string
  underShadeClip: string
  underShade: string
  flapTransform: string
  flapClip: string
  flapShade: string
}

/** f = 0..1 through the turn, lift = how high the corner rises (fraction of H). null when nothing has lifted yet. */
export function curlStyles(f: number, lift: number, W: number, H: number): CurlStyles | null {
  const C = { x: W - 2 * W * f, y: H - lift * H * Math.sin(Math.PI * f) }
  const dx = C.x - W
  const dy = C.y - H
  const d = Math.hypot(dx, dy)
  if (d < 0.5) return null
  const n = { x: dx / d, y: dy / d }
  const M = { x: (W + C.x) / 2, y: (H + C.y) / 2 }
  const rect: P2[] = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ]
  const keep = clipPoly(rect, M, n, true)
  const cut = clipPoly(rect, M, n, false)
  const Mn = M.x * n.x + M.y * n.y
  const a = -(1 - 2 * n.x * n.x)
  const b = 2 * n.x * n.y
  const c = -2 * n.x * n.y
  const dd = 1 - 2 * n.y * n.y
  const e = W * (1 - 2 * n.x * n.x) + 2 * Mn * n.x
  const f2 = -2 * n.x * n.y * W + 2 * Mn * n.y
  return {
    frontClip: polygon(keep),
    frontShade: grad(W, H, n, M, 'rgba(0,0,0,.12)', 0.05),
    underShadeClip: polygon(cut),
    underShade: grad(W, H, { x: -n.x, y: -n.y }, M, 'rgba(0,0,0,.38)', 0.16),
    flapTransform: `matrix(${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${dd.toFixed(5)},${e.toFixed(2)},${f2.toFixed(2)})`,
    flapClip: polygon(cut.map(([x, y]): P2 => [W - x, y])),
    flapShade: grad(W, H, { x: n.x, y: -n.y }, { x: W - M.x, y: M.y }, 'rgba(0,0,0,.22)', 0.22),
  }
}
