import { gate, readBody, safely, sendEmpty, clientIp, header } from './_lib/http.js'
import type { Req, Res } from './_lib/http.js'
import { RecentSet, hashKey } from './_lib/limiter.js'
import { pipeline, upstashConfigured } from './_lib/upstash.js'

const MODES = ['gate', 'story', 'index'] as const
const DEDUPE_MS = 30_000
const recent = new RecentSet(DEDUPE_MS)

const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|preview|curl\/|wget|python|httpclient|http-client|axios|node-fetch|undici|go-http|java\/|okhttp|monitor|uptime|pingdom|phantom|puppeteer|playwright|selenium|gptbot|chatgpt|claude|perplexity|bytespider|whatsapp|telegram|discord|slack|embedly|validator/i

function isBot(ua: string | undefined): boolean {
  return !ua || ua.length < 8 || BOT_RE.test(ua)
}

/**
 * POST /api/hit  (optional body: {"mode":"gate"|"story"|"index"}, JSON or text/plain)
 * Always answers 204. Stores only counters: no cookie, no IP, no user-agent.
 */
export default async function handler(req: Req, res: Res): Promise<void> {
  if (!gate(req, res, ['POST'])) return
  await safely(res, 'hit', async () => {
    const ua = header(req, 'user-agent')
    if (isBot(ua) || !upstashConfigured()) {
      req.resume()
      sendEmpty(res, 204)
      return
    }
    const body = await readBody(req, 1024)
    let mode: string | null = null
    if (body.ok) {
      try {
        const parsed: unknown = JSON.parse(body.text)
        const m = (parsed as { mode?: unknown } | null)?.mode
        if (typeof m === 'string' && (MODES as readonly string[]).includes(m)) mode = m
      } catch {
        // body is optional; ignore
      }
    }
    // Key is salted with a random per-process secret, lives in memory ~30s, never persisted.
    if (recent.seen(hashKey(clientIp(req), 'hit'))) {
      sendEmpty(res, 204)
      return
    }
    const day = new Date().toISOString().slice(0, 10)
    const cmds: (string | number)[][] = [
      ['INCR', 'hits:total'],
      ['INCR', `hits:day:${day}`],
      ['EXPIRE', `hits:day:${day}`, 400 * 86400],
    ]
    if (mode) cmds.push(['INCR', `hits:mode:${mode}`])
    await pipeline(cmds)
    sendEmpty(res, 204)
  })
}
