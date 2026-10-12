import { useCallback, useEffect, useRef, useState } from 'react'
import { getContactToken, sendContact } from '../lib/api'
import type { ContactField } from '../lib/api'
import { person } from '../content/entries'
import './contact.css'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success' }
  | { kind: 'error'; text: string; fallback: boolean }
  | { kind: 'limited'; text: string; until: number }

type Errors = Partial<Record<ContactField, string>>

const LIMITS = { name: 80, email: 200, min: 10, max: 2000 }
const ORDER: ContactField[] = ['name', 'email', 'message']
const len = (s: string) => Array.from(s).length

// Mirror of the server's normalisation (api/contact.ts) so counter and checks agree with it.
// oxlint-disable-next-line no-control-regex
const STRIP_ALL = new RegExp('[\u0000-\u001F\u007F-\u009F​-‏ -‮⁠-⁩﻿]', 'g')
// oxlint-disable-next-line no-control-regex
const STRIP_KEEP_NL = new RegExp('[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏ -‮⁠-⁩﻿]', 'g')
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|�/g
const wellFormed = (s: string) => s.replace(LONE_SURROGATE, '')
const cleanLine = (s: string) => wellFormed(s).replace(STRIP_ALL, ' ').replace(/\s+/g, ' ').trim()
const cleanMultiline = (s: string) =>
  wellFormed(s).replace(/\r\n?/g, '\n').replace(STRIP_KEEP_NL, '').replace(/\n{3,}/g, '\n\n').trim()

function validate(v: Record<ContactField, string>): Errors {
  const e: Errors = {}
  const name = cleanLine(v.name)
  if (!name) e.name = 'Please enter your name.'
  else if (len(name) > LIMITS.name) e.name = `Name is too long (max ${LIMITS.name} characters).`
  const email = cleanLine(v.email).replace(/\s/g, '')
  if (!email) e.email = 'Please enter your email so I can reply.'
  else if (len(email) > LIMITS.email) e.email = `Email is too long (max ${LIMITS.email} characters).`
  else if (!/^\S+@\S+$/.test(email)) e.email = 'That does not look like an email address.'
  const n = len(cleanMultiline(v.message))
  if (n < LIMITS.min) e.message = `Message needs at least ${LIMITS.min} characters.`
  else if (n > LIMITS.max) e.message = `Message is too long (max ${LIMITS.max} characters).`
  return e
}

function fmtWait(sec: number) {
  if (sec >= 90) return `${Math.ceil(sec / 60)} minutes`
  return `${Math.max(1, Math.ceil(sec))} seconds`
}

export default function ContactForm() {
  const [values, setValues] = useState<Record<ContactField, string>>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [slow, setSlow] = useState(false)
  const [againReady, setAgainReady] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const token = useRef<string | null>(null)
  const honeypot = useRef<HTMLInputElement>(null)
  const sending = useRef(false)
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  }
  const successRef = useRef<HTMLDivElement>(null)
  const [focusKey, setFocusKey] = useState<ContactField | 'success' | null>(null)

  const fetchToken = useCallback(() => {
    token.current = null
    void getContactToken().then((t) => {
      token.current = t
    })
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  // Move focus after the DOM reflects the new state.
  useEffect(() => {
    if (!focusKey) return
    if (focusKey === 'success') successRef.current?.focus()
    else refs[focusKey].current?.focus()
    setFocusKey(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  // "Send another" only becomes active shortly after success, so a double click cannot hit it.
  useEffect(() => {
    if (status.kind !== 'success') return
    const t = setTimeout(() => setAgainReady(true), 900)
    return () => clearTimeout(t)
  }, [status.kind])

  // Calm hint when the time-trap makes sending take a few seconds.
  useEffect(() => {
    if (status.kind !== 'sending') return
    const t = setTimeout(() => setSlow(true), 1000)
    return () => {
      clearTimeout(t)
      setSlow(false)
    }
  }, [status.kind])

  // Rate-limit countdown; re-enables Send when it reaches zero.
  const until = status.kind === 'limited' ? status.until : 0
  useEffect(() => {
    if (!until) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (t >= until) setStatus({ kind: 'idle' })
    }
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [until])

  const set = (k: ContactField, v: string) => {
    setValues((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const firstInvalid = (e: Errors) => ORDER.find((k) => e[k])

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (sending.current || status.kind === 'limited') return
    const local = validate(values)
    if (Object.values(local).some(Boolean)) {
      setErrors(local)
      setStatus({ kind: 'idle' })
      setFocusKey(firstInvalid(local) ?? null)
      return
    }
    sending.current = true
    setErrors({})
    setStatus({ kind: 'sending' })
    let consumed = false
    try {
      const r = await sendContact({
        name: cleanLine(values.name),
        email: cleanLine(values.email).replace(/\s/g, ''),
        message: cleanMultiline(values.message),
        website: honeypot.current?.value ?? '',
        ...(token.current ? { token: token.current } : {}),
      })
      consumed = true // never re-POST this token, whatever the outcome
      if (r.ok) {
        setValues({ name: '', email: '', message: '' })
        setAgainReady(false)
        setStatus({ kind: 'success' })
        setFocusKey('success')
        return
      }
      if (r.code === 'validation') {
        const fe: Errors = {}
        for (const k of ORDER) {
          const m = r.fieldErrors?.[k]
          if (typeof m === 'string' && m) fe[k] = m
        }
        if (Object.keys(fe).length) {
          setErrors(fe)
          setStatus({ kind: 'idle' })
          setFocusKey(firstInvalid(fe) ?? null)
        } else if (/already submitted|reload/i.test(r.message)) {
          // token_used / expired / invalid session: a fresh token is fetched below, text is kept.
          setStatus({
            kind: 'error',
            text: 'This form session was already used, so I refreshed it. Your text is still here: press Send again if your message did not arrive.',
            fallback: false,
          })
        } else {
          setStatus({ kind: 'error', text: r.message, fallback: false })
        }
      } else if (r.code === 'rate_limited') {
        const wait = Math.min(Math.max(r.retryAfterSec ?? 60, 5), 3600)
        const t = Date.now()
        setNow(t)
        setStatus({
          kind: 'limited',
          text: typeof r.retryAfterSec === 'number' && r.retryAfterSec > 0 ? `Too many messages from this connection for now. Please try again in about ${fmtWait(r.retryAfterSec)}.` : r.message,
          until: t + wait * 1000,
        })
      } else {
        // network or server: keep the text, offer the email fallback
        setStatus({ kind: 'error', text: r.message, fallback: true })
      }
    } finally {
      sending.current = false
      if (consumed) fetchToken()
    }
  }

  const again = () => {
    if (!againReady) return
    setStatus({ kind: 'idle' })
    setErrors({})
    setFocusKey('name')
  }

  const mail = person.contact.email
  const busy = status.kind === 'sending'
  const limited = status.kind === 'limited'
  const count = len(cleanMultiline(values.message))
  const over = count > LIMITS.max
  const near = !over && LIMITS.max - count <= 100
  const countNote = over
    ? `Message is over the ${LIMITS.max} character limit.`
    : near
      ? 'Fewer than 100 characters left.'
      : ''

  const fallbackLink = <a href={`mailto:${mail}`}>{mail}</a>

  if (status.kind === 'success') {
    return (
      <div className="cf-success" ref={successRef} tabIndex={-1} role="status" aria-live="polite">
        <h3>Message sent. Thank you.</h3>
        <p>I read everything, and I will reply to the email you gave.</p>
        <button type="button" className="cf-again" onClick={again} aria-disabled={!againReady}>
          Send another
        </button>
      </div>
    )
  }

  const describedBy = (k: ContactField) => {
    const ids = [errors[k] ? `cf-${k}-err` : '', k === 'message' ? 'cf-count' : ''].filter(Boolean).join(' ')
    return ids || undefined
  }
  const field = (k: ContactField, label: string, input: React.ReactNode) => (
    <div className="cf-field">
      <div className="cf-row">
        <label className="cf-label" htmlFor={`cf-${k}`}>
          {label}
        </label>
        {k === 'message' && (
          <span className={`cf-count${over ? ' is-over' : ''}`} id="cf-count">
            {count} / {LIMITS.max}
          </span>
        )}
      </div>
      {input}
      {errors[k] && (
        <p className="cf-error" id={`cf-${k}-err`}>
          {errors[k]}
        </p>
      )}
    </div>
  )
  const aria = (k: ContactField) => ({
    id: `cf-${k}`,
    name: k,
    'aria-invalid': errors[k] ? (true as const) : undefined,
    'aria-describedby': describedBy(k),
    'aria-required': true as const,
  })

  return (
    <form className="contact-form" onSubmit={submit} noValidate aria-label="Send Risheek a message" aria-busy={busy}>
      {field(
        'name',
        'YOUR NAME',
        <input ref={refs.name} type="text" autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} {...aria('name')} />,
      )}
      {field(
        'email',
        'YOUR EMAIL',
        <input ref={refs.email} type="email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} {...aria('email')} />,
      )}
      {field(
        'message',
        'MESSAGE',
        <textarea ref={refs.message} rows={6} value={values.message} onChange={(e) => set('message', e.target.value)} {...aria('message')} />,
      )}

      {/* Honeypot: off-screen (not display:none), skipped by keyboard and screen readers. */}
      <div className="cf-hp" aria-hidden="true">
        <label htmlFor="cf-website">Website</label>
        <input ref={honeypot} id="cf-website" className="cf-hp" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="cf-actions">
        {/* aria-disabled (not disabled) so keyboard focus is never dropped; submit() ignores clicks meanwhile. */}
        <button type="submit" className="cf-submit" aria-disabled={busy || limited}>
          {busy ? 'Sending…' : 'Send'}
        </button>
        {limited && (
          <span className="cf-count" aria-hidden="true">
            Available again in {fmtWait(Math.max(0, (status.until - now) / 1000))}
          </span>
        )}
      </div>

      <div aria-live="polite" role="status">
        {status.kind === 'sending' && (
          <p className="cf-status">{slow ? 'Sending… (this can take a few seconds)' : 'Sending your message…'}</p>
        )}
        {status.kind === 'limited' && (
          <p className="cf-status is-problem">
            {status.text} You can also write to {fallbackLink} directly.
          </p>
        )}
        {status.kind === 'error' && (
          <p className="cf-status is-problem">
            {status.fallback ? (
              <>
                That did not go through. Your message is still here, so nothing is lost. You can try again, or email me directly at {fallbackLink}.
              </>
            ) : (
              status.text
            )}
          </p>
        )}
        {Object.values(errors).some(Boolean) && <p className="cf-status is-problem">Please fix the highlighted fields.</p>}
      </div>
      <div className="cf-sr" aria-live="polite" role="status">
        {countNote}
      </div>
    </form>
  )
}
