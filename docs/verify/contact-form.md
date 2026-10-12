# Verification: contact form (Index mode footer)

Verifier: frontend-verifier. Built `dist` previewed on :5500 (proxy to real dev backend :8787, mock mode, no RESEND key) driven with headless Chrome over raw CDP (real Input.dispatchMouse/Key events; Fetch domain used only to stub cases the backend cannot produce). No external API calls (only the page's own Google Fonts link loads). Scripts and screenshots: `%TEMP%\claude\...\scratchpad\fv\` (`shots\`).

## Checklist

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | `npm run build`, `tsc -b` | PASS | Built OK. Main chunk `index-*.js` 248.92 kB (79.01 kB gz); Opening chunk 989 kB (271 kB gz, separate chunk). |
| 1 | `npx oxlint` | PASS (contact files) | Warnings only in `src/story/**`, `src/gate/Opening.tsx` (other agents' files); none in ContactForm / IndexMode / api.ts. |
| 2 | Only talks via `src/lib/api.ts` | PASS | grep for fetch/XMLHttpRequest/sendBeacon outside api.ts: no hits. |
| 2 | Honeypot attributes | PASS | `name=website type=text tabindex=-1 autocomplete=off`, wrapper `aria-hidden=true`, `position:absolute; left:-10000px`, 1px, opacity 0, display:block (not display:none). Absent from AX tree. Tab walk (name, email, message, Send, mailto, GitHub, LinkedIn) skips it. Page scrollWidth == innerWidth. Caveat: password managers cannot be tested here. |
| 2 | Token on mount / fresh after "Send another" | PASS | 1 GET on mount; "Send another" produced exactly 1 new GET. |
| 2 | Result-code table | PASS with defects | See rows below. |
| 2a | validation w/o fieldErrors | PASS | Message shown as status text, text kept, no mailto (per doc). |
| 2b | validation with fieldErrors | PASS | Inline errors, aria-invalid, focus to first invalid field. Real backend: `a@b` passes client regex, server rejects -> inline "Please enter a valid email address." Zero-width padded 10-char message: client counter says 10, server rejects -> inline "Message must be 10 to 2000 characters." |
| 2c | "A message is already being sent" | NOT-VERIFIED (unreachable) | UI guard `sending.current` returns before `sendContact`, so UI can never reach it. Api-level behaviour only reviewed by reading. |
| 2d | rate_limited | PASS (with D5) | Real backend: 6th send -> "try again in about 60 minutes" + mailto link, Send disabled. Stub 120s -> "2 minutes", 45s -> "45 seconds", none -> server message. |
| 2e | network / server -> mailto fallback | PASS | POST fail, 500, 502 non-JSON, 405: "That did not go through. Your message is still here..." + `mailto:risheeknawka@gmail.com`; textarea length kept (30). Both GETs failing (server down) -> same fallback. POST hang -> aborts at 8 s -> fallback. |
| 2f | token_used -> validation | PASS (with D2) | Message shown. |
| 3 | Empty submit | PASS | 3 inline errors, focus on name, summary "Please fix the highlighted fields.", 0 POSTs. |
| 3 | Invalid email (`foo`, `a b@c.de`) | PASS | Inline error, 0 POSTs. |
| 3 | Name 81 chars | PASS | "Name is too long (max 80 characters)", no POST. |
| 3 | Message 9 / 2001 / 2000 / emoji | PASS | 9 -> error; 2001 -> error, counter red; 10 emoji = "10 / 2000"; 2000 emoji = "2000 / 2000" (code points, matches server). Mismatch only for zero-width chars (D8). |
| 3 | Paste 5000 chars | PASS | Not blocked or trimmed (no maxlength); counter "5000 / 2000" red; submit gives inline error, 0 POST. |
| 3 | Success clears, focus moves | PASS | Fields cleared, focus on `.cf-success` (role=status, tabindex -1). |
| 3 | Send another | PASS | Form empty, focus on name, new token. |
| 3 | Double click -> one POST | PASS (1 POST) but FAIL on UX | See D1. |
| 3 | Enter-spam | PASS | 8 rapid Enters in email field -> 1 POST, success. |
| 3 | Time-trap / slow | PASS | Submit < 3 s after token: too_fast then auto-retry, 2 POSTs, success after ~3.2 s, UI shows "Sending..." (disabled button + live "Sending your message...") throughout. No "taking a moment" wording, acceptable. |
| 3 | Submit before token arrives (first GET delayed 6 s) | PASS | Fetches own token, waits 3.2 s, POST with new token, success; UI "Sending...". |
| 3 | GET token fails on mount then submit | PASS | Second GET succeeds, success. |
| 3 | Server killed / unreachable | PASS | Fallback with email, text kept. |
| 4 | Honeypot filled by bot | PASS | UI shows normal success, no honeypot hint in any text; POST carried `website`. Backend did not log an "accepted" line. |
| 4 | XSS | PASS | `<img src=x onerror=alert(1)>` and `<script>` as name/message: no dialog, 0 `img[src=x]`, 0 injected scripts; success text static. |
| 5 | Keyboard-only run | PASS | Tab order name > email > message > Send (honeypot skipped); Space on Send submits; Enter in field submits; Shift+Tab works. |
| 5 | Focus ring | PARTIAL | Inputs/buttons: 3px #ffc857 outline (12.4:1). Footer links (mailto/GitHub/LinkedIn/Instagram) have default `1px auto` ring that is near-black computed (rgb 16,16,16) on a dark page; weak (D6). |
| 5 | Labels / aria | PASS | `label for`/`id` match; aria-invalid + aria-describedby only when error; AX tree: textbox names "YOUR NAME" etc., invalid=true, required, describedby; status live region polite. |
| 5 | Live announcement | PASS | Summary and sending/status text are in `role=status aria-live=polite`; per-field errors announced via focus + describedby. Counter is aria-hidden (SR users get no count; D9). |
| 5 | Focus after non-field error / sending | FAIL | D4. |
| 5 | Contrast (pixel-measured) | PARTIAL | Label 16.87; counter 6.84 / over-limit 8.69; error text 9.58; status 11.21; input text 15.40; Send 12.39; disabled Send 5.02; success h3 15.40, p 6.24; footer links 6.84. No placeholder text exists. **Input border #2a2c4d vs page: ~1.4:1, vs field fill 1.30:1 (needs 3:1, WCAG 1.4.11): D3.** |
| 5 | Tap targets >= 44 | FAIL | Inputs 52, Send 48, Send another 44 OK. Footer links 24px tall, sticky nav links 21px, "Experience/Play the story" 39px (D7). |
| 5 | Reduced motion | NOT-VERIFIED in browser | Source: global `prefers-reduced-motion` rule sets durations to 0.01ms and `scroll-behavior:auto`; form's only motion is a 0.12s hover transform. |
| 5 | Zoom 200% / 400% | PARTIAL | Emulated via viewport 640 (not run) and 320 CSS px (=400% of 1280; run): no overflow, no overlap, form usable (D10 applies). Text-only resize: NOT-VERIFIED. |
| 6 | Responsive 1280x720, 1920x1080, 390x844 (mobile emulation), 320x640 | PASS (overflow/clipping) | scrollWidth == innerWidth in all four; no elements past the right edge; footer fully reachable (Play the story button bottom 764/844 at 390). Screens: `shots/r-*-{top,contact,bottom,errfocus}.png`. |
| 6 | Mobile nav | CONFIRMED | `.index-bar nav` is `display:none` at <=640px (computed). Phone user can only reach the form by scrolling ~15,700px (390px doc height; 17,350 at 320) to the footer; no Contact link or CTA. Recommendation D11 (not implemented). |
| 6 | Sticky bar vs inputs | FAIL (320) | D10. |
| 7 | Index regression | PASS | 5 highlights, 30 cards, 21 dex cells (7 live, "7 / 21 shipped"), Ctrl+K focuses search, search "adobe" -> 1 card, Awards filter -> 8 cards, "see it in the story" -> `#/story`. Footer links: mailto; GitHub, LinkedIn, Instagram `target=_blank rel=noreferrer`, URLs match `entries.ts`. |
| 7 | Content accuracy | PASS | Text comes straight from `entries.ts`/`projects.ts`; no extra claims added by the form or Index; entries with `verify` notes show only their entry text (e.g. "$60 -> ~$16K", Adobe, Gold). Note: highlights present several unverified claims prominently; that is a content decision, not a form defect. |
| 7 | No visit counter | PASS | grep of src: only `recordVisit` (silent beacon in App.tsx, nothing rendered). |
| 8 | Bundle | PASS | Menu+Index main chunk 79.01 kB gz (< 100 kB); contact form added no dependency. |
| 9 | Opening/menu | PASS | `/` renders opening/menu text ("START JOURNEY"...); `/#/index` renders Index. No console errors/exceptions in any run. |

## Defects

### Blocker
None.

### Should-fix
- **D1. Double-click (or slow second click) after success wipes the confirmation.** Success panel replaces the form and "Send another" renders under the cursor. Repro: wait 3.5 s, fill form, click Send then click again at the same spot 100-250 ms later against a fast backend. Timeline: "Message sent" at ~300 ms, back to empty form ~300 ms later; exactly 1 POST was made, but the visitor sees no confirmation. Likelihood depends on network latency (the second click lands on the disabled button while pending). Fix: ignore "Send another" for ~700 ms after success, or position it away from Send, or require focus/keyboard intent.
- **D2. `token_used` is a dead end.** Send stays enabled and resubmits the same token (verified: `["tok1","tok1"]`), repeating the error; the only advice is "reload the page", which loses the typed text. Fix: after `token_used`, fetch a fresh token and keep the text (or disable Send and show the mailto fallback).
- **D3. Field boundaries fail non-text contrast** (border #2a2c4d ~1.4:1 on page, 1.30:1 on fill; 3:1 required). Inputs are faint. Use a lighter border (e.g. ~#6a6d9e or lighter).
- **D4. Focus is lost to `<body>` after a send attempt that errors** (the focused Send button is disabled while sending and focus is never restored; observed `active=BODY` in every non-field error case: validation w/o fieldErrors, rate limit, server, network). Keyboard/SR users lose their place. Fix: use only `aria-disabled` (ignore clicks) or refocus Send / the status message after the response.
- **D10. Sticky bar can cover the focused field on small screens.** At 320x640, an error submit focuses `#cf-name` at top=1.6px while the bar bottom is 82px; the name field is hidden under the bar (`shots/r-320x640-errfocus.png`). No `scroll-margin-top` on inputs. (Keyboard Shift+Tab at 390 was not obscured, 225 vs 67.) Fix: `scroll-margin-top: 96px` on fields/button, and `scrollIntoView` on error focus.
- **D7. Tap targets below 44px:** footer contact links 24px, sticky nav links 21px, story buttons 39px (WCAG 2.5.8 minimum 24 is met; your 44 target is not).
- **D11. No way to the form on phones** (nav hidden <=640px; ~18 screens of scrolling). Recommend keeping a compact "Contact" (or envelope) link/button in the sticky bar at <=640px linking to `#contact`, or a "Say hello" CTA in the hero. (Not implemented.)

### Nice-to-have
- D5. After a rate-limit the Send button stays disabled until reload, even when `retryAfterSec` is short (e.g. 45 s).
- D6. Footer links' focus ring is the browser default and near-invisible on the dark background; give them the same 3px accent outline.
- D8. Counter counts zero-width/control characters the server strips; such a message passes client validation and gets a server inline error (graceful, but counter disagrees).
- D9. Counter is `aria-hidden`; screen reader users get no length feedback until the error.
- "Sending..." never says it may take a few seconds for the 3 s time-trap case (up to ~3.3 s, or 9 s if the token GET fails first).
- Page loads Google Fonts from the network (affects offline/privacy, not the form).

(Round 1 result: FAIL. See Round 2 below.)

---

# Round 2 (re-verification after builder fix round 1)

Same method (built `dist` on :5500, real dev backend in mock mode on :8787, CDP real input events, Fetch stubs only for cases the backend cannot produce; all servers and browsers stopped afterwards). `npm run build` passed this time (main chunk 247.96 kB, 79.40 kB gz). Screens: `scratchpad\fv\shots\r2-*.png`.

## Round 1 defects re-tested

| Defect | Result | Evidence |
|---|---|---|
| D1 double click wipes confirmation | FIXED | Second click 0/100/250/600 ms after the first: 1 POST, success panel stays (focus on "Send another", which has aria-disabled). A deliberate click at 1000 ms resets the form (expected). Clicking "Send another" 200 ms after success is ignored; after ~1 s it works. |
| D2 token_used dead end | FIXED | Stub token_used: text kept, message "This form session was already used, so I refreshed it... press Send again", 2nd GET issued; resubmit POSTs `tok2` (never `tok1` again) and succeeds. Real backend: send, then "Send another", then send again: three distinct tokens across POSTs (the second send used a too_fast retry with a fresh token); no token ever re-POSTed. |
| D3 border contrast | FIXED | Pixel-measured border (110,114,170): 4.22:1 vs page, 3.85:1 vs field fill. Same colour on search input and category chips (4.22). |
| D4 focus lost after errors | FIXED | After validation-no-fieldErrors, server 500, rate limit and token_used the active element stays the Send button (`cf-submit`). While sending, Send has aria-disabled; extra clicks produce no second POST. |
| D10 field under sticky bar (320) | FIXED | 320x640, error submit with name scrolled away: name top 294 px vs bar bottom 79. 390: 161 vs 72. 1280: 110 vs 72. |
| D7 tap targets | PARTIAL, see N2 | Fixed: nav links 44 px, Contact link 66x44 / 59x44, footer links, story buttons, Send, "Send another" (>= 44). Still < 44: 9 category chips (34 px high, 39 to 105 wide) and 30 "see it in the story" buttons (125x20). |
| D11 phone access to the form | FIXED | At 390 and 320 the bar shows "Contact" (44 px high, white) + "Experience the story"; no overlap, no horizontal overflow (scrollW == innerW), wordmark hidden. Real click: scroll lands with heading at top=90 below the bar (72 / 79), focus on `#contact-title`, hash stays `#/index`. |
| Rate-limit re-enable | WORKS | Stub 429 retryAfterSec 5: Send aria-disabled, "Available again in 4 seconds", extra clicks make no POST (1 total); after ~5 s Send re-enabled, message cleared. Real backend 6th send still gives the limit message. |
| Focus rings | FIXED | Computed 3px solid accent on chips, "see it in the story", footer links, nav links, story buttons, highlight cards (card accent colour, 3px). Inputs/Send/again: 3px accent (12.4:1 vs page, round 1). |
| Counter | FIXED | Counter normalised like server; part of `aria-describedby` for the message; a separate polite `.cf-sr` region changes only at thresholds: 0 mutations while typing 49 characters, 1 announcement after paste ("Message is over the 2000 character limit."). No per-keystroke spam. |
| Slow hint | WORKS | Stub POST delayed 3.5 s: "Sending your message..." then at ~1 s "Sending... (this can take a few seconds)", then success. |

## Additional checks

- (a) Sticky bar: no overlapping children at 1280/390/320 (pairwise rect test), no overflow. Index filters now stick at top 72 (bar 72 high at 1280/390). At 320 the bar is 79 px tall, so the filters start 7 px beneath it (only the padding region is covered; heading still readable, screenshot `r2-320x640-sticky.png`). On phones the sticky filter block is 250 to 292 px tall (40 to 45% of the 640 px viewport). Nice-to-have.
- (b) Index regression: 30 cards, 5 highlights, 21 dex cells (7 live), Ctrl+K focuses search, "adobe" gives 1 card, Awards filter gives 8, "see it in the story" goes to `#/story`, footer links correct (mailto; GitHub/LinkedIn/Instagram `_blank noreferrer`). **BUT see N1.**
- (c) Reduced motion (Emulation.setEmulatedMedia, 390 px): Contact click jumps instantly (scrollY 14821 in the first sampled frame). Normal motion: smooth (0, 9, 38, 90, 222 ... samples). PASS.
- (e) 3:1 for control boundaries: input/textarea/search/chips border 4.22 (page) and 3.85 (fill); Send aria-disabled fill vs page 5.02; "Send another" (aria-disabled, opacity .6) border is the same #6e72aa. Primary Send button fill 12.4. Counter 6.84, error text 9.58. PASS.
- (f) Timers: with a rate limit active exactly 1 interval exists (extra clicks add none); after navigating away from Index (`#/story`) 0 intervals remain; no console errors or exceptions. Live regions: no per-keystroke announcements. PASS.

## New / remaining defects

### Blocker
- **N1. Index in-page anchors eject the visitor from Index to the opening/menu.** `src/store.ts` `hashToMode()` maps any hash not starting `#/index` or `#/story` to `gate`, and the `hashchange` handler applies it. Clicking a highlight card (`href="#martial-arts"`), or the nav links Highlights / Everything / 21 in 21 (`#highlights`, `#timeline`, `#shipped`) changes the hash and the app switches to the Gate (verified in browser: `.index` gone, "SKIP ... START JOURNEY" shown; screenshot `r2-highlight-click.png`). Only the Contact link is safe because the builder added a click handler. Repro: open `/#/index`, click any highlight card or "Highlights" in the sticky nav. Fix (not implemented): give all in-page anchors the same `scrollIntoView` + `preventDefault` handler (cards use `id`), or make `hashToMode` ignore hashes that don't start with `#/`. Owners: `src/index-mode/**` (handlers) and/or `src/store.ts` (integrator). I did not test this in round 1 (not in my round 1 list of regressions); it affects the Index's core navigation, and the Index "must always work".

### Should-fix
- **N2. Remaining touch targets under 44 px:** category chips (34 px high) and the 30 "see it in the story" buttons (125x20). Increase height (min-height 44 and padding) or enlarge the hit area.

### Nice-to-have
- N3. At 320 px the bar is 79 px but filters stick at 72 px (7 px overlap). Use a CSS variable for the bar height or `top: 80px` under 400 px.
- N4. Sticky filter block takes 40 to 45% of a phone viewport.
- N5. Round 1 nice-to-haves not rechecked individually beyond those fixed above (Google Fonts external load unchanged).

Contact form itself: all round 1 should-fix items verified fixed. The overall result is held by N1 (Index navigation) and N2.

(Round 2 result: FAIL. See Round 3 below.)

---

# Round 3 (final re-verification)

Method as before (built `dist` on :5700, mock backend :8787, real CDP mouse/key/touch events, stubs only for impossible backend cases; everything stopped afterwards). `npm run build` OK (main chunk 248.9 kB, 79.76 kB gz). `npx oxlint`: warnings only in `src/story/**` (other agent), none in Index/contact files.

## N1 to N4

| Item | Result | Evidence |
|---|---|---|
| N1 every in-page anchor | FIXED | `a[href^="#"]` enumeration: 9 anchors (4 nav, 5 highlight cards). Clicked every visible one with real mouse at 1280 (9), 390 and 320 (6 each; 3 nav links are hidden by CSS on phones, Contact remains). 0 left Index, 0 changed mode, hash stayed `#/index` every time. Target top was 12 px below the bar (84 vs 72; 91 vs 79 at 320), card targets get focus and `.is-target` (border + 2px box-shadow in card accent), class removed after 2 s. Reload after clicking: still Index at all three sizes. |
| Keyboard Enter | PASS | Enter on Everything link and on a highlight card scrolls and focuses H2 / the card; hash `#/index`. |
| Ctrl-click | PASS | Handler ignores modified clicks; page stays in Index, hash unchanged, no scroll. |
| Hash edited while in Index (`location.hash='highlights'`) | PASS | Stays in Index (native jump). |
| Fresh load of `/#highlights` | Lands on the opening menu (no crash, no console error). Acceptable; flagged as expected behaviour. |
| Story routing | PASS | `/#/story` and `/#/story/ch1-walk` load Chapter 1 (no console errors). Index to Story via "see it in the story" (`#/story`), Back returns to Index, Forward returns to Story. (A second Back in my script hit about:blank; not a defect.) |
| N2 tap targets | FIXED | Every `a/button/input/textarea` at 390 (66 elements, device-metrics override, dsf 2): 0 under 44 px in either dimension (chips and story buttons included). |
| N3 bar/filter offsets | PASS | `--bar-h` equals measured bar height at 1280 (72), 390 (72), 320 (79); re-checked after resizing 390 to 844x390 landscape, 320, 1280 (values track; no horizontal overflow) and with Google Fonts blocked (72 vs 72). Nothing hidden under the bar; filters stick at `--bar-h`. |
| N4 mobile filters | PASS | At 390/320 filters are `position:static` (`--filters-h` 0) and chips are a single row (`nowrap`, overflow-x auto, scrollWidth 815 vs 350). Touch swipe (synthesized touch events): scrollLeft 0 to 353, page scrollX stays 0; touch tap on a chip filters (8 Awards cards). Clipped chips at the edge hint scrollability (`shots/r3-390-chips.png`). |
| Reduced motion (real browser, emulated media) | PASS | With reduce: anchor scroll lands in the first sampled frame (6534 px); without: smooth (0, 14, 95, 325, 839, ... 5737). |
| Contrast of new states | PASS | `.is-target` uses the card accent (e.g. #ff5d73 on dark); borders and focus rings as round 2 (4.22:1 / 3.85:1, ring 12.4:1). |
| Contact form regression | PASS | Success (double click 120 ms apart: 1 POST, confirmation stays), "Send another" focuses name; token_used stub (resubmit uses `tok2`, never `tok1`); rate limit (Send aria-disabled, "about 2 minutes", mailto link); server down (fallback with email, text kept, 0 POSTs). Focus stays on Send in each error case. No console errors. |
| Index features | PASS | 30 cards, 5 highlights, 21 dex cells (7 live, links `_blank noreferrer`), Ctrl+K, search "adobe" = 1, Awards = 8, "see it in the story" goes to `#/story`, footer links correct. |

## Remaining defects

### Should-fix
- **N6. A highlight card whose target card is hidden by the active filter does nothing, and pollutes the URL.** Repro: choose the "Art" chip, scroll up, click the "Gold / international martial arts" highlight (card is in "Awards"). `getElementById('martial-arts')` is null, so the handler does not intercept: nothing scrolls, nothing is shown, and the hash becomes `#martial-arts`; reloading then shows the opening menu instead of Index. Fix: in the handler, when the target is not rendered, reset category to All and search to empty, then scroll/focus after render (and `preventDefault` regardless so the hash never changes).

### Nice-to-have
- N4b. In landscape phones (e.g. 844x390, wider than the 640 breakpoint) the sticky filter block is 230 px tall in a 390 px viewport (bar 72 + filters 230 leaves about 88 px of content). Consider making filters static at small viewport heights too (`max-height: 500px`).
- Raw `/#highlights` link lands on the menu rather than Index (acceptable; flagged as requested).
- Google Fonts is loaded from the network (unchanged).

(Round 3 result: FAIL. See Round 4 below.)

---

# Round 4 (narrow re-check of N6 and landscape filters)

`npm run build` currently FAILS only because of another agent's in-progress file: `src/story/shell/plan.ts(140,3): TS2741 Property 'from' is missing ... required in type 'View'`. Nothing in Index/contact files. `npx oxlint`: no warnings in Index/contact files. Because `dist` was stale, browser checks used the dev server (`vite` on :5700, proxy to mock backend :8787), real CDP input events. All servers/browsers stopped.

| Check | Result | Evidence |
|---|---|---|
| N6: every chip x every highlight (9 chips x 5 highlights = 45 combos) at 1280x720, 390x844, 320x640, 844x390 | PASS | Real chip click, then real highlight click. When the target was hidden, the filter reset to All (30 cards), search cleared, target card exists, `is-target` set, focus on the card, hash `#/index`. The only combos my script flagged are ones where the target was already visible under its own chip (filter correctly left as is). Target top vs obstructions: 1280: 262 px vs filters bottom 250 / bar 72; 390: 84 to 96 vs bar 72; 320: 91 vs bar 79; 844x390: 84 vs bar 72. Reload after each size: still Index. |
| Search term that hides everything | PASS | "zzzzqq" gave 0 cards and the "nothing matches" text; Enter on a focused highlight reset search to empty and category to All (30 cards), card focused, target 262 (1280) / 96 (390) / 84 (844x390). |
| Unknown id (`href="#nope"`) | PASS | Nothing happens; hash stays `#/index`, Index stays. |
| Screenshots read | PASS | `r4-1280x720-gold.png`: filter chips show "All" selected, martial-arts card outlined, fully visible below the filter block, nothing under the bar. `r4-390x844-gold.png`: card with highlight outline below the bar, chapter heading above. `r4-844x390-gold.png`: card fully visible below the bar (no sticky filters). |
| Landscape filters | PASS | At 844x390 `--filters-h` = 0px, filters `position:static`; at 1280 sticky with `--filters-h` 178px. |
| Contact flow regression | PASS | Success with double click (1 POST, confirmation stays) and "Send another" focuses name; token_used stub resubmits with a fresh token; rate-limit stub (Send aria-disabled, "about 2 minutes", mailto); server down (fallback, text kept, 0 POSTs). Focus stays on Send. No console errors (only Vite dev messages). |
| Index regression | PASS | 30 cards, 5 highlights, 21 dex cells (7 live), footer links correct (mailto, GitHub/LinkedIn/Instagram `_blank noreferrer`), Ctrl+K search "adobe" = 1, Awards = 8, "see it in the story" goes to the Story hash (`#/story/coming-soon-ch4`, the Story shell's own routing). |

Defects: none new in Index/contact. Open nice-to-have items from earlier rounds: raw `/#highlights` link lands on the menu (accepted), Google Fonts loaded from the network.

RESULT: PASS
