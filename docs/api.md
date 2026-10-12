# Backend API

Small Vercel serverless backend. The site works fully without it; every call degrades gracefully. The frontend talks to it only through `src/lib/api.ts`.

All responses are JSON (except `204`), `Cache-Control: no-store`. Errors look like:

```json
{ "ok": false, "code": "validation", "message": "human readable", "fieldErrors": { "email": "..." } }
```

CORS: same-origin only. Other origins get `403 forbidden_origin` unless listed in `ALLOWED_ORIGINS` (comma-separated, e.g. `https://example.com`). Localhost origins are also allowed when not running on Vercel (local dev only).

## IMPORTANT: two ways messages can silently not arrive

1. **No `RESEND_API_KEY` = mock mode.** The form reports success (`{"ok":true,"mock":true}`) but **nothing is emailed**. If the key is missing or misspelled in Vercel, every message is discarded while visitors see "sent". The server log says `[contact:mock] ... NO EMAIL SENT`. Always send a real test message after deploying (see Before launch).
2. **Test sender restriction.** With the default sender `onboarding@resend.dev` (i.e. `CONTACT_FROM` unset), Resend only delivers to the email address the Resend account was created with. So `CONTACT_TO` must be **unset or exactly that address**; otherwise every send fails and visitors get a generic error (`500 server`). The Vercel log then says `provider_error status=403` (or 422) with a hint. Fix: set `CONTACT_TO` correctly, or verify your own domain in Resend and set `CONTACT_FROM`.

## Endpoints

### `GET /api/contact`
Issues a signed time-trap token (the form must be open at least 3 s before it can be sent).

`200` `{ "ok": true, "token": "<string>", "minWaitMs": 3000 }`. Token is valid 3 s to 2 h after issue. `429` if one IP asks for more than 60 per 10 minutes.

### `POST /api/contact`
Sends a message to `CONTACT_TO` (default risheeknawka@gmail.com). Header `Content-Type: application/json`, body max 8 KB, must arrive within 5 s.

```json
{ "name": "1-80 chars", "email": "valid, max 200", "message": "10-2000 chars",
  "website": "", "token": "<from GET /api/contact>" }
```
Lengths count characters (code points), so an emoji counts as 1. `website` is the hidden honeypot: it must be empty. Unknown fields are rejected. Control, zero-width and bidi characters are stripped and lone surrogates removed. The email is sent as plain text (never HTML) with `reply_to` set to the visitor, so Risheek can just hit Reply.

| Status | `code` | Meaning |
|---|---|---|
| 200 | | `{ "ok": true }`; in mock mode also `"mock": true` (nothing was emailed) |
| 200 | | Honeypot filled: looks like success, nothing is sent |
| 400 | `validation` | bad JSON/types/lengths; `fieldErrors` has `name`/`email`/`message` |
| 400 | `too_fast` | submitted under 3 s after token issue (token not consumed; retry) |
| 400 | `token_expired` / `bad_token` | token too old / missing / forged: nothing was processed; fetch a new one and retry |
| 400 | `token_used` | this token was already consumed by a send; do not retry with it |
| 403 | `forbidden_origin` | cross-origin not allowed |
| 405 | `method_not_allowed` | only GET, POST, OPTIONS; `Allow` header set |
| 408 | `request_timeout` | body did not arrive within 5 s (connection closed) |
| 413 | `payload_too_large` | body over 8 KB |
| 415 | `unsupported_media_type` | not `application/json` |
| 429 | `rate_limited` | `Retry-After` header and `retryAfterSec` |
| 500 | `server` | email provider failed or unexpected error (no details leaked; the token is released so the visitor can retry) |

**Single-use tokens.** A token is claimed synchronously when a request passes validation, so parallel requests with one token deliver at most one email *per serverless instance* (tested: 8 parallel -> 1 email). Across instances it is best effort **unless Upstash is configured**, in which case the claim is also stored durably (`SET key NX EX`, key is a hash of the token, 2 h). If Upstash is down the check falls back to memory only.

**Limits per IP:** 5 sent messages per hour, 30 POST attempts per 10 minutes. These are in-memory per serverless instance (best effort). With Upstash configured the 5-per-hour limit is also enforced durably (a keyed hash of the IP is kept for 1 hour, then expires). Without Upstash a determined spammer can get a few more through; the honeypot, time-trap and Resend's own limits remain.

**Client IP / proxies.** The IP comes from `x-forwarded-for`, which Vercel sets itself and clients cannot forge. If you put another proxy in front of Vercel (e.g. Cloudflare), either every visitor looks like one of a few edge IPs (real people get rate limited) or the header becomes spoofable. Do not do that without changing `clientIp()` to use the proxy's trusted header. Running `api/_dev/server.mjs` directly on a public port is also spoofable; it is for local use only.

### What the UI should do with `sendContact` results (`src/lib/api.ts`)

| Result | UI behaviour |
|---|---|
| `{ok:true}` | show thanks (also for `mock:true`; that flag is only informative) |
| `code:'validation'` | show inline errors from `fieldErrors` (or `message` if none); let the visitor edit and resend |
| `code:'rate_limited'` | show `message` (and `retryAfterSec` if present); do not offer immediate retry; show the mailto address |
| `code:'network'` or `code:'server'` | show the mailto fallback **risheeknawka@gmail.com** with the message text kept so nothing is lost |

`sendContact` allows only one send at a time (a second call while pending returns the same promise) and only auto-retries with a fresh token when the server says it processed nothing (`too_fast`, `token_expired`, `bad_token`), never after `token_used`. Still disable the Send button while sending. Note `forbidden_origin` surfaces as `server`.

### `POST /api/hit`
Silent visit recording. Optional body (JSON or text/plain, max 1 KB): `{ "mode": "gate" | "story" | "index" }`. Always `204`, even for bots, repeats or missing storage.

Stores only counters: `hits:total`, `hits:day:YYYY-MM-DD` (UTC), `hits:mode:<mode>`. No cookies, no IP, no user-agent, no personal data. Ignored: obviously-bot user agents (not stored), and repeat hits from the same visitor within 30 s (de-duplicated with a salted hash held in memory only, never persisted). Without `UPSTASH_*` variables it does nothing. **The numbers are never shown on the site.**

### `GET /api/stats`
For Risheek only. Header `Authorization: Bearer <STATS_TOKEN>`.

`200` `{ ok, total, last30DaysTotal, last30Days: [{date, count}] (oldest first), byMode: {gate, story, index}, note }`.
`404` if `STATS_TOKEN` is not set **or is shorter than 32 characters** (treated as unset, so a weak token can never be used); `401` for a missing/wrong token; `429` (with `Retry-After`) after more than 10 wrong attempts from one IP in 10 minutes (the right token is also refused while blocked); `503 storage_unavailable` if Upstash is not configured or down.

Windows PowerShell (works verbatim; replace the two placeholders):

```powershell
Invoke-RestMethod -Uri https://YOUR-SITE.vercel.app/api/stats -Headers @{ Authorization = 'Bearer YOUR_STATS_TOKEN' }
```

In PowerShell `curl` is NOT curl (it is an alias of Invoke-WebRequest and fails with "Cannot bind parameter Headers"). Use `curl.exe` if you prefer curl: `curl.exe -H "Authorization: Bearer YOUR_STATS_TOKEN" https://YOUR-SITE.vercel.app/api/stats`. macOS/Linux/bash: `curl -H "Authorization: Bearer YOUR_STATS_TOKEN" https://YOUR-SITE.vercel.app/api/stats`.

## Environment variables (names only; set in Vercel, never commit)

| Name | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | **REQUIRED, or messages are silently discarded (mock mode)** | Resend API key |
| `CONTACT_TO` | no | Recipient. Default `risheeknawka@gmail.com`. With the test sender it must equal your Resend signup email (see warning above) |
| `CONTACT_FROM` | no | Sender, e.g. `Portfolio <contact@yourdomain.com>`. Default `Portfolio <onboarding@resend.dev>` (Resend's test sender) |
| `CONTACT_SIGNING_SECRET` | recommended | Long random string for the time-trap tokens. If unset, derived from `RESEND_API_KEY` |
| `UPSTASH_REDIS_REST_URL` | for counters | From the Upstash database page |
| `UPSTASH_REDIS_REST_TOKEN` | for counters | From the Upstash database page |
| `STATS_TOKEN` | to read stats | **At least 32 random characters** (shorter = endpoint disabled) |
| `ALLOWED_ORIGINS` | no | Extra allowed origins, comma-separated |
| `RESEND_API_URL`, `BODY_TIMEOUT_MS`, `PRELOAD_BODY` | no | Tests/dev only; do not set in production |

Generate a cryptographically secure secret in Windows PowerShell (prints 64 hex characters; run it once per secret):

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

## Setup for Risheek (no backend experience needed)

1. **Resend (email).** Go to resend.com and sign up **with risheeknawka@gmail.com**. Open *API Keys*, click *Create API Key* (permission: *Sending access*), copy it.
   - Quick start: leave `CONTACT_FROM` and `CONTACT_TO` unset. Resend's test sender can deliver only to your own signup address, which is exactly where you want messages.
   - Nicer sender (optional): under *Domains* add a domain you own, add the DNS records Resend shows, wait for "Verified", then set `CONTACT_FROM` to `Portfolio <contact@yourdomain.com>`.
2. **Upstash (visit counter, optional).** Sign up at upstash.com, create a Redis database (free tier), copy *REST URL* and *REST Token* from its page.
3. **Make two secrets** with the PowerShell line above: one for `CONTACT_SIGNING_SECRET`, one for `STATS_TOKEN`.
4. **Vercel.** Project > *Settings* > *Environment Variables*. Add the names from the table with their values (tick Production, and Preview if you want). Save.
5. **Redeploy.** *Deployments* > latest > *Redeploy* (variables only apply to new deployments).

## Before launch checklist

- [ ] `RESEND_API_KEY` is set in the **Production** environment and the site was redeployed after setting it.
- [ ] `CONTACT_TO` is unset (or equals the Resend signup email) while using the test sender.
- [ ] Send a **real test message** through the live site form (or from PowerShell, as below). Confirm it arrives in risheeknawka@gmail.com (check Spam) and that Reply goes to the address you typed. If the page said "sent" but nothing arrived, open Vercel > project > *Logs* and look for `[contact:mock]` (key missing) or `provider_error` (see warnings above).
- [ ] `STATS_TOKEN` is 32+ random characters; after a few visits run the stats command above and check `total` moves.
- [ ] `vercel.json` has no catch-all rewrite that captures `/api/*` (see below). Check the live API in PowerShell (replace the site):

```powershell
$site = 'https://YOUR-SITE.vercel.app'
(Invoke-WebRequest -Method Post -Uri "$site/api/hit" -UseBasicParsing).StatusCode      # expect 204
(Invoke-RestMethod "$site/api/contact").token                                          # expect a long token
```
- [ ] `.env*` files are in `.gitignore` and nothing secret was committed.

Sending a test message from PowerShell (the token must be at least 3 s old, hence the sleep):

```powershell
$site = 'https://YOUR-SITE.vercel.app'
$t = (Invoke-RestMethod "$site/api/contact").token
Start-Sleep 4
$body = @{ name = 'Launch Test'; email = 'you@example.com'; message = 'Hello, this is a launch test message.'; website = ''; token = $t } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$site/api/contact" -ContentType 'application/json' -Body $body
```

Expect `ok : True`. If it also shows `mock : True`, nothing was emailed (RESEND_API_KEY missing).

## Local development (no credentials needed)

```
node api/_dev/server.mjs          # API on http://127.0.0.1:8787, contact runs in mock mode
node api/_dev/test.mjs            # full test run (starts its own servers and fakes, ~50 s)
npx tsc -p api/tsconfig.json      # type-check the API (the root tsconfig does not include api/)
```

Vite proxy (add to `vite.config.ts`, integrator):

```ts
server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
```
Do not set `changeOrigin: true` (the same-origin check compares `Origin` with `Host`). `recordVisit` never sends in dev.

## Deployment notes (for the integrator)

- Runtime: plain Node `(req, res)` handlers, zero dependencies. `api/_lib` and `api/_dev` are not routes (underscore prefix). If Vercel already parsed the body (`req.body` set), the handlers use it; otherwise they read the stream with a 5 s timeout.
- Suggested `vercel.json` (merge with anything existing; the SPA fallback must exclude `/api`):

```json
{
  "functions": { "api/*.ts": { "maxDuration": 20 } },
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```
  `maxDuration` must stay well above the 5 s body timeout, otherwise Vercel could kill a stalled request before the app answers 408.
  (If no SPA rewrites are needed, omit `rewrites` entirely. Never use `"source": "/(.*)"`.)
- Not yet verified on a real Vercel deployment: `.js`-extension imports in the TS build, and `api/tsconfig.json` being picked up by Vercel's compiler. Run a Preview deploy and the checklist commands first.
