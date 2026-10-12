import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { clientIp, gate, header, readBody, safely, sendError, sendJson } from './_lib/http.js'
import type { Req, Res } from './_lib/http.js'
import { WindowLimiter, hashKey } from './_lib/limiter.js'
import { pipeline, upstashConfigured } from './_lib/upstash.js'

const MAX_BODY_BYTES = 8 * 1024
const MIN_FILL_MS = 3000
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000
const SEND_LIMIT = 5 // real sends per IP per hour
const SEND_WINDOW_MS = 60 * 60 * 1000
const ATTEMPT_LIMIT = 30 // any POST per IP per 10 minutes
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
const DEFAULT_TO = 'risheeknawka@gmail.com'
const DEFAULT_FROM = 'Portfolio <onboarding@resend.dev>'

const KNOWN_FIELDS = new Set(['name', 'email', 'message', 'website', 'token'])
const sendLimiter = new WindowLimiter(SEND_LIMIT, SEND_WINDOW_MS)
const attemptLimiter = new WindowLimiter(ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS)
const tokenLimiter = new WindowLimiter(60, ATTEMPT_WINDOW_MS) // GET /api/contact
const usedTokens = new Map<string, number>()
const PROCESS_SECRET = randomBytes(32).toString('hex')

type Field = 'name' | 'email' | 'message'
type FieldErrors = Partial<Record<Field, string>>

// ---------- tokens (stateless HMAC time-trap) ----------

function signingSecret(): string {
  const explicit = process.env['CONTACT_SIGNING_SECRET']
  if (explicit) return explicit
  const key = process.env['RESEND_API_KEY']
  // Stable across serverless instances without extra config; never exposed.
  if (key) return createHash('sha256').update('contact-token:' + key).digest('hex')
  return PROCESS_SECRET
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url')
}

function issueToken(): string {
  const payload = `${Date.now()}.${randomBytes(8).toString('hex')}`
  return `${payload}.${sign(payload)}`
}

type TokenCheck = 'ok' | 'bad' | 'too_fast' | 'expired' | 'used'

function checkToken(token: string): TokenCheck {
  const parts = token.split('.')
  if (parts.length !== 3) return 'bad'
  const [ts, nonce, sig] = parts as [string, string, string]
  const expected = sign(`${ts}.${nonce}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'bad'
  const age = Date.now() - Number(ts)
  if (!Number.isFinite(age) || age < 0) return 'bad'
  if (age < MIN_FILL_MS) return 'too_fast'
  if (age > MAX_TOKEN_AGE_MS) return 'expired'
  const now = Date.now()
  for (const [k, exp] of usedTokens) if (exp <= now) usedTokens.delete(k)
  if (usedTokens.has(token)) return 'used'
  return 'ok'
}

/**
 * Claim a token synchronously (no await before this runs), so parallel requests with the
 * same token cannot both pass. Per-instance memory; made durable by claimDurable() with Upstash.
 */
function claimToken(token: string): boolean {
  if (usedTokens.has(token)) return false
  if (usedTokens.size > 5000) usedTokens.clear()
  usedTokens.set(token, Date.now() + MAX_TOKEN_AGE_MS)
  return true
}

function tokenKey(token: string): string {
  return 'ct:' + createHash('sha256').update(token).digest('hex').slice(0, 32)
}

/** Durable single-use via SET NX EX. Fails open (returns true) if Upstash is absent or down. */
async function claimDurable(token: string): Promise<boolean> {
  if (!upstashConfigured()) return true
  const out = await pipeline([['SET', tokenKey(token), '1', 'NX', 'EX', 2 * 60 * 60]])
  if (!out || !out[0] || out[0].error) return true
  return out[0].result === 'OK'
}

/** Give the token back (send failed or was rate limited) so the visitor can retry with it. */
function releaseToken(token: string): void {
  usedTokens.delete(token)
  if (upstashConfigured()) void pipeline([['DEL', tokenKey(token)]])
}

// ---------- validation ----------

// Control chars, DEL, zero-width and bidi-override characters, line/paragraph separators.
// oxlint-disable-next-line no-control-regex
const STRIP_ALL = new RegExp('[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]', 'g')
// oxlint-disable-next-line no-control-regex
const STRIP_KEEP_NL = new RegExp('[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]', 'g')
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/

function emailOk(email: string): boolean {
  if (email.length > 200 || !EMAIL_RE.test(email)) return false
  const at = email.lastIndexOf('@')
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  const labels = domain.split('.')
  return labels.every((l) => l.length >= 1 && l.length <= 63 && !l.startsWith('-') && !l.endsWith('-'))
}

/** Replace lone surrogates, then drop the replacement characters. */
function wellFormed(s: string): string {
  return s.toWellFormed().replace(/�/g, '')
}

/** Length in characters (code points), not UTF-16 units. */
const cpLength = (s: string): number => Array.from(s).length

function cleanLine(s: string): string {
  return wellFormed(s).replace(STRIP_ALL, ' ').replace(/\s+/g, ' ').trim()
}

function cleanMultiline(s: string): string {
  return wellFormed(s).replace(/\r\n?/g, '\n').replace(STRIP_KEEP_NL, '').replace(/\n{3,}/g, '\n\n').trim()
}

interface Clean {
  name: string
  email: string
  message: string
}

function validate(data: Record<string, unknown>): { ok: true; value: Clean } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const str = (k: Field): string | null => {
    const v = data[k]
    if (typeof v !== 'string') {
      errors[k] = 'This field is required.'
      return null
    }
    return v
  }
  const rawName = str('name')
  const rawEmail = str('email')
  const rawMessage = str('message')
  const name = rawName === null ? '' : cleanLine(rawName)
  const email = rawEmail === null ? '' : cleanLine(rawEmail).replace(/\s/g, '')
  const message = rawMessage === null ? '' : cleanMultiline(rawMessage)
  if (rawName !== null && (cpLength(name) < 1 || cpLength(name) > 80)) errors.name = 'Name must be 1 to 80 characters.'
  if (rawEmail !== null) {
    if (!emailOk(email)) errors.email = 'Please enter a valid email address.'
  }
  if (rawMessage !== null && (cpLength(message) < 10 || cpLength(message) > 2000)) {
    errors.message = 'Message must be 10 to 2000 characters.'
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { name, email, message } }
}

// ---------- delivery ----------

/** Fixed, secret-free explanation for the server log (never the provider body). */
function providerHint(status: number): string {
  if (status === 401) return 'RESEND_API_KEY looks invalid or revoked.'
  if (status === 403 || status === 422)
    return 'Resend refused the send. With the default sender onboarding@resend.dev, CONTACT_TO must equal the email the Resend account was created with; otherwise verify a domain and set CONTACT_FROM. Also check the From/To addresses.'
  if (status === 429) return 'Resend rate limit reached.'
  return 'Resend error.'
}

async function deliver(v: Clean): Promise<boolean> {
  const apiKey = process.env['RESEND_API_KEY'] as string
  const url = process.env['RESEND_API_URL'] || 'https://api.resend.com/emails' // override is for tests only
  const text = [
    `From: ${v.name} <${v.email}>`,
    `Sent: ${new Date().toISOString()}`,
    '',
    v.message,
    '',
    '--',
    'Sent via the portfolio contact form. Reply to this email to answer the visitor.',
  ].join('\n')
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env['CONTACT_FROM'] || DEFAULT_FROM,
        to: [process.env['CONTACT_TO'] || DEFAULT_TO],
        reply_to: v.email,
        subject: `Portfolio message from ${v.name}`.slice(0, 120),
        text,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error(`[contact] provider_error status=${r.status}. ${providerHint(r.status)}`)
    return r.ok
  } catch (err) {
    console.error('[contact] provider_unreachable', err instanceof Error ? err.name : 'error')
    return false
  }
}

/** Optional durable per-IP limit through Upstash (stores only a keyed hash for one hour). */
async function durableLimited(ip: string): Promise<boolean> {
  if (!upstashConfigured()) return false
  const key = 'rl:contact:' + createHmac('sha256', signingSecret()).update(ip).digest('hex').slice(0, 32)
  const out = await pipeline([
    ['INCR', key],
    ['EXPIRE', key, 3600, 'NX'],
  ])
  const n = Number(out?.[0]?.result)
  return Number.isFinite(n) && n > SEND_LIMIT
}

// ---------- handler ----------

/**
 * GET  /api/contact -> { ok, token, minWaitMs }   (issue time-trap token)
 * POST /api/contact -> { ok:true, mock? }         (send message)
 */
export default async function handler(req: Req, res: Res): Promise<void> {
  if (!gate(req, res, ['GET', 'POST'])) return
  await safely(res, 'contact', async () => {
    if (req.method === 'GET') {
      const g = tokenLimiter.hit(hashKey(clientIp(req), 'token'))
      if (!g.allowed) {
        sendError(res, 429, 'rate_limited', 'Too many requests. Please try again later.', { retryAfterSec: g.retryAfterSec }, { 'Retry-After': String(g.retryAfterSec) })
        return
      }
      sendJson(res, 200, { ok: true, token: issueToken(), minWaitMs: MIN_FILL_MS })
      return
    }

    const ip = clientIp(req)
    const ipKey = hashKey(ip, 'contact')
    const attempt = attemptLimiter.hit(ipKey)
    if (!attempt.allowed) {
      sendError(res, 429, 'rate_limited', 'Too many requests. Please try again later.', { retryAfterSec: attempt.retryAfterSec }, { 'Retry-After': String(attempt.retryAfterSec) })
      req.resume()
      return
    }

    const ctype = (header(req, 'content-type') ?? '').toLowerCase()
    if (!ctype.startsWith('application/json')) {
      req.resume()
      sendError(res, 415, 'unsupported_media_type', 'Content-Type must be application/json.')
      return
    }
    const body = await readBody(req, MAX_BODY_BYTES)
    if (!body.ok) {
      if (body.reason === 'timeout') {
        sendError(res, 408, 'request_timeout', 'The request took too long to arrive.', {}, { Connection: 'close' })
        res.once('finish', () => req.destroy())
      } else if (body.reason === 'too_large') {
        sendError(res, 413, 'payload_too_large', 'Request body is too large.', {}, { Connection: 'close' })
      } else {
        sendError(res, 400, 'validation', 'Could not read the request.')
      }
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body.text)
    } catch {
      sendError(res, 400, 'validation', 'Request body must be valid JSON.')
      return
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      sendError(res, 400, 'validation', 'Request body must be a JSON object.')
      return
    }
    const data = parsed as Record<string, unknown>

    // Honeypot: real visitors never see or fill this. Pretend success, send nothing.
    const hp = data['website']
    if (hp !== undefined && hp !== null && hp !== '' && !(typeof hp === 'string' && hp.trim() === '')) {
      sendJson(res, 200, { ok: true })
      return
    }

    for (const k of Object.keys(data)) {
      if (!KNOWN_FIELDS.has(k)) {
        sendError(res, 400, 'validation', 'Unexpected field in request.')
        return
      }
    }

    const result = validate(data)
    if (!result.ok) {
      sendError(res, 400, 'validation', 'Please check the highlighted fields.', { fieldErrors: result.errors })
      return
    }

    const token = typeof data['token'] === 'string' ? data['token'] : ''
    const t = checkToken(token)
    if (t === 'too_fast') {
      sendError(res, 400, 'too_fast', 'That was quick. Please wait a moment and send again.')
      return
    }
    if (t === 'used') {
      sendError(res, 400, 'token_used', 'This message was already submitted. Please reload the page if you want to send another.')
      return
    }
    if (t === 'expired') {
      sendError(res, 400, 'token_expired', 'This form session expired. Please reload the page and try again.')
      return
    }
    if (t !== 'ok') {
      sendError(res, 400, 'bad_token', 'This form session is not valid. Please reload the page and try again.')
      return
    }
    // Claim synchronously BEFORE any await: parallel requests with one token cannot all pass.
    if (!claimToken(token) || !(await claimDurable(token))) {
      sendError(res, 400, 'token_used', 'This message was already submitted. Please reload the page if you want to send another.')
      return
    }

    const send = sendLimiter.hit(ipKey)
    if (!send.allowed || (await durableLimited(ip))) {
      releaseToken(token)
      const wait = send.retryAfterSec || 3600
      sendError(res, 429, 'rate_limited', 'You have sent several messages recently. Please try again later.', { retryAfterSec: wait }, { 'Retry-After': String(wait) })
      return
    }

    if (!process.env['RESEND_API_KEY']) {
      const domain = result.value.email.split('@')[1] ?? '?'
      console.log(`[contact:mock] accepted name_len=${result.value.name.length} email_domain=${domain} msg_len=${result.value.message.length} (NO EMAIL SENT: RESEND_API_KEY is not set)`)
      sendJson(res, 200, { ok: true, mock: true })
      return
    }

    if (!(await deliver(result.value))) {
      releaseToken(token)
      sendError(res, 500, 'server', 'The message could not be delivered. Please try again later or email directly.')
      return
    }
    sendJson(res, 200, { ok: true })
  })
}
