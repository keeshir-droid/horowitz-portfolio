import { createHash, randomBytes } from 'node:crypto'

/** Random per-process salt: hashed keys are never persisted and not reversible across restarts. */
const SALT = randomBytes(16)

export function hashKey(value: string, scope = ''): string {
  return createHash('sha256').update(SALT).update(scope).update(value).digest('hex').slice(0, 32)
}

const MAX_KEYS = 5000

/** Fixed-window in-memory limiter. Best-effort only: each serverless instance has its own memory. */
export class WindowLimiter {
  private readonly map = new Map<string, { count: number; reset: number }>()
  private readonly max: number
  private readonly windowMs: number

  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }

  private prune(now: number): void {
    if (this.map.size < MAX_KEYS) return
    for (const [k, v] of this.map) if (v.reset <= now) this.map.delete(k)
    if (this.map.size >= MAX_KEYS) this.map.clear()
  }

  /** True if key is already over the limit (does not count). */
  blocked(key: string): { blocked: boolean; retryAfterSec: number } {
    const cur = this.map.get(key)
    const now = Date.now()
    if (!cur || cur.reset <= now || cur.count <= this.max) return { blocked: false, retryAfterSec: 0 }
    return { blocked: true, retryAfterSec: Math.ceil((cur.reset - now) / 1000) }
  }

  /** Counts this hit. */
  hit(key: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now()
    this.prune(now)
    const cur = this.map.get(key)
    if (!cur || cur.reset <= now) {
      this.map.set(key, { count: 1, reset: now + this.windowMs })
      return { allowed: true, retryAfterSec: 0 }
    }
    cur.count += 1
    return { allowed: cur.count <= this.max, retryAfterSec: Math.ceil((cur.reset - now) / 1000) }
  }
}

/** Short-lived "seen recently" set (for de-duplicating rapid repeat visits). */
export class RecentSet {
  private readonly map = new Map<string, number>()
  private readonly ttlMs: number

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  /** Returns true if key was already present (and still fresh); records it either way. */
  seen(key: string): boolean {
    const now = Date.now()
    if (this.map.size >= MAX_KEYS) {
      for (const [k, exp] of this.map) if (exp <= now) this.map.delete(k)
      if (this.map.size >= MAX_KEYS) this.map.clear()
    }
    const exp = this.map.get(key)
    if (exp !== undefined && exp > now) return true
    this.map.set(key, now + this.ttlMs)
    return false
  }
}
