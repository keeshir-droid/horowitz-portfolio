export const HOLD_A = 0.42
export const HOLD_B = 0.58

/** CPU twin of the shader envelope (also used by the fallback). 0 at the ends, 1 across the hold. */
export function pixelateEnvelope(p: number): number {
  const c = p < 0 ? 0 : p > 1 ? 1 : p
  const up = Math.min(1, c / HOLD_A)
  const down = Math.min(1, (1 - c) / (1 - HOLD_B))
  const e = Math.min(up, down)
  return e * e * (3 - 2 * e)
}

