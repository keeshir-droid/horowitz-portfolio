# Verification: backend contact form + visit counter

Verifier: backend-verifier. Date: 2026-10-11. Node v24.13.1, Windows 11.
Scope: `api/**`, `src/lib/api.ts`, `docs/api.md`. (`src/story/engine/**` not examined.)
Method: re-ran everything; wrote my own attack scripts in the OS temp folder (not in the repo) that start the real dev server (`api/_dev/server.mjs`) on local ports 8801 to 8804 and 8811, with local fakes standing in for Resend and Upstash (ports 9101 to 9104). No external network request was made. All servers were stopped.

## Checklist

### 1. Builder's claims re-run: PASS
- `node api/_dev/test.mjs` -> `55 passed, 0 failed` (I ran it; matches the claim).
- `npx tsc -p api/tsconfig.json` -> exit 0, no output.
- `npm run build` (`tsc -b && vite build`) -> success; main chunk 76.41 kB gzip, Opening chunk 271 kB (lazy). Only the pre-existing chunk-size warning.
- `npx oxlint` -> 0 warnings in `api/` or `src/lib/`. All 8 warnings are pre-existing elsewhere (`src/gate/Opening.tsx` x7 purity/immutability/refs, `src/story/scenes/_demo/index.tsx` x1 fast-refresh). Note: the command also scanned the user's home directory (the repo's git root is `C:/Users/rishe`, so oxlint walks upward/around) and printed "Permission denied" noise. Not a backend defect.

### 2. My own attack tests: mostly PASS, 3 findings (see defects D1, D2, D6, D7)
Evidence (from `attack.out`, abbreviated):

| Attack | Result |
|---|---|
| CRLF in name, email, message | email with CRLF -> `400 validation`; CRLF in name/message is collapsed/neutralised. `to` is a fixed single recipient, subject/reply_to contain no CR/LF. PASS |
| RTL override (U+202E), zero-width (U+200B/D, FEFF) | stripped from the outgoing text and subject. PASS |
| Emoji, 4-byte chars, 2000-char single token (no spaces) | accepted, sent as text only. All-whitespace / all-zero-width name and message -> 400. PASS |
| Lone surrogate `\ud800` in name | accepted and forwarded (`subject="...A\ud800"`). Harmless to the server; the provider may reject it. Nice-to-have |
| 1500 emoji (3000 UTF-16 units) message | `400`: limits count UTF-16 units, not characters. Docs say "chars". Nice-to-have |
| HTML / `<script>` payload | sent only in the `text` field; no `html` key. PASS |
| Email abuse: `a@b.co>,bcc@evil.com`, `"a b"@x.com`, `a@@b.co`, `a@[1.2.3.4]`, `x@evil.com,y@evil.com`, newline Bcc | all 400. `a@b..co` and `a@b.co.` accepted (sent as reply_to). Nice-to-have |
| Duplicate JSON keys | last wins (`name` -> "Bob"), 200. Harmless |
| `__proto__` / `constructor.prototype` keys | `400 Unexpected field`; server unaffected. PASS |
| 200 KB nested array, 1500-deep object | `413` before parsing; 6 KB nested array -> `400` (no crash/stack overflow). PASS |
| null / string / empty / wrong types | 400 with sane messages. PASS |
| 9 KB body with Content-Length | 413. PASS |
| Chunked, no Content-Length, 10 KB streamed | `413`; and an endless chunk stream was cut after 9000 bytes with the connection closed. PASS |
| Slow-loris (headers + partial body, then silence) | NOT cut off: no response and connection still open after 20 s. There is no body-read timeout in `readBody`; only Node's own `requestTimeout` (300 s default) applies. On Vercel the function max-duration bounds it. Nice-to-have (D8) |
| Method override header (`X-HTTP-Method-Override`) | ignored (GET stays GET; POST /api/stats still 405). PASS |
| PUT/DELETE/PATCH/HEAD | 405 with `Allow: GET, POST, OPTIONS`. PASS |
| Origin `null`, `https://localhost.evil.com`, `https://evil.com/?localhost`, `http://127.0.0.1:8801.evil.com`, `not a url` | all 403. PASS. Preflight from evil.com -> 403. |
| With `VERCEL=1`: Origin `http://localhost:5173`, evil, null | all 403 (localhost allowance disappears on Vercel). PASS |
| `ALLOWED_ORIGINS=https://good.com/` | `https://good.com` -> 200 with matching ACAO + `Vary: Origin`; `https://good.com.evil.com` -> 403. PASS |
| Missing Origin with `Sec-Fetch-Site: cross-site` + evil Referer | 200 (server only inspects Origin). Acceptable: browsers always send Origin on cross-site POST; non-browser clients can't be stopped by CORS anyway. Cross-site GET token fetch is harmless. |
| Same XFF: 12 attempts | 5 sent, 7 `429`. PASS |
| Rotating `X-Forwarded-For` per request on the dev server | 12 of 12 sent, 0 limited: limiter fully bypassed when the client controls XFF. See item 3 / D5 for Vercel |
| Token: flip last char, truncate, altered timestamp, empty sig, 4 parts, missing | all `bad_token`. PASS |
| Token from a server with a different secret | `bad_token`. PASS |
| Token replay (sequential) | second use -> `bad_token`. PASS |
| Token not IP-bound | token fetched from one IP, used from another -> 200. By design; documented nowhere. Info |
| Time-trap: post at 2.8 s | `too_fast`; same token at 3.2 s -> 200 (too_fast does not burn token). PASS |
| Honeypot: `""`, `"   "`, `"\t\n"`, `null` | treated as empty and sent normally (by design). |
| Honeypot: `["x"]`, `[]`, `{a:1}`, `0`, `false`, `"\u200B"`, `"http://spam"` | `200 {"ok":true}`, nothing sent. PASS |
| **8 concurrent POSTs with ONE token** | **5 mails delivered** (3 rate-limited). Token single-use is NOT enforced under concurrency. **FAIL (D1)** |
| 35 junk POSTs from one IP | 30x `400`, 5x `429`. Matches docs. PASS |
| 50 token GETs in a row | all served; `GET /api/contact` has no limit (cheap HMAC; nice-to-have) |

### 3. Security code review: PASS with should-fix items
- **Secrets in repo/git:** grep of `api/ src/ docs/` for key patterns (`re_…`, `sk_`, `AKIA`, upstash URLs, long bearer strings, `secret = '…'`) found nothing; no `.env*` files exist. Only hit is the word "password manager" in docs. PASS. Caveat: the git root is `C:/Users/rishe` (home directory), so no repository-scoped history exists to inspect; `.gitignore` ignores `*.local` but **not `.env`** (D9).
- **Error leaks:** all 5xx paths return generic text; logs print only `err.name` and provider HTTP status; `/api/stats` returns 404 when unset. No stack traces seen in any response. PASS. Minor: mock mode logs `email_domain` and lengths (no address/message).
- **Timing-safe compare:** token check uses `timingSafeEqual` after an equal-length guard (length of an HMAC is public). Stats compares SHA-256 digests of both strings with `timingSafeEqual`. Both correct. PASS.
- **HMAC secret fallback:** `CONTACT_SIGNING_SECRET` unset -> `sha256("contact-token:"+RESEND_API_KEY)` (not guessable by anyone without the API key); both unset -> random per-process 32 bytes. There is **no guessable default**, so tokens cannot be forged. PASS. Side effect: in mock mode (no Resend key) on Vercel each serverless instance has a different secret, so a token minted by one instance is `bad_token` on another; the client retries once transparently. Real-send mode is stable. Docs call the variable "recommended", which is accurate.
- **/api/hit storage:** read the code: it writes only `hits:total`, `hits:day:<UTC>`, `hits:mode:<whitelisted>`. IP is used only as input to a SHA-256 with a random per-process salt held in an in-memory map for 30 s. UA is used only for the bot regex. Mode is whitelisted (injection attempts `__proto__` and `index\nINCR x` were ignored). PASS.
- **/api/stats reachable without token?** Tried: no header, `Bearer ` (empty), lower-case `bearer`, `Basic`, raw token, token off by one char, double space, `?token=` query -> all 401. With `STATS_TOKEN` unset -> 404 even with an empty Bearer (no empty-string bypass). Only the exact token works (a trailing space is trimmed by Node's HTTP parser, not a bug). PASS. Gap: no throttling and no minimum length (D4).
- **CORS / headers:** JSON responses carry `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. 204s carry `Cache-Control: no-store` (no nosniff, irrelevant). No wildcard ACAO anywhere. Same-origin comparison is on exact `host`, so `localhost.evil.com` style tricks fail. PASS.
- **Rate limit vs XFF spoofing:** the limiter keys on the first `X-Forwarded-For` element. Against the dev server, rotating XFF bypasses it entirely (measured above). On Vercel the platform overwrites `X-Forwarded-For` with the connecting client IP and does not forward client-supplied values, so an attacker cannot rotate or poison it (cannot be tested here: NOT-VERIFIED on Vercel itself). It becomes spoofable (and one person could frame another IP) if any CDN/proxy is placed in front of Vercel (e.g. Cloudflare, then every visitor appears as one or a few edge IPs and the 5/hour limit would block real people). Acceptable on plain Vercel; docs should warn about fronting proxies (D5).
- **Durable limit key:** `rl:contact:<HMAC(ip)>`, 32 hex, 1 h TTL. IP-derived but keyed and unreversible without the secret; documented. Not part of /api/hit.

### 4. Visit-count privacy end-to-end: PASS
Fake Upstash logging every command. Four /api/hit calls with distinct IPs (5.5.5.5, 6.6.6.6, 7.7.7.7, 8.8.8.8), distinct UAs (Chrome, Safari, "UniqueUAString-12345") and hostile modes. Commands received were exclusively `INCR hits:total`, `INCR hits:day:2026-10-11`, `EXPIRE hits:day:… 34560000`, `INCR hits:mode:story`. Regex check for any of the IPs/`Mozilla`/`Chrome`/`Safari`/`UniqueUA`/`127.0.0.1` over the whole command log -> no match; all keys start with `hits:`. Grep of `src/` for consumers (`recordVisit`, `sendContact`, `getContactToken`, `/api/stats`, `last30`): only `src/lib/api.ts` itself (and an unrelated word "total" in `src/story/engine/timeline.ts`, not judged). The count is not exposed to the UI. `api.ts` exports no stats reader. PASS. (Reminder: the `EXPIRE` is re-set on each hit, a sliding 400 days for each day key; harmless.)

### 5. Client wrapper `src/lib/api.ts`: PASS with 1 should-fix (D2)
Ran the real file (with `import.meta.env.DEV` substituted) under Node against the real dev server, a dead port, a hung server, an HTML-returning server and throwing/rejecting fetch stubs. Unhandled rejections: 0.
- Normal send, with and without a token: `{ok:true}`; without a token it waits 3209 ms (token + 3.2 s wait). PASS
- Validation: `{ok:false, code:'validation', fieldErrors:{email:…}}`. PASS
- Honeypot filled: returns `{ok:true}`, 0 mails. PASS
- Dead port: `getContactToken -> null`; `sendContact -> {ok:false, code:'network', message:'Could not reach the server…'}` in ~0 ms. PASS
- Hung server: aborts at 8009 ms/8001 ms -> `network`. PASS
- HTML 200 (Vite SPA fallback when the proxy is missing): `network`. PASS
- Synchronously throwing fetch and rejecting fetch: `network`, no throw. PASS
- `recordVisit`: `DEV=true` -> 0 beacons; PROD five calls (gate, gate, story, index, index) -> exactly 3 beacons (once per mode); beacon is a `Blob` of type `text/plain` to `/api/hit`; server accepted that exact content-type with 204. When `sendBeacon` returns false the fetch fallback runs with `Content-Type: text/plain`, `keepalive:true`, `credentials:'omit'`; throwing `sendBeacon` is swallowed. PASS
- **Double-send:** two concurrent `sendContact` calls with the same token -> both returned `{ok:true}` and **2 emails were delivered**. Cause: the second call gets `bad_token` (replay), and the wrapper's "transparent refresh" fetches a fresh token and resends the identical message. The wrapper has no in-flight guard. **FAIL (D2).**
- Minor: after a failed refresh `too_fast` is reported as code `validation` with no fieldErrors; 403 `forbidden_origin` is reported as code `server` with the server message "Origin not allowed." (the real message the UI would show). Nice-to-have.

### 6. Graceful degradation: PASS
- Server unreachable / hung / HTML fallback -> `sendContact` returns `{ok:false, code:'network', message}` quickly (<=8 s) and `getContactToken` returns `null`; neither throws. The documented contract in `docs/api.md` returns structured errors and says "The site works fully without it". The wrapper's `network` and `server` codes let the UI switch to a "email me at risheeknawka@gmail.com" fallback, **but docs/api.md does not state that UI contract explicitly** (which codes must trigger the mailto fallback). Nice-to-have (D10).
- Env vars missing: no `RESEND_API_KEY` -> mock mode, 200 `{ok:true, mock:true}` and nothing sent (tested on port 8802); the visitor would see success while nothing is emailed. The docs say so but a deploy without the key silently drops every message. Should-fix in docs (D3). No Upstash -> `/api/hit` 204 no-op, `/api/stats` 503, contact falls back to memory limiter (the builder's suite and my runs agree). No `STATS_TOKEN` -> 404.

### 7. Docs accuracy (followed `docs/api.md` literally): PARTIAL, issues listed
- Resend sender restriction: documented correctly (test sender only delivers to the signup address). Missing: if `CONTACT_TO` is set to anything other than that signup address while `CONTACT_FROM` is unset, Resend rejects every send and the visitor sees a generic 500 with no hint why. Add a warning that `CONTACT_TO` must stay unset (or equal the signup email) until a domain is verified (D3).
- Mandatory vs optional is muddled: table says `RESEND_API_KEY` "for real email" - without it the form appears to work but sends nothing (mock mode). It should be marked "REQUIRED or messages are silently dropped". `CONTACT_SIGNING_SECRET` "recommended" is fine. `STATS_TOKEN` should state a minimum length (32+ chars) because `/api/stats` is not throttled (D4).
- "Token ... works once" is not strictly true (race, and serverless instances do not share memory) (D1).
- "Limits per IP: 5 sent per hour / 30 POST per 10 minutes": verified. "Message 10-2000 chars": actually UTF-16 code units (emoji count 2).
- Step 6 curl for stats needs `STATS_TOKEN` and Upstash configured; says so implicitly. Fine.
- Missing: `vercel.json` must not contain a catch-all SPA rewrite that captures `/api/*`; the integrator needs this warning. The Vite proxy snippet is not yet applied (integrator task).
- Step 4 says "tick Production, and Preview if you want": fine. Step 5 redeploy: correct.

### 8. Deployment risk review: NOT-VERIFIED (cannot be tested here)
- `.js` extension relative imports in `.ts`: `package.json` has `"type": "module"`, so the API files are ESM and TypeScript `nodenext` requires the `.js` specifiers the builder used; this is the correct form and `tsc -p api/tsconfig.json` passes. Vercel's `@vercel/node` compiles `api/*.ts` with the project's TypeScript; ESM + `.js` specifiers is the documented working pattern. Residual risks: (a) `api/tsconfig.json` (nodenext, `erasableSyntaxOnly`, `verbatimModuleSyntax`) may be picked up by Vercel's compiler; a TypeScript version mismatch (project uses `~6.0.2`) could fail the function build; (b) importing `./_lib/*.js` relies on Vercel tracing the files (it does via nft).
- `_lib` / `_dev` as routes: Vercel does not expose files or folders prefixed with `_` under `api/` as routes (documented behaviour), so `api/_dev/server.mjs` and `test.mjs` are not served. They could still be uploaded in the deployment bundle; harmless (no secrets).
- Body pre-consumption: `@vercel/node`'s request helpers define `req.body` lazily (parsed only if `req.body` is read), so the raw-stream read in `readBody` should work, but I could not confirm this and I could not test it. If the runtime had consumed the body, the contact POST would hang until function timeout. Current code has no body-read timeout, which would turn that failure mode into a hang rather than an error.
- Recommendation for Risheek (a 5-minute check before launch): run `npx vercel dev` (or deploy a Preview) and `curl` once: `curl -i https://<preview>/api/contact` then POST using the token (curl with `-H "Content-Type: application/json"` after 4 s, with `RESEND_API_KEY` unset so it stays in mock mode and expect `{"ok":true,"mock":true}`), and `curl -i -X POST https://<preview>/api/hit` (expect 204). Recommended code changes for the builder: (1) in `readBody`, if `req.body` is already a string/Buffer/object use it instead of reading the stream; (2) add a body-read timeout (~5 s -> 408); (3) optionally add `"functions": {"api/*.ts": {"maxDuration": 10}}` in `vercel.json` (integrator) to bound hung requests.

## Defects (prioritised)

No blockers.

### Should-fix
- **D1 (security control): contact token is not single-use under concurrency; also not shared across instances.** `checkToken` and `markUsed` are separated by `await durableLimited(...)`, so parallel requests all pass `checkToken`. Repro: `GET /api/contact`, wait 3.1 s, fire 8 simultaneous POSTs with the same token -> 5 emails delivered, 3 `429` (bounded only by the 5/hour per-IP limit). Because `GET /api/contact` is unthrottled and anyone can mint tokens, the token mainly serves as the 3 s time-trap, but the docs claim it "works once". Fix: call `markUsed(token)` synchronously straight after `checkToken` returns `ok` (before any `await`), and un-mark on validation failures only if desired. Document that replay protection is per serverless instance.
- **D2 (functional): double submit sends the message twice.** Repro: `Promise.all([sendContact({...,token}), sendContact({...,token})])` -> both `{ok:true}`, 2 emails. The second call hits `bad_token`, and the wrapper's auto-refresh retries with a new token and resends. Fix in `src/lib/api.ts`: add an in-flight guard (return the same promise or `{ok:false, code:'server'}` while a send is pending) and/or only auto-retry on `too_fast`/`expired`, not on a token that may have been consumed by this same message. The UI should also disable the button while sending.
- **D3 (docs, can silently lose messages): missing-key and sender pitfalls.** With no `RESEND_API_KEY` the API returns success with `mock:true` and sends nothing; the docs should say prominently "REQUIRED, otherwise all messages are discarded". Also warn: do not set `CONTACT_TO` to a different address than the Resend signup email while using `onboarding@resend.dev` (every send will fail with 500).
- **D4 (security hardening): `/api/stats` has no throttling and the docs allow any "long random string".** An attacker can try tokens at network speed. A 32+ char random token makes this infeasible; docs should require it ("at least 32 random characters") and the code could reject startup values under that length or add the same limiter. Rated should-fix because Risheek is non-technical and may choose a short word.

### Nice-to-have
- **D5:** docs should note the XFF assumption: on plain Vercel it is overwritten and safe; behind Cloudflare or another proxy the per-IP limiter either collapses to one shared IP (real visitors blocked after 5 messages/hour) or becomes spoofable. Against a directly reachable server (e.g. `node api/_dev/server.mjs`), rotating XFF defeats the limiter entirely (12/12 sent in test).
- **D6:** email regex accepts `a@b..co` and `a@b.co.`; reject empty labels / trailing dot (the provider may reject, giving the visitor a 500).
- **D7:** unpaired surrogate in name/message is forwarded as-is; normalise with `toWellFormed()`. Limit counts UTF-16 units (1500 emoji rejected); say "characters (UTF-16)" in docs or count code points.
- **D8:** no body-read timeout in `readBody` (slow-loris partial body held the connection open >20 s with no response; Node's default `requestTimeout` is 300 s). Bounded on Vercel by max duration; add a ~5 s timeout returning 408.
- **D9:** `.gitignore` has `*.local` but not `.env`; add `.env` and `.env.*`. Also the repo root is the user's home directory, so scope any future `git add` carefully.
- **D10:** docs should list which `sendContact` result codes the UI must treat as "show the mailto address" (`network`, `server`, `rate_limited` after the message), and that `forbidden_origin` surfaces as code `server` with the message "Origin not allowed."; `too_fast` surfaces as `validation` without fieldErrors.
- **D11:** `GET /api/contact` is unthrottled (50 tokens issued in a row); negligible cost but consider a loose limiter.
- **D12:** deployment items under checklist 8 are NOT-VERIFIED; run the `vercel dev`/preview check before launch.


---
(Round 1 ended with RESULT: FAIL; its final line is superseded by the Round 2 result at the bottom of this file.)

# Round 2 (re-verification after builder fix round 1)

Re-run on 2026-10-11 by backend-verifier. Same method: own scripts in the OS temp folder (`attack2.mjs`, `client.mjs`, `round2.mjs`), local dev servers on ports 8801-8804, 8811, 8821-8825 and fakes on 9101-9111 (no external requests). The fake Upstash was made stateful (SET NX returns `OK` then `null`, DEL frees the key), like the real one. All servers stopped.

## R2-1. Builder's claims re-run: PASS
- `node api/_dev/test.mjs` -> `76 passed, 0 failed` (I ran it).
- `npx tsc -p api/tsconfig.json` -> exit 0. `npm run build` -> success, main chunk 76.41 kB gzip (unchanged). `npx oxlint` -> 0 warnings in `api/` or `src/lib/` (only the old Opening/_demo warnings).

## R2-2. Round 1 defects re-tested

| ID | Round 1 defect | Round 2 evidence | Verdict |
|---|---|---|---|
| D1 | token not single-use under concurrency | 8 parallel POSTs, one token -> `200, 400x7 token_used`, **mails=1**. 4 parallel posts from 3 different spoofed IPs -> `200, token_used x3`, mails=1, in memory-only AND Upstash-durable (SET NX) mode | FIXED |
| D2 | double `sendContact` delivers twice | real `src/lib/api.ts`: two concurrent calls with the same token -> `[{ok:true},{ok:true}]`, **mails delivered=1**. Forged-token transparent refresh still works (1 mail) | FIXED (but see D13) |
| D3 | docs on mock mode / Resend sender | IMPORTANT section, env-table "REQUIRED" wording, CONTACT_TO warning and Before-launch checklist present and accurate. Server log hints exist (status 401/403/422 hints; no provider body logged) | FIXED (see D14 for a new doc trap) |
| D4 | stats unthrottled / weak token | `STATS_TOKEN='short'` with matching bearer -> **404**. 12 wrong guesses from one IP -> 11x 401 then **429**; the right token while blocked -> 429 | FIXED (spoof note below) |
| D5 | XFF docs | "Client IP / proxies" paragraph present and correct | FIXED |
| D6 | email validation | `a@b..co`, `a@b.co.`, `a@b.c`, newline-Bcc, comma lists, `@@` -> 400 | FIXED |
| D7 | lone surrogate / code points | `A\ud800` -> sent as `A`; 1500-emoji message -> 200 (counted by code point) | FIXED |
| D8 | no body timeout | stalled body -> `408 request_timeout` after ~11 s, server healthy afterwards. Slow-but-legit client (20 bytes, 5 s pause, rest) -> `200 OK` | FIXED (see D15) |
| D9 | `.gitignore` lacks `.env` | not re-checked (integrator scope; it is in the Before-launch checklist) | not re-verified |
| D10 | UI contract | "What the UI should do with sendContact results" table present; `forbidden_origin` -> `server` documented | FIXED |
| D11 | GET /api/contact unthrottled | 63 GETs, one IP -> 60x 200, 3x 429 | FIXED |
| deploy | body pre-consumed by platform | `PRELOAD_BODY=1` dev server (body consumed before handler, `req.body` populated) -> contact POST `200`, mails=1. Real Vercel behaviour still NOT-VERIFIED | PARTIAL (simulation only) |

Round 1 attack battery re-run in full (CRLF, RTL/zero-width, `__proto__`/`constructor`, nested JSON, oversized, chunked/endless stream, origins incl. `null`/`localhost.evil.com`, `VERCEL=1`, `ALLOWED_ORIGINS`, method override, honeypot variants, token forgery/truncation/other-secret, time-trap 2.8 s vs 3.2 s, hit privacy): all behaviours unchanged except the intended ones. Token replay now returns `token_used` (documented) instead of `bad_token`. `/api/hit` Upstash commands still contain only `hits:*` keys and no IP/UA string; the contact send now also issues `SET ct:<sha256 of token> NX EX 7200` (a hash of a random token, no personal data). Slow-loris is now answered `408` after 10 s.

## R2-3. New attacks against the fixes

- **Token release abused for unlimited sends (memory and Upstash modes): PASS.** Provider forced to fail, one token, one IP, 12 sequential POSTs -> `500 x5` then `429 x7`; **the provider was called exactly 5 times**. The send limit counts every attempt that reaches the provider, so release-on-failure does not bypass the per-IP limit. After the provider recovered, the same IP stayed `429`; the same (released) token from a second IP delivered exactly **one** mail and then returned `token_used`. A released token can be used once more for one delivery, never repeatedly.
- **Time trap vs release: PASS.** A fresh token used immediately -> `too_fast`; the same token at 3.1 s -> 200. Release only returns an old token, never a young one.
- **Race between release and the next request: PASS.** Provider slow (300 ms) and failing once; 8 parallel then 8 parallel with one token -> batch1 `500, token_used x7`, batch2 `200, token_used x7`; providerCalls=2, **mails=1** (memory and Upstash modes).
- **Rate-limit release: PASS.** 7 tokens from one IP -> 5x 200 then 2x 429, mails=5; a 429'd token retried from the same IP -> 429.
- **In-flight guard with DIFFERENT input: finding D13.** Two concurrent `sendContact` calls (Alice vs Bob) both returned `{ok:true}`, but **only Alice's email was delivered**; Bob's message was silently dropped while reporting success. The guard clears afterwards (a sequential third call worked). Reachable only if the UI lets a second, different submission start while one is pending (the docs tell the UI to disable the button; a no-token send takes at least 3.2 s so the window is real). Not a security issue but a correctness trap. Rated nice-to-have because the documented UI contract prevents it. Small fix: when `inflight` exists and the new input differs, return an `{ok:false}` result ("a message is already being sent") instead of the other caller's result.
- **Stats throttle vs XFF rotation: PASS on Vercel, bypassable on a directly exposed server.** Against the dev server, 15 wrong guesses with rotating spoofed `X-Forwarded-For` all returned 401 (throttle bypassed). On Vercel the platform overwrites XFF with the real client IP, so rotation is not possible. The 10-attempt window is also per serverless instance (memory), so an attacker spreading over instances gets about 10 x instances guesses. Against a 32+ random-character token (2^128 space) neither matters, and a short token is refused outright. Side effect: a shared office or NAT IP that fails 10 times locks Risheek out for 10 minutes (harmless).
- **Email validation false positives: PASS.** Corpus of 49 addresses (plus-addressing, subdomains, long TLDs `.technology/.museum`, IDN `bücher.example` and punycode, unicode locals `jörg@`, `用户@例子.广告`, `почта@россия.рф`, apostrophes, the RFC special characters `!#$%&*/=?^`{|}~`, 64-char local, 63-char label, digit-only, leading/trailing spaces, uppercase). **48 of 49 accepted. The only rejection is a quoted local part (`"john doe"@example.com`)**, which real visitors essentially never use; acceptable. Note: whitespace inside an address is silently removed (`john @example.com` becomes `john@example.com`). No real-person false positives found.
- **Body timeout correctness: PASS.** The 10 s limit is total time to receive the body, not idle time, but a client that paused 5 s mid-body still succeeded. See D15 for the interaction with `maxDuration`.

## R2-4. Docs re-read literally as a non-technical Windows user

Accurate: the IMPORTANT section; the Resend sender restriction; the env table (RESEND_API_KEY marked REQUIRED); token and limit semantics match what I measured (5/h, 30/10 min, 60 token GETs/10 min, 10 stats failures/10 min, 408 at 10 s, 32-char STATS_TOKEN); the error-code table matches behaviour (`token_used`, `token_expired`, `bad_token`, `request_timeout`).

Problems found:
- **D14 (should-fix, docs): the `curl` commands do not work in Windows PowerShell.** The Before-launch checklist and the stats section tell Risheek to run `curl -H "Authorization: Bearer ..."`. In Windows PowerShell 5.1 (his OS; I ran it) `curl` is an alias for `Invoke-WebRequest`, and `curl -H "Authorization: Bearer x" http://127.0.0.1:1/` fails with `Cannot bind parameter 'Headers'. Cannot convert the "Authorization: Bearer x" value of type "System.String" to type "System.Collections.IDictionary"`. A non-technical person will conclude stats are broken. Fix: write `curl.exe` (ships with Windows 10/11), or give `Invoke-RestMethod -Headers @{Authorization='Bearer YOUR_TOKEN'} https://YOUR-SITE.vercel.app/api/stats`, and `curl.exe -i -X POST https://YOUR-SITE/api/hit` for the hit check.
- **D16 (nice-to-have):** the secret generator one-liner uses `Get-Random`, which is not a cryptographic RNG. Acceptable in practice for a throttled 24-byte token (I confirmed it runs and prints 48 hex characters), but a CSPRNG form that also works on PowerShell 5.1 is easy: `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join ''`.
- The old "Test" setup step was folded into the checklist; the order (steps 1 to 5, then checklist) is clear.

## R2-5. Suggested `vercel.json` review: NOT-VERIFIED on Vercel
No `vercel.json` exists in the repo yet; this reviews the snippet in docs/api.md.
- `"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]`: the standard Vercel negative-lookahead pattern. It sends non-`/api/` paths to the SPA; Vercel serves real static files and functions before rewrites, so assets and `/api/*` are not captured. A bare `/api` (no slash) would be rewritten to index.html, which is harmless. The docs correctly warn against `/(.*)`.
- `"functions": { "api/*.ts": { "maxDuration": 10 } }`: valid and the glob matches the three handlers. `api/_lib` and `api/_dev` are not routes and not matched by `api/*.ts`; `_dev` is never imported by the handlers (harmless, holds no secrets).
- **D15 (nice-to-have):** the 10 s `maxDuration` equals the 10 s body timeout, so on Vercel the platform kills a stalled request before the app can answer `408`. The worst legitimate path is longer than 10 s as well (body up to 10 s, Upstash calls up to 4 s each, provider up to 8 s), so a slow provider could finish after the platform killed the function: the email may be sent while the visitor sees a network error and may resend, giving a duplicate. Suggest `BODY_TIMEOUT_MS` default about 5 s and `maxDuration` 15 to 20.
- Still NOT-VERIFIED: `.js`-extension imports under Vercel's TS build, `api/tsconfig.json` being picked up, and real Vercel body handling. Do the Preview deploy plus the checklist requests.

## Defect list after Round 2

No blockers. No open security defects: D1, D2, D4, D6, D7, D8, D11 are verified fixed by test.

### Should-fix
- **D14:** replace `curl` with `curl.exe` (or `Invoke-RestMethod`) in docs/api.md (stats section and Before-launch checklist). Repro: in Windows PowerShell 5.1 run the documented `curl -H "Authorization: Bearer x" http://127.0.0.1:1/` and see the parameter-binding error.

### Nice-to-have
- **D13:** the shared in-flight promise in `sendContact` returns the first caller's result to a second caller with different input (message silently dropped, `ok:true`). Repro: `Promise.all([sendContact(A), sendContact(B)])` -> both `ok:true`, only A emailed.
- **D15:** `maxDuration` 10 equals the body timeout 10 and is shorter than the worst-case path.
- **D16:** use a CSPRNG in the PowerShell secret generator.
- Quoted-local emails are rejected (acceptable; noted only).
- Vercel-only items remain NOT-VERIFIED (D12).



---
(Round 2's final line is superseded by the Round 3 result at the bottom of this file.)

# Round 3 (scoped final re-check after fix round 2)

2026-10-11, backend-verifier. Scripts in the OS temp folder (`round3.mjs`, `r3srv.mjs`); local dev servers on ports 8830 and 8841 with local fakes on 9131 and 9141; no external requests; everything stopped.

## R3-1. Suite and builds: PASS
- `node api/_dev/test.mjs` -> `77 passed, 0 failed`. `npx tsc -p api/tsconfig.json` -> exit 0. `npm run build` -> success. `npx oxlint` -> 0 warnings in `api/` or `src/lib/`.

## R3-2. docs/api.md followed literally in Windows PowerShell 5.1: PASS
Fresh `powershell.exe` 5.1.26100 session, each documented command pasted as written (only the `$site` placeholder replaced with `http://127.0.0.1:8830`; a fake Upstash/Resend were behind the local server):

| Documented command | Result |
|---|---|
| Secret generator (RandomNumberGenerator one-liner) | printed 64 hex characters. Works verbatim |
| `(Invoke-WebRequest -Method Post -Uri "$site/api/hit" -UseBasicParsing).StatusCode` | `204` |
| `(Invoke-RestMethod "$site/api/contact").token` | a token string |
| "Sending a test message" block (`$t = ...; Start-Sleep 4; $body = @{...} \| ConvertTo-Json; Invoke-RestMethod -Method Post ...`) | printed `ok True`; the fake provider received one email with `reply_to: you@example.com`, subject `Portfolio message from Launch Test`, to `risheeknawka@gmail.com` |
| `Invoke-RestMethod -Uri .../api/stats -Headers @{ Authorization = 'Bearer ...' }` with the right 64-hex token | returned the stats object (`total`, `last30Days`, `byMode`) |
| same with a wrong token | HTTP 401 |
| `curl.exe -H "Authorization: Bearer ..." .../api/stats` | works (same JSON) |
| bare `curl -H ...` | fails with "Cannot bind parameter 'Headers'", exactly as the docs now say it does |

The docs state the alias trap correctly and give `curl.exe`. D14 is fixed. D16 is fixed (CSPRNG, 64 hex characters, runs on 5.1).

## R3-3. D13 with the real `src/lib/api.ts`: PASS
- Two concurrent calls, identical input: `[{ok:true},{ok:true}]`, **1 email**.
- Two concurrent calls, different input (Alice vs Bob): `[{ok:true},{ok:false, code:'validation', message:'A message is already being sent. Please wait a moment.'}]`; only Alice delivered, and Bob's caller gets an explicit refusal, so nothing is silently reported as sent.
- Three concurrent (A, A, B): `ok, ok, validation`, 1 email.
- Sequential send after the first completes (Bob): `{ok:true}`, delivered. After a network failure the guard also clears (next send succeeds).

## R3-4. D15: PASS
- Slow-but-legit client (20 bytes, 4 s pause, rest): `200 OK` (t=4.7 s).
- 6 s stall: `408 Request Timeout` (t=6.7 s).
- Suggested `vercel.json` (`maxDuration` 20, rewrite `/((?!api/).*)`) is consistent with the 5 s body timeout (worst case about 5 s body + 4 s per Upstash call x2 + 8 s provider is about 21 s; only reached if everything is slow at once). Still NOT-VERIFIED on a real Vercel deployment.

## R3-5. Docs re-skim: PASS with two nits
IMPORTANT, env table, setup, Before-launch checklist and deployment notes are accurate (5 s body timeout appears consistently in all three places; commands are PowerShell-first). Nits (nice-to-have):
- The UI section says only one send runs at a time but does not state the exact refusal a second, different call receives (`code:'validation'`, no `fieldErrors`, message "A message is already being sent..."); the UI should show `message` for validation results without `fieldErrors`.
- Vercel-only items (`.js` imports in Vercel's TS build, `api/tsconfig.json` pickup, real body handling) remain NOT-VERIFIED; the docs say so and prescribe the Preview check.

## Remaining defects
No blockers, no should-fix. Nice-to-have only: the doc nit above; quoted-local emails rejected (acceptable); Vercel deployment checks pending (Preview deploy).

RESULT: PASS
