// Run: node api/_dev/test.mjs   (Node built-ins only; no credentials, no network)
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const serverFile = path.join(here, 'server.mjs')
let pass = 0
let fail = 0
const check = (name, cond, extra = '') => {
  if (cond) pass++
  else fail++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + extra}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- fakes ----------
function listen(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler)
    s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }))
  })
}
const readAll = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)) })

const upstash = { kv: new Map(), commands: [] }
const fakeUpstash = await listen(async (req, res) => {
  if (req.headers.authorization !== 'Bearer up-token') { res.statusCode = 401; return res.end('{}') }
  const cmds = JSON.parse(await readAll(req))
  const out = cmds.map((c) => {
    upstash.commands.push(c)
    const [op, key] = c
    if (op === 'INCR') { const v = Number(upstash.kv.get(key) ?? 0) + 1; upstash.kv.set(key, v); return { result: v } }
    if (op === 'GET') return { result: upstash.kv.has(key) ? String(upstash.kv.get(key)) : null }
    if (op === 'EXPIRE') return { result: 1 }
    return { error: 'unsupported' }
  })
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(out))
})

const resend = { calls: [], fail: false }
const fakeResend = await listen(async (req, res) => {
  resend.calls.push({ auth: req.headers.authorization, body: JSON.parse(await readAll(req)) })
  res.statusCode = resend.fail ? 500 : 200
  res.setHeader('Content-Type', 'application/json')
  res.end('{"id":"x"}')
})

// ---------- server launcher ----------
let nextPort = 8801
async function start(env) {
  const port = nextPort++
  const base = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, PORT: String(port) }
  const child = spawn(process.execPath, [serverFile], { env: { ...base, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  let logs = ''
  child.stdout.on('data', (d) => (logs += d))
  child.stderr.on('data', (d) => (logs += d))
  for (let i = 0; i < 100 && !logs.includes('dev server on'); i++) await sleep(50)
  if (!logs.includes('dev server on')) throw new Error('server did not start: ' + logs)
  const url = `http://127.0.0.1:${port}`
  return { url, stop: () => child.kill(), logs: () => logs }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
const post = (url, body, headers = {}, raw = false) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA, ...headers }, body: raw ? body : JSON.stringify(body) })
const getToken = async (base, ip) => (await (await fetch(base + '/api/contact', { headers: ip ? { 'X-Forwarded-For': ip } : {} })).json()).token
const LONG_TOKEN = 'k'.repeat(40)
const good = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello Risheek, I would love to chat about a role.' }

// =====================================================================
console.log('\n== Server A: no env at all (mock mode, no-op counters) ==')
const A = await start({})
{
  const tokens = []
  for (let i = 0; i < 24; i++) tokens.push(await getToken(A.url))
  const tk = () => tokens.pop()
  await sleep(3300)
  const fresh = await getToken(A.url) // not aged: used immediately for the too-fast test

  let r = await fetch(A.url + '/api/contact')
  let j = await r.json()
  check('GET /api/contact issues token', r.status === 200 && typeof j.token === 'string' && j.minWaitMs === 3000)

  r = await post(A.url + '/api/contact', { ...good, token: tk() })
  j = await r.json()
  check('valid contact -> 200 {ok:true, mock:true}', r.status === 200 && j.ok === true && j.mock === true, JSON.stringify(j))
  check('mock log is redacted (no email/name/message text)', !A.logs().includes('ada@example.com') && !A.logs().includes('Lovelace') && !A.logs().includes('Hello Risheek') && A.logs().includes('[contact:mock]'))

  const bad = async (label, body, code = 'validation', status = 400, field) => {
    const rr = await post(A.url + '/api/contact', { ...body, token: tk() })
    const jj = await rr.json()
    check(label, rr.status === status && jj.code === code && (!field || jj.fieldErrors?.[field]), `${rr.status} ${JSON.stringify(jj)}`)
  }
  await bad('missing name -> 400 fieldErrors.name', { email: good.email, message: good.message }, 'validation', 400, 'name')
  await bad('name > 80 chars -> 400', { ...good, name: 'x'.repeat(81) }, 'validation', 400, 'name')
  await bad('name only control chars -> 400', { ...good, name: '\u0000\u0007\n' }, 'validation', 400, 'name')
  await bad('invalid email -> 400', { ...good, email: 'not-an-email' }, 'validation', 400, 'email')
  await bad('email with header injection -> 400', { ...good, email: 'a@b.com\r\nBcc: x@y.com' }, 'validation', 400, 'email')
  await bad('email > 200 chars -> 400', { ...good, email: 'a'.repeat(195) + '@b.com' }, 'validation', 400, 'email')
  await bad('message < 10 chars -> 400', { ...good, message: 'short' }, 'validation', 400, 'message')
  await bad('message > 2000 chars -> 400', { ...good, message: 'm'.repeat(2001) }, 'validation', 400, 'message')
  await bad('non-string fields -> 400', { name: 5, email: [], message: {} }, 'validation', 400, 'name')
  await bad('unexpected extra field -> 400', { ...good, admin: true })

  r = await post(A.url + '/api/contact', 'not json{', {}, true)
  check('invalid JSON -> 400', r.status === 400 && (await r.json()).code === 'validation')
  r = await post(A.url + '/api/contact', '[1,2]', {}, true)
  check('JSON array body -> 400', r.status === 400)

  r = await post(A.url + '/api/contact', { ...good, website: 'http://spam.example', token: tk() })
  j = await r.json()
  check('honeypot filled -> silent fake success (200 ok, no mock flag)', r.status === 200 && j.ok === true && j.mock === undefined, JSON.stringify(j))

  r = await post(A.url + '/api/contact', { ...good, token: fresh })
  j = await r.json()
  check('too-fast submit -> 400 too_fast', r.status === 400 && j.code === 'too_fast', JSON.stringify(j))

  r = await post(A.url + '/api/contact', { ...good, token: 'garbage.token.value' })
  check('forged token -> 400 bad_token', r.status === 400 && (await r.json()).code === 'bad_token')
  r = await post(A.url + '/api/contact', { ...good })
  check('missing token -> 400 bad_token', r.status === 400 && (await r.json()).code === 'bad_token')

  const t = tk()
  r = await post(A.url + '/api/contact', { ...good, token: t })
  const r2 = await post(A.url + '/api/contact', { ...good, token: t })
  check('token cannot be replayed (token_used)', r.status === 200 && r2.status === 400 && (await r2.json()).code === 'token_used')

  r = await post(A.url + '/api/contact', 'x'.repeat(100_000), {}, true)
  j = await r.json()
  check('oversized body (100 KB) -> 413', r.status === 413 && j.code === 'payload_too_large', `${r.status}`)
  r = await post(A.url + '/api/contact', JSON.stringify(good), { 'Content-Type': 'text/plain' }, true)
  check('wrong content-type -> 415', r.status === 415)

  r = await fetch(A.url + '/api/contact', { method: 'PUT' })
  check('PUT /api/contact -> 405 with Allow', r.status === 405 && /GET, POST/.test(r.headers.get('allow') ?? ''))
  r = await fetch(A.url + '/api/hit')
  check('GET /api/hit -> 405', r.status === 405)
  r = await fetch(A.url + '/api/stats', { method: 'POST' })
  check('POST /api/stats -> 405', r.status === 405)

  r = await post(A.url + '/api/contact', { ...good, token: tk() }, { Origin: 'https://evil.example' })
  check('foreign Origin -> 403, no CORS header', r.status === 403 && !r.headers.get('access-control-allow-origin'))
  r = await post(A.url + '/api/contact', { ...good, token: tk() }, { Origin: new URL(A.url).origin })
  check('same-origin Origin accepted', r.status === 200)

  r = await post(A.url + '/api/hit', { mode: 'story' })
  check('hit with no Upstash env -> silent 204 no-op', r.status === 204)
  r = await fetch(A.url + '/api/stats')
  check('stats with STATS_TOKEN unset -> 404', r.status === 404)
  r = await fetch(A.url + '/api/nope')
  check('unknown route -> 404 JSON', r.status === 404)
}
A.stop()

// =====================================================================
console.log('\n== Server B: fake Resend + fake Upstash + STATS_TOKEN ==')
const B = await start({
  RESEND_API_KEY: 're_test_key', RESEND_API_URL: fakeResend.url + '/emails', CONTACT_TO: 'owner@example.com', CONTACT_FROM: 'Site <site@example.com>',
  UPSTASH_REDIS_REST_URL: fakeUpstash.url, UPSTASH_REDIS_REST_TOKEN: 'up-token', STATS_TOKEN: LONG_TOKEN,
})
{
  const t1 = await getToken(B.url), t2 = await getToken(B.url), t3 = await getToken(B.url)
  await sleep(3300)
  let r = await post(B.url + '/api/contact', { name: 'Eve <script>alert(1)</script>', email: 'eve@example.com', message: 'Line one\r\nLine two with <b>html</b> and \u0000nul', token: t1 })
  let j = await r.json()
  const call = resend.calls[0]
  check('real mode: valid contact -> 200 (no mock flag)', r.status === 200 && j.ok === true && j.mock === undefined, JSON.stringify(j))
  check('provider got Bearer key, to=CONTACT_TO, from=CONTACT_FROM', call?.auth === 'Bearer re_test_key' && call.body.to[0] === 'owner@example.com' && call.body.from === 'Site <site@example.com>')
  check('reply_to is the visitor, text only (no html field)', call?.body.reply_to === 'eve@example.com' && call.body.html === undefined && typeof call.body.text === 'string')
  check('control chars stripped from body', !call?.body.text.includes('\u0000') && call.body.text.includes('Line one\nLine two'))
  check('subject has no newlines', !/[\r\n]/.test(call?.body.subject ?? 'x'))

  const before = resend.calls.length
  await post(B.url + '/api/contact', { ...good, website: 'bot', token: t2 })
  check('honeypot does NOT trigger an email', resend.calls.length === before)

  resend.fail = true
  r = await post(B.url + '/api/contact', { ...good, token: t3 })
  j = await r.json()
  check('provider failure -> 500 generic, no leak', r.status === 500 && j.code === 'server' && !JSON.stringify(j).includes('re_test_key'), JSON.stringify(j))
  resend.fail = false

  // ---- hits ----
  const total = () => Number(upstash.kv.get('hits:total') ?? 0)
  r = await post(B.url + '/api/hit', { mode: 'index' }, { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)', 'X-Forwarded-For': '198.51.100.1' })
  check('bot UA -> 204 and not counted', r.status === 204 && total() === 0)
  r = await post(B.url + '/api/hit', {}, { 'User-Agent': '', 'X-Forwarded-For': '198.51.100.9' })
  check('empty UA -> 204 and not counted', r.status === 204 && total() === 0)
  r = await post(B.url + '/api/hit', { mode: 'story' }, { 'X-Forwarded-For': '203.0.113.7' })
  check('normal hit -> 204 and counted', r.status === 204 && total() === 1)
  r = await post(B.url + '/api/hit', { mode: 'story' }, { 'X-Forwarded-For': '203.0.113.7' })
  check('rapid repeat from same IP de-duplicated', r.status === 204 && total() === 1)
  r = await post(B.url + '/api/hit', 'garbage', { 'X-Forwarded-For': '203.0.113.8', 'Content-Type': 'text/plain' }, true)
  check('different visitor, junk body -> counted, still 204', r.status === 204 && total() === 2)
  const day = new Date().toISOString().slice(0, 10)
  check('per-day counter incremented', upstash.kv.get('hits:day:' + day) === 2)
  const stored = JSON.stringify([...upstash.commands])
  check('no IP / user-agent stored anywhere in Upstash commands', !stored.includes('203.0.113') && !stored.includes('Mozilla') && !stored.includes('198.51'))

  // ---- stats ----
  r = await fetch(B.url + '/api/stats')
  check('stats without token -> 401', r.status === 401)
  r = await fetch(B.url + '/api/stats', { headers: { Authorization: 'Bearer wrong' } })
  check('stats wrong token -> 401', r.status === 401)
  r = await fetch(B.url + '/api/stats', { headers: { Authorization: LONG_TOKEN } })
  check('stats token without Bearer prefix -> 401', r.status === 401)
  r = await fetch(B.url + '/api/stats', { headers: { Authorization: 'Bearer ' + LONG_TOKEN } })
  j = await r.json()
  const today = j.last30Days?.[j.last30Days.length - 1]
  check('stats right token -> 200 with totals', r.status === 200 && j.total === 2 && j.last30Days.length === 30 && today.date === day && today.count === 2 && j.byMode.story === 1, JSON.stringify(j).slice(0, 200))
  check('stats not cacheable', r.headers.get('cache-control') === 'no-store')
}
B.stop()

// =====================================================================
console.log('\n== Server C: rate limit (mock mode) ==')
const C = await start({})
{
  const toks = []
  for (let i = 0; i < 7; i++) toks.push(await getToken(C.url))
  await sleep(3300)
  const codes = []
  let last
  for (const t of toks) {
    last = await post(C.url + '/api/contact', { ...good, token: t })
    codes.push(last.status)
  }
  check('first 5 sends OK, 6th and 7th -> 429', codes.slice(0, 5).every((c) => c === 200) && codes[5] === 429 && codes[6] === 429, codes.join(','))
  const j = await last.json()
  check('429 has Retry-After + retryAfterSec', Number(last.headers.get('retry-after')) > 0 && j.retryAfterSec > 0 && j.code === 'rate_limited')
  const other = await getToken(C.url, '192.0.2.55')
  await sleep(3300)
  const r = await post(C.url + '/api/contact', { ...good, token: other }, { 'X-Forwarded-For': '192.0.2.55' })
  check('a different IP is not limited', r.status === 200)
}
C.stop()

// =====================================================================
console.log('\n== Server D: Upstash configured but unreachable ==')
const D = await start({ UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:1', UPSTASH_REDIS_REST_TOKEN: 'x', STATS_TOKEN: LONG_TOKEN })
{
  let r = await post(D.url + '/api/hit', { mode: 'gate' })
  check('storage down -> hit still 204', r.status === 204)
  r = await fetch(D.url + '/api/stats', { headers: { Authorization: 'Bearer ' + LONG_TOKEN } })
  check('storage down -> stats 503 (not a crash)', r.status === 503)
  const t = await getToken(D.url)
  await sleep(3300)
  r = await post(D.url + '/api/contact', { ...good, token: t })
  check('storage down -> contact still works (falls back to memory limiter)', r.status === 200)
}
D.stop()

// =====================================================================
console.log('\n== Server F: fix-round checks (fake Resend) ==')
const F = await start({ RESEND_API_KEY: 're_test_key', RESEND_API_URL: fakeResend.url + '/emails' })
{
  const toks = []
  for (let i = 0; i < 12; i++) toks.push(await getToken(F.url))
  await sleep(3300)
  const sent = () => resend.calls.length

  // D1: 8 concurrent POSTs with ONE token -> exactly one delivered
  let before = sent()
  const same = toks[0]
  const rs = await Promise.all(Array.from({ length: 8 }, () => post(F.url + '/api/contact', { ...good, token: same }, { 'X-Forwarded-For': '10.1.1.1' })))
  const codes = await Promise.all(rs.map(async (x) => (x.status === 200 ? 'ok' : (await x.json()).code)))
  check('D1: 8 parallel sends, one token -> exactly 1 delivered', sent() - before === 1 && codes.filter((c) => c === 'ok').length === 1 && codes.filter((c) => c === 'token_used').length === 7, codes.join(',') + ' delivered=' + (sent() - before))

  // failed delivery releases the token so a retry works
  resend.fail = true
  let r = await post(F.url + '/api/contact', { ...good, token: toks[1] }, { 'X-Forwarded-For': '10.1.1.2' })
  resend.fail = false
  const r2 = await post(F.url + '/api/contact', { ...good, token: toks[1] }, { 'X-Forwarded-For': '10.1.1.2' })
  check('failed delivery (500) releases token; retry with same token delivers', r.status === 500 && r2.status === 200, r.status + ',' + r2.status)
  check('provider failure logged with a clear secret-free reason', F.logs().includes('provider_error status=500') && !F.logs().includes('re_test_key'))

  // D2: double sendContact through the real client file
  const fsm = await import('node:fs')
  const os = await import('node:os')
  const dir = fsm.mkdtempSync(path.join(os.tmpdir(), 'apitest-'))
  const src = fsm.readFileSync(path.join(here, '..', '..', 'src', 'lib', 'api.ts'), 'utf8').replaceAll('import.meta.env.DEV', 'false')
  fsm.writeFileSync(path.join(dir, 'api.mts'), src)
  const client = await import(pathToFileURL(path.join(dir, 'api.mts')).href)
  const realFetch = globalThis.fetch
  globalThis.fetch = (u, i) => realFetch(typeof u === 'string' && u.startsWith('/') ? F.url + u : u, { ...i, headers: { ...(i?.headers ?? {}), 'X-Forwarded-For': '10.1.1.3' } })
  before = sent()
  const [a, b] = await Promise.all([
    client.sendContact({ ...good, token: toks[2] }),
    client.sendContact({ ...good, token: toks[2] }),
  ])
  check('D2: double sendContact -> exactly 1 email, both resolve ok', sent() - before === 1 && a.ok && b.ok, JSON.stringify([a, b]) + ' delivered=' + (sent() - before))
  const c3 = await client.sendContact({ ...good, token: toks[2] })
  check('D2: no auto-retry after a consumed token (token_used -> validation, still 1 email)', c3.ok === false && c3.code === 'validation' && sent() - before === 1, JSON.stringify(c3))
  before = sent()
  const [d1, d2] = await Promise.all([
    client.sendContact({ ...good, token: toks[8] }),
    client.sendContact({ ...good, message: 'A completely different message body.', token: toks[9] }),
  ])
  check('D13: concurrent call with DIFFERENT input -> clear non-ok result, first still delivered once', d1.ok === true && d2.ok === false && d2.code === 'validation' && /already being sent/.test(d2.message) && sent() - before === 1, JSON.stringify([d1, d2]) + ' delivered=' + (sent() - before))
  const fe = await client.sendContact({ ...good, email: 'bad', token: toks[3] })
  check('client maps 400 validation with fieldErrors', fe.ok === false && fe.code === 'validation' && !!fe.fieldErrors?.email)
  globalThis.fetch = realFetch

  // D6 / D7
  let n = 0
  const ipN = () => ({ 'X-Forwarded-For': '10.2.2.' + ++n })
  for (const email of ['a@b..co', 'a@b.co.', 'a@-b.co', '.a@b.co', 'a..b@c.co']) {
    const rr = await post(F.url + '/api/contact', { ...good, email, token: toks[4] }, ipN())
    check('D6: rejects email ' + email, rr.status === 400 && (await rr.json()).fieldErrors?.email)
  }
  r = await post(F.url + '/api/contact', { ...good, name: 'Zed\ud800X', token: toks[5] }, ipN())
  const body = resend.calls.at(-1).body
  const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/
  check('D7: lone surrogate sanitised (200, none forwarded)', r.status === 200 && !lone.test(body.subject + body.text) && body.subject.includes('ZedX'), JSON.stringify(body.subject))
  r = await post(F.url + '/api/contact', { ...good, message: '\u{1F600}'.repeat(1500), token: toks[6] }, ipN())
  check('D7: 1500 emoji (3000 UTF-16 units) accepted: counted in characters', r.status === 200, r.status)
  r = await post(F.url + '/api/contact', { ...good, message: '\u{1F600}'.repeat(2001), token: toks[7] }, ipN())
  check('D7: 2001 characters rejected', r.status === 400)

  // D11: GET token throttle (60 / 10 min / IP)
  let last
  for (let i = 0; i < 62; i++) last = await fetch(F.url + '/api/contact', { headers: { 'X-Forwarded-For': '10.9.9.9' } })
  check('D11: GET /api/contact throttled -> 429', last.status === 429)
}
F.stop()

// =====================================================================
console.log('\n== Server G: stats throttle, body timeout; Server H: short stats token, preparsed body ==')
const G = await start({ UPSTASH_REDIS_REST_URL: fakeUpstash.url, UPSTASH_REDIS_REST_TOKEN: 'up-token', STATS_TOKEN: LONG_TOKEN, BODY_TIMEOUT_MS: '1000' })
{
  const bad = (ip) => fetch(G.url + '/api/stats', { headers: { Authorization: 'Bearer nope', 'X-Forwarded-For': ip } })
  const codes = []
  for (let i = 0; i < 12; i++) codes.push((await bad('10.5.5.5')).status)
  check('D4: wrong tokens -> 401 x11 then 429', codes.slice(0, 11).every((c) => c === 401) && codes[11] === 429, codes.join(','))
  let r = await fetch(G.url + '/api/stats', { headers: { Authorization: 'Bearer ' + LONG_TOKEN, 'X-Forwarded-For': '10.5.5.5' } })
  check('D4: blocked IP gets 429 + Retry-After even with the right token', r.status === 429 && Number(r.headers.get('retry-after')) > 0)
  r = await fetch(G.url + '/api/stats', { headers: { Authorization: 'Bearer ' + LONG_TOKEN, 'X-Forwarded-For': '10.5.5.6' } })
  check('D4: other IP with right token still works', r.status === 200)

  // D8: slow body
  const net = await import('node:net')
  const resp = await new Promise((resolve) => {
    const t0 = Date.now()
    const sock = net.connect(Number(new URL(G.url).port), '127.0.0.1', () => {
      sock.write('POST /api/contact HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{"name":')
    })
    let buf = ''
    sock.on('data', (d) => (buf += d))
    sock.on('close', () => resolve({ buf, ms: Date.now() - t0 }))
    setTimeout(() => sock.destroy(), 6000)
  })
  check('D8: slow/partial body -> 408 and connection closed after the ~1s timeout', resp.buf.startsWith('HTTP/1.1 408') && resp.ms < 4000, resp.buf.slice(0, 40) + ' ms=' + resp.ms)
}
G.stop()
const H = await start({ STATS_TOKEN: 'short', PRELOAD_BODY: '1' })
{
  let r = await fetch(H.url + '/api/stats', { headers: { Authorization: 'Bearer short' } })
  check('D4: STATS_TOKEN shorter than 32 chars is treated as unset -> 404', r.status === 404)
  const t = await getToken(H.url)
  await sleep(3300)
  r = await post(H.url + '/api/contact', { ...good, token: t })
  check('platform-preparsed req.body is used (no stream hang) -> 200', r.status === 200 && (await r.json()).mock === true)
}
H.stop()

fakeUpstash.server.close()
fakeResend.server.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
