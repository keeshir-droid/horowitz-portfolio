# Verification: Story engine foundation (cinematic-verifier)

Date: 2026-10-11. Scope: `src/story/engine/**`, `src/story/scenes/_demo/index.tsx`. Independent re-check; the builder's claims were not treated as evidence.

Method: real Chrome (headless=new, SwiftShader) driven over the DevTools protocol from a Node script in the OS temp folder (`%TEMP%\cv`). A temporary Vite dev server on port 5200 plus a temporary folder `zz-cv-tmp/` (outside `src/`) mounted the real engine modules (StrictMode, like `main.tsx`). Both were removed afterwards (server stopped, folder deleted, port 5200 confirmed free). Hash comparison of `src/`, `api/`, `public/` and the config files before/after: no engine/scene/config file changed. The only differences are `api/**` and `src/lib/api.ts`, which the concurrent backend agent is editing. Screenshots are in `%TEMP%\cv\shots` and were all read. Headless software rendering is not representative of GPU fps and I cannot hear audio or judge musicality.

## Checklist

| # | Item | Result | Evidence |
|---|---|---|---|
| 1a | `npm run build` | PASS | `tsc -b && vite build` succeeded. `index` 241.09 kB / **76.41 kB gzip**, CSS 2.37 kB gz, `StoryMode` chunk 0.41 kB gz, `Opening` (lazy) 271 kB gz. |
| 1b | `npx oxlint` | PASS (with warnings) | 8 warnings, 0 errors. 1 in the engine's scope: `_demo/index.tsx:4` `react(only-export-components)` (exports `meta` const next to the component, which the scene contract requires). 7 are in the pre-existing `gate/Opening.tsx`. |
| 1c | `node src/story/engine/timeline.test.mjs` | PASS | "all assertions passed". |
| 1d | Type check | PASS | `npx tsc -b` exit 0. |
| 1e | Suppressions / `any` / `!` | PASS (minor) | No `any`, `@ts-ignore`, `@ts-expect-error` or non-null `!`. Casts: `window as unknown as {webkitAudioContext}` (audio.ts:44, justified), `(Number(ch)\|\|1) as 1\|2\|3\|4\|5` (DemoHarness:44, unsafe, see D-12), `['--hud-accent' as string]`. Two `// eslint-disable-next-line react-hooks/exhaustive-deps` in pixelate.tsx; the project lints with oxlint and that rule is not configured, so they are noise. |
| 2 | Timeline math | PASS | Own 24-case suite (`tl.test.mjs`): chapter share with all five chapters = 0.08/0.08/0.35/0.42/0.07 (exact to 1e-12); missing chapters renormalise; weights not summing to 100 fine; all-zero weights fall back to duration weighting; zero-duration scenes get zero-length slots and are skipped; negative/NaN durations and NaN weight safe; single scene; p<0, >1, NaN, +-Infinity clamp; every slot start maps to that scene with sp=0 and start-1e-12 to the previous scene with sp>0.999; p=1 -> last scene, sp=1 (also with 200 scenes of awkward floats); 100,001-step sweep: sceneIndex never decreases, sp within [0,1] and monotone inside a scene, step size equals dt/slot length (continuous). Quirk (not a defect): a trailing zero-duration scene is only reachable at exactly p=1. Unordered scenes (not sorted by chapter) still sum to 1 but would interleave chapters; the contract says scenes are ordered. |
| 3 | Unlock store | PASS | Run through Vite SSR: unknown ids ignored without notifying subscribers; second unlock returns false with no notification; `unlockMany` with dupes and unknown ids yields queue `[chess, adobe, decor-brand]` in order; `unlocked` Set is replaced, never mutated (old Set keeps size 1); `shiftToast` only drops the queue head; `reset` clears both and allows re-unlock; `__proto__`/`constructor`/`''` rejected. `TOTAL_ENTRIES` (30) === `entries.length`, no duplicate ids. Every id in the tier map exists in `entries.ts` (including `motor-thesis`). Tier A = martial-arts, decor-brand, 21-in-21, adobe, motor-thesis, visa, content-pitch (matches the brief), B = 4, C = 19. Re-render: the HUD count and bar updated live in the browser (3 / 30), so selectors are not stale. See D-14 for storyboard discrepancies. |
| 4a | HUD layout, desktop 1280x720 and true 390x844 | PASS | `innerWidth` 1280 / 390, `scrollWidth` equals viewport, nothing clipped, SND + INDEX + counter always on screen. Toast stays at the bottom: top of toast (484 / 612 px) vs bottom of HUD bar (68 / 66 px) never overlap. Screenshots `hud-A-m`, `hud-B-m`, `hud-C-m`. |
| 4b | INDEX button | PASS | Click at 390 and 1280 -> `useApp.mode === 'index'`, `location.hash === '#/index'`. Reached by Tab. |
| 4c | Mute button | PASS | `aria-pressed` false -> true, label "Mute sound" -> "Unmute sound", text SND ON -> SND OFF, localStorage `rn-portfolio-muted` 1/0, persists across reload (SND OFF, `aria-pressed=true` after reload). The click also unlocks audio. See D-6 for the hover contrast bug. |
| 4d | Toast queue (3 at once) | PASS | Fired `decor-brand` (A), `carbon-neutral` (B), `chess` (C) together: shown one at a time, in order, none lost. Measured durations: A 6463 ms, B 4758 ms, C 2550 ms (spec 6500/4800/2600), then empty. No gap between consecutive toasts (~40 ms). Count/progressbar `aria-valuenow` = 3 / 30. |
| 4e | Tier visuals differ | PASS (weak B vs C) | A: 4 px border, 48 px stat, bigger title, blurb. B: 3 px border, blurb, no stat unless entry has one. C: compact, title only. B and C differ only by padding and the blurb line, so a B entry without `stat` looks nearly the same as C. |
| 4f | `role=status` live region | PASS | `.hud-toast-zone` is always mounted with `role=status aria-live=polite aria-atomic=true`; the toast mounts inside it. I cannot run a screen reader, so announcement itself is NOT-VERIFIED. |
| 4g | Escape / OK dismiss | PASS with caveat | OK button dismisses; Escape dismisses only when focus is inside the toast (handler is on the `<section>`). Escape with focus on `body` does nothing (D-9). |
| 4h | 'view proof' link | PASS | Temp-mutated `adobe.links` in the page (not the repo): link appears with `target=_blank rel=noreferrer`; toast then lasts 9051 ms (PROOF_MS 9000). Link hidden when no links (all other toasts). Link height is 20 px (D-5). |
| 4i | Long text | PASS (one edge FAIL) | A 143-char title, 400-char blurb, long stat value/label at 390 px: wraps, blurb clamps to one line with ellipsis, card 479 px tall, never touches the HUD bar, no page overflow. FAIL edge: a single unbreakable 90-char word in the title overflows the card (title scrollWidth 612 vs card 364). Real titles contain spaces, so low risk (D-11). |
| 4j | Reduced motion | PASS | Emulated `prefers-reduced-motion: reduce`: toast `animation-name: none` (normal: `hud-pop`); XP transition disabled by CSS. Screenshot `toast-link-mr` equivalent. |
| 4k | Keyboard + focus rings | PASS | Tab reaches SND, INDEX, toast OK in DOM order; focused buttons show `outline: 3px solid` (confirmed in screenshot). After a dismiss, focus falls back to `body` (D-9). |
| 4l | Tap targets >= 40 px | FAIL | SND 36 px high, INDEX 36 px, toast OK 38x28, view proof 20 px high, chapter label n/a. (D-5) |
| 4m | Text contrast | FAIL (one place) | Muted text on bg 6.84, on toast 6.24, blurb 11.2, chapter accents on toast 5.9 to 11.3: all pass. FAIL: the HUD has no scrim, so over a scene of the same colour it disappears. Chapter 1 label (`#9bbc0f`) on the Game Boy green background is 1.00:1 (screenshot `hud-on-green`: "CH 1" is invisible, rest barely legible). Also muted + hover (muted text on cream) is 2.47:1 (D-4, D-6). Pixel text is 8 px. |
| 4m2 | Auto-dismiss timing a11y | FAIL | Toasts (including the one with a link) auto-dismiss at 2.6/4.8/6.5/9 s with no pause on hover/focus; a keyboard user tabbing to "view proof" can lose it mid-focus (D-7). |
| 5a | `audio.unlock()` before gesture | PASS | Calling it without a gesture returns true, creates one context (state `suspended`), Chrome logs "AudioContext was not allowed to start" (warning only). Repeated calls: still 1 context. |
| 5b | No AudioContext at import / before unlock | PASS | Wrapped `AudioContext`: 0 constructions after module load; 0 after calling every `sfx.*` and `music.*` pre-unlock (all silent no-ops, `isUnlocked()` false). 1 after first unlock. |
| 5c | Safe no-ops / never throws | PASS | Calling unlock, every sfx, `applause(0)`, `tada(-3/99/NaN)`, `music.play/crossfade/stop`, `crossfade('bogus')`, `toggleMute` x2 and `dispose` under 5 hostile setups: `AudioContext` undefined (`isAvailable=false`), constructor throws, `createOscillator` throws, `localStorage` accessor throws SecurityError, `Storage.getItem/setItem` throw. 0 exceptions, 0 console errors at load in every case. |
| 5d | Cleanup | PASS | 931 nodes created by 30x tada + applause + coin; 928 disconnected 3.5 s later (the 3 left are the persistent master/sfx/music buses). Interval count: baseline 1, 2 while music plays, back to 1 after `music.stop()` and after `dispose()` (context state `closed`); re-unlock after dispose creates a fresh context. |
| 5e | Mute persistence | PASS | Persists across reload; works with throwing storage (session-only). |
| 5f | Sequencer lookahead / throttling | PASS (reasoned) | Code review: `if (p.next < now) p.next = now + 0.03` re-syncs after a pause instead of bursting; per tick it schedules at most `LOOKAHEAD / step` steps (<= 1 for town, 1 for calm) so no note burst after a long pause. Cost: lookahead 0.25 s vs a 60 ms timer means any main-thread stall over ~190 ms (heavy WebGL scene, hidden-tab 1 s timer throttling) drops notes and slips the rhythm (D-10). Not reproduced; reasoning only. |
| 5g | Levels (OfflineAudioContext, same synth code, real compressor) | PASS for single events; FAIL for overlap | Peak / active RMS (dBFS): blip -17.3 / -29.4, coin -18.0 / -25.0, tada(0) -14.1 / -23.4, tada(1) tier B -13.9 / -23.2, tada(4) -13.8 / -22.9, applause(2.2) -16.9 / -37.9, **tier A (tada(4)+applause) -11.0 / -24.4**, footstep -28.8 / -41.9, confirm -18.6 / -26.3, GB chime -16.2 / -23.0, music town -13.2 / -31.5, music calm -22.4 / -35.5, tier A over town music -11.6 / -28.3. Nothing in normal use exceeds -11 dBFS (safe, if anything quiet; applause is ~15 dB below the tada, so it may be barely audible). Stress: 10 tier-A at the same instant peaks at **+3.7 dBFS** (clips): the compressor (threshold -14, ratio 6) is not a limiter. This can only happen if many sfx pile up on a suspended context and then resume together (D-8). I cannot judge musicality. |
| 6a | Pixelate cover mode shots | PASS | 1280x720 and 420x1000: p=0 and p=1 are pixel-identical to the untouched background (no residue). p=0.1 fine speckle of palette blocks (~160 columns), p=0.25 ~30 columns, p=0.42/0.5/0.58 identical hold of **4 columns** (full cover, only the 4 palette greens used with a checker tint), p=0.75 mirrors 0.25. No seams between blocks. Blocks are square (aspect-corrected). Partial blocks exist on the non-integer edge (D-13). The p=0.1 speckle is a per-block random dissolve; looks like noise at fine scale (taste call). |
| 6b | Resize | PASS | Canvas 1000x600 -> 500x900 and at DPR 2 -> 1500x900 (capped 1.5x); redrawn immediately with no blank frame. |
| 6c | Lifecycle 50x mount/unmount | PASS (production) | 50 mounts: 0 leftover canvases, 0 console warnings/errors, 0 exceptions, contexts released via `loseContext`. |
| 6d | Fallbacks | PASS | `getContext -> null`, shader compile failure, `prefers-reduced-motion`, and `reduced` prop all render a fixed `<div>` whose opacity follows the envelope (0, 0.64, 1, 0.64, 0); no throw; `onFallback` called exactly once for the two GL failures and not for reduced motion. |
| 6e | StrictMode | FAIL | Under `React.StrictMode` (which `main.tsx` uses) the first effect's cleanup calls `loseContext()` on the canvas; the second effect gets the same, now lost, context, shader alloc fails, and the component permanently falls back to the CSS fade and fires `onFallback`. Production is not affected, but dev and the harness never show the real shader, and an integrator reacting to `onFallback` would wrongly downgrade (D-2). |
| 6f | Texture mode | FAIL | Works for a 2D canvas source (pixelates `from` before the hold, `to` after) but the picture is **vertically flipped** (screenshot `sheet-tex`: text upside-down, the black corner marker lands bottom-left). No `UNPACK_FLIP_Y_WEBGL`. (D-1) |
| 7a | Harness URL params | PASS | `?t=` (also junk `abc`, 5, -1 clamp), `&p=`, `&toast=a,b` (several, unknown ids ignored), `&ch=`, `&age=`, `&pin` (toast still present after 9 s) all behave; scrubbing the range inputs updates scene/local progress (t=0.0625 -> boundary, t=1 -> scene 2 local 1.00); 17 buttons clicked with real input events produce no console errors or warnings. |
| 7b | Harness robustness | FAIL (dev-only) | `?ch=9` throws `Cannot read properties of undefined (reading 'accent')` and blanks the whole page (D-12). |
| 7c | Harness reachability | NOT-VERIFIED via the app | `App.tsx` does not mount `DemoHarness` (no `?engine-demo` route exists yet); I mounted it through a temporary entry. |
| 8a | Bundle impact | PASS (trivially) | Nothing outside `src/story/engine` imports the engine (only `_demo` imports a type); no engine string (`rn-portfolio-muted`, `ACHIEVEMENT UNLOCKED`, `hud-toast`) in any `dist` chunk; main chunk 76.41 kB gz is unchanged by the engine. This will change at integration; the engine's own gzip size was not measured. |
| 8b | Regression: opening, Index, Story | PASS | `/?t=6.4` shows the Game Boy boot scene with SKIP; `/#/index` shows hero + Highlights; `/#/story` shows the placeholder with MENU/INDEX. No non-engine source file is newer than the engine start time (only `entries.ts`, lead-owned). One console warning (`THREE.Clock deprecated`) comes from the existing opening. I had no pre-change screenshots, so "unchanged" rests on the file timestamps/hashes plus these frames. |
| 8c | `git status` | PASS | The portfolio folder is untracked in the home-level repo (`?? ./`), so git cannot show a diff; I used a SHA-256 file listing instead (see header). No engine, scene or config change; all temp files removed. |

## Defects

### Blocker
None.

### Should-fix (each blocks PASS)
- **D-1 Texture mode renders vertically flipped.** Repro: mount `<PixelateTransition progress={0} from={canvasA} to={canvasB}/>` with a 2D canvas that has text in the top-left; the text is upside-down. Cause: texImage2D without `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)` (pixelate.tsx `initGl`/`up`). Fix: set FLIP_Y when uploading, or flip `v.y` in the shader for textured mode; re-test with an asymmetric image.
- **D-2 Pixelate silently drops to the CSS fallback under StrictMode.** Repro: render `<StrictMode><PixelateTransition progress={0.5} onFallback={...}/></StrictMode>`; a `<div>` renders, `onFallback` fires. Cause: cleanup `loseContext()` then the same canvas element is reused by the double-invoked effect. Fix: do not call `loseContext` on an element React may reuse (or create/replace the canvas inside the effect, or recreate with a `key`), and verify under StrictMode.
- **D-3 HUD is unreadable over scenes of a similar colour.** Repro: render `<Hud chapter={1}/>` over `#9bbc0f`: "CH 1" is 1.00:1. No scrim behind the top bar. Fix: give the top bar a dark translucent backing or per-label panel; consider a text colour independent of the scene.
- **D-4 / D-6 Muted button hover contrast.** `.hud-btn[aria-pressed='true']` (muted grey text) combined with `.hud-btn:hover` (cream background) is 2.47:1, and the hover state sticks after a mouse click. Fix: define a hover style for the pressed state.
- **D-5 Tap targets below 40 px.** SND/INDEX 36 px high, toast OK 38x28, view proof link 20 px high. The brief asks for >= 40 px; raise `min-height` to 40 and give OK and the link padding (also helps the 8 px pixel text).
- **D-7 Timed content with no pause.** Toasts auto-dismiss, including the one that carries a link. Pause the timer on hover and focus-within (resume on leave), and keep focus handling sane; consider not auto-dismissing a toast that has links.

### Nice-to-have
- **D-8 Audio can burst past 0 dBFS.** 10 stacked tier-A sounds peak at +3.7 dBFS. `live()` should also require `ctx.state === 'running'` so nothing is queued on a suspended context, and the master chain could add a hard limiter (compressor ratio 20, knee 0, attack ~1 ms) or a final `WaveShaper`/clamp gain.
- **D-9 Keyboard dismissal.** Escape only works with focus inside the toast; add a document-level Escape while a toast is shown. After OK/Escape focus drops to `body`; return it to the previously focused element.
- **D-10 Music scheduling margin.** Lookahead 0.25 s with a 60 ms timer is fragile under main-thread jank and hidden-tab throttling (rhythm slips, dropouts). Use ~0.6 to 1 s of lookahead.
- **D-11 Unbreakable long word overflows the toast.** Add `overflow-wrap: anywhere` to `.hud-toast-title`/blurb.
- **D-12 `DemoHarness` crashes on `?ch=9`.** Clamp/validate `ch` instead of casting; also stop `Hud` assuming `chapters[chapter]` exists.
- **D-13 Pixelate grid anchored at the bottom** leaves a partial row of blocks at the top (e.g. a 40 px strip on 1280x720 during the hold). Anchor to centre or round the row count.
- **D-14 Spec mismatches to resolve with the lead.** Storyboard system section lists "the pitch" (`content-pitch`) under Tier B while code and the brief make it Tier A; the storyboard mock reads "UNLOCKED 17 / 34" but the real total is 30; Tier A items `motor-thesis` and `visa` are not `highlight: true` in `entries.ts` (Index highlights show only 5 of the 7 Tier A). The storyboard's compact-card B/C distinction is weak visually; the Tier A blurb clamps to one line and cuts the claim mid-sentence (the decor-brand claim is a `verify` entry).
- **D-15 Lint noise.** Drop the two `eslint-disable` comments (oxlint does not use that rule) or configure the rule; move `meta` or silence `only-export-components` for scene files in `.oxlintrc.json`.

## Review of the proposed 'click to enter with sound' gate (opinion only)

What is right: it is the only fully reliable way to get audio on every browser, because Web Audio can only start from a user activation (Chrome, Safari, Firefox; iOS Safari additionally needs the `resume()` or first `start()` inside the same handler and can re-suspend on interruption, which `unlock()` handles by re-resuming). A "continue without sound" choice and deep-link bypass are correct; the boot chime on the logo is the right payoff.

Risks:
1. **Friction at the one moment that counts.** A reviewer or recruiter who sees a black "PRESS START" screen first has not been "immersed from the first second"; a black splash is also what a broken page looks like for a second. Many will click, but some will bounce, and any who choose "without sound" lose the 7-second opening's best beat.
2. **Gesture rules.** Only trusted click/keydown/touchend count (not `touchstart`, not synthetic events, not programmatic `.click()`); the handler must call `audio.unlock()` synchronously. Do not `await` before it. Keyboard activation of the splash (Enter/Space) must be supported, and the splash needs focus and a visible label for assistive tech.
3. **Not just the gate.** Audio keeps working only while the single context survives; iOS can move it to `interrupted` after a call or lock-screen, so every later gesture should re-call `unlock()` (the HUD mute button already does).
4. **Two-tap path.** If the splash then still needs a "skip" or "menu" press, count taps; keep to one.
5. **Reduced motion / no WebGL** users should also be offered the splash only if sound exists; otherwise they get a pointless step.

Recommended alternative: do not gate the visuals. Start the opening immediately, silent, with the Game Boy screen and a small unobtrusive "SOUND ON" affordance (the HUD mute button style) already visible from t=0; also arm a one-shot `pointerdown`/`keydown` listener on `window` that calls `audio.unlock()` and fades sound in on the first interaction anywhere (including the existing SKIP). On first arrival without interaction, the opening plays silently and still works. If the boot chime is considered essential, delay the logo landing by showing the "press any key" prompt in-world (inside the Game Boy screen, in the game's own language) for one beat, and auto-continue after ~1.5 s with or without a press so a still reader is never blocked. Persist the user's choice (the mute key already exists) so returning visitors are not asked again. This keeps immersion, costs zero extra taps, and degrades to silent.

## Cleanup
Temporary server on port 5200 stopped; `zz-cv-tmp/` deleted; Chrome profiles removed; no source file modified; only file written in the repo is this report.

RESULT: FAIL


---

# Round 2 (re-verification after builder fix round 1)

Date: 2026-10-11. Same method as round 1: real Chrome (headless=new, SwiftShader) over the DevTools protocol from `%TEMP%\cv`, temporary Vite server on port 5200 plus a temporary `zz-cv-tmp/` mounting entry (StrictMode, like `main.tsx`). Server stopped, folder deleted, port 5200 free. Screenshots in `%TEMP%\cv\shots2`, all read. Contrast numbers are MEASURED from screenshot pixels (most common colour in the element rect = backing, farthest colour = text, WCAG ratio), not computed from CSS. The narrow viewport is a CDP device-metrics override to a true 390 px layout viewport (`innerWidth` 390), not an iframe. None of the builder's claims was assumed.

Source-change proof: SHA-256 listing of `src/`, `api/`, `public/` and the configs before and after this round shows I edited nothing. Files that changed during the session belong to other lanes: `src/App.tsx`, `src/index-mode/IndexMode.tsx`, `src/components/ContactForm.tsx`, `src/components/contact.css`, `src/lib/api.ts`, `api/_lib/http.ts`, `api/_dev/test.mjs`, `package.json`, `vite.config.ts` (the last two touched 19:08). The `/#/index` screenshot now shows a "Contact" nav link; that comes from that work, not the engine.

## Round 2 checklist

| # | Item | Result | Evidence |
|---|---|---|---|
| R1 | build / oxlint / timeline test / tsc | PASS (1 new warning) | `npm run build` OK (index 241.09 kB / **76.41 kB gzip**, identical to round 1); `timeline.test.mjs` passes; `npx tsc -b` exit 0. oxlint: 0 errors, 9 warnings: 7 old ones in `gate/Opening.tsx`, `_demo` only-export-components, and NEW `pixelate.tsx:203 react(set-state-in-effect)` (`setFailed(true)` in the effect; behaviourally fine). Grep for `eslint-disable`, `@ts-ignore`, `any` in `src/story`: none left. |
| 1a | Texture mode upright (D-1) | PASS | Text canvas (black "FROM" top-left on white, black bar along the bottom): at p=0.02, 0.3 and 0.7 the text/markers stay at the top and the bar at the bottom, measured on screenshot pixels (top region white with black foreground, bottom strip solid black) and read visually (`shots2/sheet-tex.png`). Normal mode and StrictMode identical. |
| 1b | StrictMode safe (D-2) | PASS | Under `<StrictMode>` a `<canvas>` renders, `onFallback` calls = **0** (normal mode also 0), no console output. Round 1: 1 call and a `<div>` fallback. |
| 1c | 50x mount/unmount under StrictMode | PASS | 50 cycles: 100 WebGL contexts created and released (two per cycle from StrictMode), 0 leftover canvases, 0 `onFallback`, 0 throws, 0 console warnings (no "too many active WebGL contexts"). |
| 1d | Pixelate grid | PASS (look changed) | Grid is now centred. At the hold at 1280x720 the column edges are 0,160,480,800,1120,1280 (two half-width edge columns plus three full) and rows 0,200,520,720: 5 visible columns, not 4 (N-3). No seams. |
| 2a | HUD contrast, measured (D-3) | PASS | Worst ratio per element over {Game Boy green `#9bbc0f`, white, black, busy stripe image} x {chapters 1-5}, at 1280 and at 390: "CH n" accent text 5.75 (ch2 on white), era text 15.13, age 9.85, counter 15.13, SND 16.87, INDEX 16.87. All >= 4.5. `shots2/hud-m-green-ch1.png` and `hud-d-busy-ch2.png` read: dark gradient band, "CH 1" legible on green. |
| 2b | Button states (D-4/D-6) | PASS | SND/INDEX/toast OK measured: default 16.87 (cream on `#0e0f1a`), real mouse hover 16.87 (dark on cream), forced `:active` 12.39 (dark on `#ffc857`), forced `:focus-visible` outline `3px solid rgb(255,200,87)` on SND, INDEX, OK and the proof link (visible in `focus-m-focus-SND.png`), muted: dashed border + line-through with text "SND OFF", muted+hover 16.87 (`btn-m-muted+hover.png`). `(hover: hover)` gating present and matched in headless. |
| 2c | Tap targets, `getBoundingClientRect` | PASS | 1280: SND 78x44, INDEX 86.1x44, toast OK 46x44, proof link 71.2x44. 390: SND 68x44, INDEX 75.2x44, OK 46x44, proof link 71.2x44. All >= 44 px both ways. (Proof link via an entry mutated in the temp page only.) |
| 3a | Hover pause with banked time (D-7) | PASS | Real CDP mouse: B toast (4.8 s) hovered from ~0.9 s for 7 s: still shown (`data-hold=1`); mouse left at 7955 ms; dismissed at 11803 ms = 3.85 s later (banked remainder ~3.9 s). Next toasts followed in order B, C, A, none lost. Same at 1280 and 390. |
| 3b | Keyboard focus pause | PASS | Real Tab presses reached OK in 3 tabs (SND, INDEX, OK); a C toast (2.6 s) stayed 6 s while focused; Tab away at 6.7 s: dismissed ~2.0 s later (min-resume floor 1.5 s); next queued toast followed. (My first attempt used `.focus()` without page focus and saw no pause: a harness artefact; repeated with real key events and focus emulation.) |
| 3c | Toast with a link | PASS | Link toast (9 s) with focus on "view proof" stayed 10.5 s; after blur at 11.3 s it dismissed at 19.5 s (8.2 s banked), then the queued chess toast followed. |
| 3d | Escape | PASS | No toast shown: Escape does nothing, no exception, queue unchanged. Three queued, focus on `body`: Escape drops only the front toast; focus on the range input: drops one; third empties; unlock count stays 3 (nothing lost from the collection). Same at 390. |
| 3e | Long / unbreakable text (D-11) | PASS | 90-char unbreakable title: h2 right edge 368 vs toast right 380 at 390 wide, no overflow (`word-m.png`). 120-char title, 300-char blurb, 40-digit stat, 80-char stat label: wraps, blurb clamped to one line, toast 495 px tall, `documentElement.scrollWidth` equals the viewport (390 and 1280), never touches the HUD bar. |
| 3f | Tier A/B/C distinct | PASS | `sheet-tiers.png`: A = 4 px border + glow + 48 px stat (236 px tall); B = 12 px left accent bar + "◆ ACHIEVEMENT UNLOCKED" + title + blurb (145 px); C = thin 2 px border, small title only (93 px). B and C are now clearly different. |
| 3g | Harness robustness (D-12) | PASS | `?ch=0`, `9`, `abc`, `-3`, `2.5` all fall back to chapter 1 with no exception; combined junk params work; `&tex` mounts the texture test. `?age=-5`, `abc`, empty and `999999999999` are shown verbatim (N-4). 0 page exceptions. |
| 4a | Limiter in the live path | PASS | Only one connection to `ctx.destination` in `src/story` (`createMasterChain`: master -> compressor (threshold -10, knee 0, ratio 20, attack 2 ms) -> WaveShaper tanh (ceiling 0.85, 2x oversample) -> destination). Instrumented `AudioNode.connect`: exactly 1 destination connection per context over 17 contexts, so nothing bypasses it. |
| 4b | Levels, REAL sfx/music code in an OfflineAudioContext (`state` forced to running) | PASS | Peak / active RMS (dBFS): blip -9.4 / -22.2, coin -10.0 / -17.2, tada tier B -6.4 / -15.5, tada(4) -6.4 / -15.1, applause(2.2) -7.3 / -28.6, **tier A tada(4)+applause -4.2 / -16.7**, footstep -15.7 / -32.8, confirm -10.6 / -18.6, GB chime -8.3 / -15.3, music town -7.5 / -23.3, music calm -14.2 / -27.2, tier A over town music -4.5 / -20.3. **Stacks: 10 tier-A at the same instant -2.15 dBFS peak (RMS -11.2); 40 tier-A -1.53 dBFS; 10 tier-A over town music -2.06.** Nothing exceeds 0 dBFS (round 1 stack: +3.7). The builder's "about -1.3 dBFS" for synthetic stacks is consistent with my worst case of -1.53. |
| 4c | Mute | PASS | Muted before playback: tier A + town render digital silence (peak 0). Mute at t=2 s during town music: RMS from 2.4 to 5.9 s is -100 dBFS. |
| 4d | Loudness balance | PASS (note) | Every sound is about 7 dB hotter than in round 1 (tier A peak -4.2 vs -11.0). Active RMS: tada -15, chime -15, coin -17, music town -23, music calm -27, applause -28.6 (still ~13 dB under the tada, probably barely audible beneath it; taste, not a defect). I cannot judge musicality. |
| 4e | `live()` requires running | PASS (partly NOT-VERIFIED) | Code reviewed. With a real context created under `--autoplay-policy=no-user-gesture-required` the state is `running` immediately after `unlock()` and a same-tick `blip` still creates its oscillator. Without that flag headless Chrome keeps the context `suspended`, so the "context created in a genuine gesture" path is NOT-VERIFIED here (see N-5). |
| 5a | Bundle / import graph | PASS | Only `scenes/_demo` (a type import) references `engine`; no engine string (`rn-portfolio-muted`, `ACHIEVEMENT UNLOCKED`, `hud-toast`, `createMasterChain`) in any `dist` chunk; main chunk 76.41 kB gzip unchanged. |
| 5b | Regression frames | PASS | `/?t=6.4` Game Boy boot scene with SKIP, `/#/index` hero + Highlights (plus the Contact nav link from other lanes), `/#/story` placeholder with MENU/INDEX. Only console message: the existing `THREE.Clock deprecated` from the opening. |
| - | Not re-run | NOT-VERIFIED | Focus restoration after dismiss, sequencer behaviour under main-thread jank (lookahead is now 0.5 s in `audio.ts`, not stress-tested), screen-reader announcements, actual audibility. |

## Round 1 defects: status

| ID | Status |
|---|---|
| D-1 texture flip | FIXED (measured upright) |
| D-2 StrictMode fallback | FIXED (0 `onFallback`, canvas rendered, 50x no leaks) |
| D-3 HUD over similar colours | FIXED (worst 5.75:1 measured) |
| D-4/D-6 muted hover contrast | FIXED (16.87:1, dashed + line-through) |
| D-5 tap targets | FIXED (all >= 44 px) |
| D-7 toast pause | FIXED (hover and keyboard focus, banked time, queue intact) |
| D-8 audio clipping | FIXED (worst measured -1.53 dBFS, limiter in the only path) |
| D-9 Escape | FIXED for document-level Escape; focus restoration not re-tested |
| D-10 lookahead | Changed to 0.5 s; not stress-tested |
| D-11 long word | FIXED |
| D-12 `?ch=9` | FIXED |
| D-13 grid anchoring | FIXED differently (centred, edge half-columns) |
| D-14 spec mismatches | UNCHANGED, still for the lead |
| D-15 lint | PARTIAL (eslint-disable gone, `_demo` warning remains, one new warning) |

## Round 2 defect list

Blocker: none. Should-fix: none.

Nice-to-have:
- **N-1** oxlint `react(set-state-in-effect)` at `pixelate.tsx:203` (`setFailed(true)` inside the effect). Harmless.
- **N-2** Output is about 7 dB hotter than round 1; consider lowering `master` (0.8) if it feels loud on real speakers; applause stays far below the tada.
- **N-3** The hold shows two half-width edge columns (5 visible); if "exactly 4 huge blocks" is the intent, align blocks to the edges.
- **N-4** `?age=` is not validated (negative, text, empty shown verbatim); harness only.
- **N-5** `live()` now drops any sfx issued while the context is still `suspended` (for example one fired in the same tick as the first `unlock()` on a browser that resumes asynchronously, or the planned boot chime if fired before `resume()` settles). Not reproduced in a genuine gesture here. Integrator: fire the chime after `resume()` settles (let `unlock()` return a promise).
- **N-6** Round 1 D-14 (storyboard tier and count mismatches, `motor-thesis` and `visa` not `highlight`) is still open for the lead.

RESULT: PASS
