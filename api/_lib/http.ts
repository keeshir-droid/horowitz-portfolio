import type { IncomingMessage, ServerResponse } from 'node:http'

export type Req = IncomingMessage
export type Res = ServerResponse

export function header(req: Req, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()]
  return Array.isArray(v) ? v[0] : v
}

export function sendJson(res: Res, status: number, body: unknown, extra: Record<string, string> = {}): void {
  if (res.headersSent) return
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v)
  res.end(payload)
}

export function sendEmpty(res: Res, status: number): void {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.end()
}

export function sendError(
  res: Res,
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): void {
  sendJson(res, status, { ok: false, code, message, ...extra }, headers)
}

/** Best-effort client IP. On Vercel the platform sets/overwrites these headers. */
export function clientIp(req: Req): string {
  const xff = header(req, 'x-forwarded-for')
  const first = xff?.split(',')[0]?.trim()
  return first || header(req, 'x-real-ip') || req.socket.remoteAddress || 'unknown'
}

function isLocalDev(): boolean {
  return !process.env['VERCEL'] && process.env['NODE_ENV'] !== 'production'
}

function allowedOrigins(): string[] {
  return (process.env['ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

/**
 * Strict CORS. Same-origin (Origin host == Host) needs no headers.
 * Cross-origin only if listed in ALLOWED_ORIGINS (or localhost when not on Vercel).
 * Returns false if the origin is denied (caller must stop).
 */
export function applyCors(req: Req, res: Res): boolean {
  const origin = header(req, 'origin')
  if (!origin) return true
  let host = ''
  let hostname = ''
  try {
    const u = new URL(origin)
    host = u.host
    hostname = u.hostname
  } catch {
    return false
  }
  if (host === header(req, 'host')) return true
  const ok =
    allowedOrigins().includes(origin) ||
    (isLocalDev() && (hostname === 'localhost' || hostname === '127.0.0.1'))
  if (!ok) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '600')
  return true
}

/**
 * Common front door: CORS, OPTIONS, method check. Returns true if the request
 * may continue; otherwise a response has already been sent.
 */
export function gate(req: Req, res: Res, methods: readonly string[]): boolean {
  if (!applyCors(req, res)) {
    sendError(res, 403, 'forbidden_origin', 'Origin not allowed.')
    return false
  }
  const method = req.method ?? 'GET'
  if (method === 'OPTIONS') {
    sendEmpty(res, 204)
    return false
  }
  if (!methods.includes(method)) {
    sendError(res, 405, 'method_not_allowed', 'Method not allowed.', {}, { Allow: methods.join(', ') + ', OPTIONS' })
    return false
  }
  return true
}

export type BodyResult = { ok: true; text: string } | { ok: false; reason: 'too_large' | 'error' | 'timeout' }

/** If the platform already parsed the body (Vercel helpers), use it instead of waiting on the stream. */
function preParsedBody(req: Req): string | null | undefined {
  let b: unknown
  try {
    b = (req as { body?: unknown }).body
  } catch {
    return null // platform failed to parse; treat as unreadable
  }
  if (b === undefined) return undefined
  if (typeof b === 'string') return b
  if (Buffer.isBuffer(b)) return b.toString('utf8')
  if (typeof b === 'object' && b !== null) {
    try {
      return JSON.stringify(b)
    } catch {
      return null
    }
  }
  return undefined
}

export function readBody(req: Req, maxBytes: number): Promise<BodyResult> {
  const declared = Number(header(req, 'content-length') ?? 0)
  if (Number.isFinite(declared) && declared > maxBytes) {
    req.resume()
    return Promise.resolve({ ok: false, reason: 'too_large' })
  }
  const pre = preParsedBody(req)
  if (pre === null) return Promise.resolve({ ok: false, reason: 'error' })
  if (pre !== undefined) {
    return Promise.resolve(
      Buffer.byteLength(pre) > maxBytes ? { ok: false, reason: 'too_large' } : { ok: true, text: pre },
    )
  }
  const timeoutMs = Number(process.env['BODY_TIMEOUT_MS']) || 5_000
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    let done = false
    const finish = (r: BodyResult) => {
      if (done) return
      done = true
      clearTimeout(timer)
      chunks.length = 0
      resolve(r)
    }
    const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs)
    req.on('data', (c: Buffer) => {
      if (done) return
      size += c.length
      if (size > maxBytes) {
        finish({ ok: false, reason: 'too_large' })
        return
      }
      chunks.push(c)
    })
    req.on('end', () => finish({ ok: true, text: Buffer.concat(chunks).toString('utf8') }))
    req.on('error', () => finish({ ok: false, reason: 'error' }))
  })
}

/** Run a handler body; any thrown error becomes a generic 500 with no details. */
export async function safely(res: Res, label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`[${label}] unhandled`, err instanceof Error ? err.name : 'error')
    sendError(res, 500, 'server', 'Something went wrong. Please try again later.')
  }
}
