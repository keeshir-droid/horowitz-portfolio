import { createHash, timingSafeEqual } from 'node:crypto'
import { clientIp, gate, header, safely, sendError, sendJson } from './_lib/http.js'
import type { Req, Res } from './_lib/http.js'
import { WindowLimiter, hashKey } from './_lib/limiter.js'
import { pipeline, upstashConfigured } from './_lib/upstash.js'

const MIN_TOKEN_LENGTH = 32
// Failed-auth throttle: 10 wrong attempts per IP per 10 minutes, then 429 (even for the right token).
const failLimiter = new WindowLimiter(10, 10 * 60 * 1000)

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  return Number.isFinite(n) ? n : 0
}

/** GET /api/stats with Authorization: Bearer <STATS_TOKEN>. For Risheek only; never called by the site. */
export default async function handler(req: Req, res: Res): Promise<void> {
  if (!gate(req, res, ['GET'])) return
  await safely(res, 'stats', async () => {
    const secret = process.env['STATS_TOKEN']
    if (!secret || secret.length < MIN_TOKEN_LENGTH) {
      // Unset or too short to be safe: behave as if the endpoint does not exist.
      sendError(res, 404, 'not_found', 'Not found.')
      return
    }
    const key = hashKey(clientIp(req), 'stats')
    const blk = failLimiter.blocked(key)
    if (blk.blocked) {
      sendError(res, 429, 'rate_limited', 'Too many attempts.', { retryAfterSec: blk.retryAfterSec }, { 'Retry-After': String(blk.retryAfterSec) })
      return
    }
    const auth = header(req, 'authorization') ?? ''
    const given = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!safeEqual(given, secret)) {
      failLimiter.hit(key)
      sendError(res, 401, 'unauthorized', 'Unauthorized.', {}, { 'WWW-Authenticate': 'Bearer' })
      return
    }
    if (!upstashConfigured()) {
      sendError(res, 503, 'storage_unavailable', 'Counter storage is not configured.')
      return
    }
    const days: string[] = []
    const now = Date.now()
    for (let i = 0; i < 30; i++) days.push(new Date(now - i * 86400_000).toISOString().slice(0, 10))
    const modes = ['gate', 'story', 'index']
    const cmds: string[][] = [
      ['GET', 'hits:total'],
      ...days.map((d) => ['GET', `hits:day:${d}`]),
      ...modes.map((m) => ['GET', `hits:mode:${m}`]),
    ]
    const out = await pipeline(cmds)
    if (!out || out.length !== cmds.length) {
      sendError(res, 503, 'storage_unavailable', 'Counter storage did not respond.')
      return
    }
    const last30Days = days.map((date, i) => ({ date, count: num(out[i + 1]?.result) })).reverse()
    const byMode: Record<string, number> = {}
    modes.forEach((m, i) => {
      byMode[m] = num(out[1 + days.length + i]?.result)
    })
    sendJson(res, 200, {
      ok: true,
      total: num(out[0]?.result),
      last30DaysTotal: last30Days.reduce((s, d) => s + d.count, 0),
      last30Days,
      byMode,
      note: 'UTC days. Bots and rapid repeats (30s per visitor) are excluded.',
    })
  })
}
