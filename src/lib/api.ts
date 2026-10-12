// The only module the UI uses to talk to the backend. Nothing here ever throws.

export type ContactField = 'name' | 'email' | 'message'

export interface ContactInput {
  name: string
  email: string
  message: string
  /** Value of the hidden honeypot input (must be left empty by real visitors). */
  website?: string
  /** Token from getContactToken(), fetched when the form is shown. */
  token?: string
}

export type ContactResult =
  | { ok: true; mock?: boolean }
  | {
      ok: false
      code: 'validation' | 'rate_limited' | 'network' | 'server'
      message: string
      fieldErrors?: Partial<Record<ContactField, string>>
      retryAfterSec?: number
    }

const TIMEOUT_MS = 8000
const MIN_FILL_MS = 3000

type Json = Record<string, unknown>

async function request(path: string, init: RequestInit): Promise<{ status: number; json: Json | null } | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal, credentials: 'omit' })
    let json: Json | null = null
    try {
      const parsed: unknown = await res.json()
      if (parsed && typeof parsed === 'object') json = parsed as Json
    } catch {
      // empty or non-JSON body
    }
    return { status: res.status, json }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch the time-trap token. Call when the contact form becomes visible. Returns null on failure. */
export async function getContactToken(): Promise<string | null> {
  const r = await request('/api/contact', { method: 'GET' })
  const t = r?.json?.['token']
  return r && r.status === 200 && typeof t === 'string' ? t : null
}

function isFieldErrors(v: unknown): v is Partial<Record<ContactField, string>> {
  return typeof v === 'object' && v !== null
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v ? v : fallback
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

let inflight: { key: string; promise: Promise<ContactResult> } | null = null

/**
 * Send a message. At most one send runs at a time. A second call with IDENTICAL input while one is
 * pending shares its promise (double click never delivers twice); a call with DIFFERENT input gets a
 * clear non-ok result instead of being silently dropped.
 */
export function sendContact(input: ContactInput): Promise<ContactResult> {
  const key = JSON.stringify([input.name, input.email, input.message])
  if (inflight) {
    return inflight.key === key
      ? inflight.promise
      : Promise.resolve<ContactResult>({ ok: false, code: 'validation', message: 'A message is already being sent. Please wait a moment.' })
  }
  const p = doSend(input).finally(() => {
    inflight = null
  })
  inflight = { key, promise: p }
  return p
}

async function doSend(input: ContactInput): Promise<ContactResult> {
  const network: ContactResult = {
    ok: false,
    code: 'network',
    message: 'Could not reach the server. Check your connection and try again.',
  }
  try {
    let token = input.token
    if (!token) {
      // No token supplied: get one now and wait out the minimum fill time.
      const fresh = await getContactToken()
      if (!fresh) return network
      token = fresh
      await sleep(MIN_FILL_MS + 200)
    }
    const send = (tok: string) =>
      request('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          message: input.message,
          website: input.website ?? '',
          token: tok,
        }),
      })
    let r = await send(token)
    if (!r) return network
    // Only when the server says it did NOT process the message (too fast, expired or invalid token)
    // get a fresh token and retry once. Never after 'token_used' (a send already consumed it).
    const c0 = r.json?.['code']
    if (r.status === 400 && (c0 === 'too_fast' || c0 === 'token_expired' || c0 === 'bad_token')) {
      const fresh = await getContactToken()
      if (fresh) {
        await sleep(MIN_FILL_MS + 200)
        r = (await send(fresh)) ?? r
      }
    }
    const { status, json } = r
    if (status === 200 && json?.['ok'] === true) return json['mock'] === true ? { ok: true, mock: true } : { ok: true }
    const message = asString(json?.['message'], 'Something went wrong. Please try again later.')
    if (status === 429) {
      const ra = json?.['retryAfterSec']
      return { ok: false, code: 'rate_limited', message, ...(typeof ra === 'number' ? { retryAfterSec: ra } : {}) }
    }
    if (status === 400 || status === 408 || status === 413 || status === 415) {
      const fe = json?.['fieldErrors']
      return { ok: false, code: 'validation', message, ...(isFieldErrors(fe) ? { fieldErrors: fe } : {}) }
    }
    if (status === 404 || status === 405) {
      return { ok: false, code: 'server', message: 'Messaging is not available right now.' }
    }
    return { ok: false, code: 'server', message }
  } catch {
    return network
  }
}

const recorded = new Set<string>()

/** Fire-and-forget page-load ping. No-op in dev. Never throws. */
export function recordVisit(mode: 'gate' | 'story' | 'index'): void {
  try {
    if (import.meta.env.DEV) return
    if (recorded.has(mode)) return
    recorded.add(mode)
    const body = JSON.stringify({ mode })
    // text/plain Blob keeps the request "simple" (no CORS preflight).
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon('/api/hit', new Blob([body], { type: 'text/plain' }))) return
    }
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    void fetch('/api/hit', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: true,
      credentials: 'omit',
      signal: ctrl.signal,
    }).catch(() => undefined)
  } catch {
    // swallow everything
  }
}
