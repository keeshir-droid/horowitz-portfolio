# HANDOFF — Risheek's Horowitz Academy portfolio

Written 2026-10-11 (end of session 1) so a new session can continue cold. Read this file first, then `AGENTS.md` (how work gets done) and `docs/STORYBOARD.html` (the original narrative plan). Claude's persistent memory also has two files about this project (`horowitz-portfolio`, `portfolio-tone-and-sound`).

---

## 1. What this is

A personal portfolio for **Risheek Nawka** (19, "creative technologist") to apply to the **a16z Horowitz Academy founding class** (San Francisco). It must be immersive and technically ambitious, but its real job is to show **achievements** (not a "becoming a creative technologist" story) to reviewers who skim.

**Two modes, one content file:**
- **Story mode** — a scroll-driven, chronological journey. Each life chapter is told in a different visual medium. Achievements show up as "unlocks".
- **Index mode** — fast, filterable list of everything, for someone who just wants the facts.
- Front door: a silent ~8 s Game Boy cinematic (window → room → kid → Game Boy screen) then a menu: **START JOURNEY** / **JUST SHOW ME**.

**Deadline context:** Risheek wanted most of it built within ~3 days; the application window is not tight. He is **credit-conscious** (see §3).

**Audience insight:** a16z funds builders. Weight the story toward high school + builder years; childhood stays short and humble.

## 2. How to run it

```powershell
cd "C:\Users\rishe\OneDrive\Documents\Horrowitz Application\Portfolio website"
npm run dev -- --port 5173 --host     # site   (this server DIES whenever an agent cleans up processes; just restart it)
npm run api:dev                       # optional mock backend on :8787 (contact form works in mock mode)
npm run build                         # tsc -b + vite build
npx oxlint                            # known warnings only (see §7)
```

URLs: `/` (opening + menu) · `/#/index` · `/#/story` · `/#/story/<scene-id>` (e.g. `ch1-walk`, `ch2-select`) · `/?engine-demo` (DEV-only engine test page).
Headless-Chrome screenshot tips are in `AGENTS.md` and §9 below.

**Git warning:** the git root is `C:/Users/rishe` (the whole home folder). **No commits have been made.** Never `git add -A`. A separate repo inside the project folder would be cleaner (ask Risheek).

## 3. Decisions & preferences Risheek has stated (do not re-litigate)

**Tone / content**
- Childhood wins must NOT sound boastful; a16z doesn't care about primary school. Chapter 1 is a short curiosity prologue; wins appear as quiet one-line popups with **no name** in them.
- No claim without evidence; entries needing confirmation carry a `verify:` note in `src/content/entries.ts` (list in §8). Understate rather than overstate.
- Avatar: short hair, round glasses, **light-brown skin**, black jacket and casual clothes, **no school uniform**.
- Chapter weights (share of story): **5 / 6 / 38 / 44 / 7** (primary / middle / high school / builder years / San Francisco).

**Sound**
- Yes to sound. The opening cinematic is **silent**; audio unlocks on the first user gesture (the menu click). After Chapter 1 begins sound is **on by default**; the SND toggle only matters if someone mutes. Always keep a visible mute control. Index stays silent.
- Mute persists in `localStorage` (`rn-portfolio-muted`) — Risheek may want it to last only for one visit so every new viewer starts with sound ON (offered, not yet done).

**Backend scope (approved)**
- Contact form: YES. Visit counting: YES but **recorded silently, never displayed** (show only if numbers become impressive). Guestbook: NO.

**Visual direction**
- Chapter 1 = top-down, colourful, **Pokémon Red/Blue (GBC-era) look**, strictly **linear** path, small kid, bigger nicer houses, small popups, one-shot text (no paging), no names. Approved: "very much better".
- Chapter 2 = **Tekken-style** (arcade fighting-game UI). He first said "deck style" — that was a dictation mishearing of "Tekken style". His complaint was the stick-figure fighter art, now replaced by cel-shaded busts. See §6 for his latest (conceptual) feedback.
- Photos: Risheek will upload later. Until then, **labelled placeholders / illustrated stand-ins**. Photo slots exist in Ch1 (dithered GB photo, `PHOTO.src`) and Ch2 (`PHOTOS.<fighter>` in `config.ts`, Tekken treatment). Folders: `public/media/ch1-walk/`, `public/media/ch2-select/` (READMEs inside).

**Process**
- Build **only through agents** (builder → independent verifier → integrator), per `AGENTS.md`; agent definitions in `.claude/agents/`.
- Credit-conscious: prefer **lean** verification (one pass covering several pieces), fresh small agents for tiny fixes (resuming big-context agents is expensive), look at screenshots personally before paying for a verifier, avoid nice-to-have polish loops.
- Discuss **each chapter in detail, one at a time**, and **show a visual before building** (HTML concept page like `docs/CHAPTER1-OPTIONS.html`). Ask for numbers/wording **one at a time**.
- He reviews in a real browser and reports back quickly; ask him to listen to audio (nobody — including agents — has heard any of it).

**Contact details (live in the content file)**: risheeknawka@gmail.com · github.com/keeshir-droid · linkedin.com/in/risheek-nawka · instagram.com/keeshir

## 4. Architecture (where things live)

```
Portfolio website/
  AGENTS.md                 agent workflow, lanes, contracts, approved backend scope
  HANDOFF.md                (this file)
  .claude/agents/*.md       frontend|cinematic|backend × builder|verifier|integrator
  vercel.json, .env.example (env var NAMES only), .gitignore (.env, .vercel ignored)
  api/                      Vercel serverless: contact.ts, hit.ts, stats.ts, _lib/, _dev/ (mock server + 77 tests)
  src/lib/api.ts            only client for the backend (never throws into UI)
  src/content/              SINGLE SOURCE OF TRUTH: entries.ts (30 achievements), projects.ts (21-in-21), types.ts
  src/gate/                 opening cinematic (Opening.tsx, R3F, lazy) + Gate.tsx (menu, SND toggle, audio unlock)
  src/index-mode/ + src/components/   Index mode + ContactForm
  src/story/engine/         verified engine: unlocks.ts, Hud.tsx(+css), audio.ts (procedural WebAudio, no files),
                            transitions/pixelate.tsx, timeline.ts, DemoHarness.tsx, types.ts
  src/story/shell/          registry.ts (auto-registers scenes), plan.ts (timeline/transition zones), parts.tsx, shell.css
  src/story/StoryMode.tsx   Lenis scroll shell, chapter dock, hash routing, error boundaries
  src/story/scenes/<id>/    one folder per scene: index.tsx (default component {progress,active}) + meta.ts (+ optional transitionColors)
      ch1-walk/             top-down Pokémon-style linear walk (canvas), config.ts holds text/windows
      ch2-select/           Tekken-style select/fight/K.O. (canvas), config.ts holds text/windows/PHOTOS
      _demo/                engine demo scene (DEV only)
  src/AppBoundary.tsx, src/chunkGuard.ts   stale-chunk reload + friendly error card
  public/fonts/             PressStart2P.ttf, BebasNeue.ttf (self-hosted — never rely on Google Fonts for scene text)
  docs/                     STORYBOARD.html, CHAPTER1.md, CHAPTER1-OPTIONS.html, CHAPTER2-CONCEPT(.v2).html, api.md, verify/*.md
```

**Adding a scene:** create `src/story/scenes/<id>/index.tsx` (default export component taking `{progress:0..1, active}`; must be a **pure function of progress**) and `meta.ts` (`{id (== folder name), chapter, duration, entryIds[]}`) re-exported from index. The shell auto-registers it — zero shell edits. Scene calls `unlock(entryId)` from `engine/unlocks.ts` (idempotent). Chapters with no scene show a "coming soon" card.
**Engine APIs:** `unlock/unlockMany/unlockGroup`, `audio.unlock()/whenRunning()`, `sfx.{blip,coin,tada,applause,footstep,confirm,gameboyChime,impact}`, `music.{play,stopIf,stop}` (tracks: `town`, `calm`, `arcade`), `PixelateTransition`, `buildTimeline/locate`.

## 5. Status

| Piece | State | Evidence |
|---|---|---|
| Opening cinematic + menu | working; menu has SND toggle + blips/confirm/chime (never heard by a human) | live |
| Index mode + contact form | **verified PASS** (4 rounds) | `docs/verify/contact-form.md` |
| Backend (contact + silent visits) | **verified PASS** locally (77 tests); real Resend/Upstash/Vercel **untested** | `docs/verify/backend-contact.md`, `docs/api.md` |
| Story engine (HUD, unlock cards, audio, pixelate) | **verified PASS** round 2; later additive changes (unlockGroup, toast moved under HUD bar, `whenRunning`, arcade track, `sfx.impact`) not re-verified | `docs/verify/story-engine.md` |
| Story shell | built + fixes applied (AppBoundary/chunkGuard etc.); its verification report is round-1 **FAIL**, fixes **not re-verified**; `StoryMode.tsx` tail was rebuilt by an agent — worth a diff check | `docs/verify/story-shell-ch1.md` |
| Chapter 1 `ch1-walk` | rebuilt top-down; **Risheek approved the look**; checked only by builder + lead screenshots; sound unheard | — |
| Chapter 2 `ch2-select` | built (Tekken-style bust portraits, VS, fight, K.O., WINNER, 3 cards); lead looked at 4 frames; **not verified, not heard**; Risheek: "very cool… can be a little better" + a conceptual concern (§6) | — |
| Chapters 3, 4, 5 | **not started** (storyboard in `docs/STORYBOARD.html`) | — |

## 6. Latest feedback on Chapter 2 (to act on next)

Risheek: Chapter 2 is cool and the fighting scene can be improved a bit, but it "looks very AI": you can see what's going on, but you can't *understand* it — it takes three or four things he did and turns them into character-select menus, people, and match moves. **"Let's look into that."**
My reading: the arcade metaphor is legible as imagery but explains nothing; the achievements are lost under game conventions ("THE FIELD", fake HP bars, invented stat labels like `TOOLS ARDUINO`). Ideas to discuss before more building:
1. Lead with **real evidence** (his photos/videos, event names, certificates) and use the arcade UI only as a thin frame.
2. Keep the fight only for karate (a real competition) and present stage/council/robotics as plain, specific, factual cards (no fake stats).
3. Drop invented game text; every on-screen word must be something he actually did.
4. Or change the container entirely (e.g. a yearbook / trophy shelf / timeline of real artifacts) and keep Tekken only for the karate moment.
Also small Ch2 polish already spotted: dim info text on the select screen (too low contrast), roster cursor box covers the neighbouring tile, "FIGHT!" overlaps heads slightly, phone text small.

### 6b. Chapter 2 decision (session 2, 2026-10-12) — supersedes §6 ideas
Concept page: `docs/CHAPTER2-LADDER-CONCEPT.html` (Risheek agreed). Chapter 2 is rebuilt as **the ladder**:
- Opens on a Tekken-style **select screen**: only "you" unlocked, other slots locked "?" (= future chapters). Ends on the same screen unlocking the high-school you → Chapter 3. A select screen also goes **before Chapter 1** (style TBD — Risheek does NOT want Pokémon style there).
- Side view, one cel-shaded style for the whole chapter (no pixels). Character = same anchors every chapter (short hair, round glasses, light-brown skin, black jacket), redrawn per chapter medium, older each time.
- Route: climb ladder 1 → **karate**: full Tekken fight in a **gi** (whole karate floor in gi), faceless shadow opponent, K.O. → walk past framed **photo** (him with the medal) → ladder 2 → **stage: he takes a bow**, counter to 2,000 (~2 s) → photo → ladder 3 → **council: he gives a speech at a podium**, Grade 5–10 badges light up (~2 s) → photo → unlock.
- Photos only in uniform gold frames on the wall (colour-graded), never in menus. Plain-English **caption bar** on every frame; no invented stats/text.
- Whole chapter short: ~15 s (karate fight ~6 s is the only long beat).
- Open: pre-Ch1 select-screen style? karate year/event, performance + year, council roles.
- **BUILT 2026-10-12** (builder agent; lead reviewed screenshots — looks good; NOT formally verified; audio unheard). Files: `ch2-select/{config,rig,moves,fight,sets,popup,kit,render,index,meta}.ts(x)`, `art.ts` deleted, `engine/audio.ts` + `sfx.whoosh`. duration 15.5 s. Popups at bottom, text from entries.ts. Robotics dropped from Ch2 (entry's `scene` removed; Index only). DEV params: `?ch2p=0.42`, `&ch2reduced=1`, `&ch2bench=1`.
- Builder's known gaps: engine unlock card (tier A) covers top ~40% of the phone screen for 6.5 s while the ch2 popup is up → consider compact/no card when a chapter shows its own popup; shell pixelate `ZONE_HALF` (2% of total) will eat ~1/3 of Ch2 at each end once all chapters exist → cap relative to the slot; stage bow a bit stiff; climb mixes front-on ladder with side-view body; `public/media/ch2-select/README.md` stale (photo slots now `karate`/`stage`/`council`, landscape). HUD "AGE --" placeholder still shown (ages per chapter not decided).

### 6c. Session 3 (2026-10-14)
- `ch2-select/config.ts` header now describes **arcade mode v2** (select → STAGE 1/2/3 cards → karate fight → stage bow → council speech → ALL STAGES CLEAR → NEXT LEVEL; no walking/ladders; duration 11.7 s). That is newer than §6b above; treat the code as the truth and re-confirm with Risheek that this is what he approved.
- Wrote `docs/CHAPTER3-CONCEPT.html` (7 beats, key frames, questions). **Not built yet**: waiting on Risheek's feedback and the carbon-neutral number (asked first).
- Headless Chrome via CLI returned only the "LOADING…" frame all session (even with long `--timeout` / `--virtual-time-budget`); `tsc -b` is clean and the dev server on 5173 serves modules. Use a real browser or a CDP script for visual checks.

### 6d. Chapter 3 decision (session 3, 2026-10-14)
- After rejecting several concepts (dollhouse cutaway, misty campus walk, streaming-series, sci-fi console boot, synthwave title), Risheek chose his own idea: **Chapter 3 = school-diary comic + flipbook** ("Diary of a Boarding School Kid", style homage only). Rule he set: every chapter is an **iconic, nostalgic pop-culture medium that upgrades gradually**. Don't jump to modern media early. The disc-into-console + CRT idea (`docs/TRANSITION-CH2-CH3.html`) is parked for a later chapter transition.
- Approved prototype: `docs/CHAPTER3-DIARY-PROTOTYPE.html` ("a lot better, let's build it").
- New facts (in entries.ts): NEHS = **only** chapter in the country, Risheek **founding vice president** (assumed NEHS, not SNHS; verify note left); SNHS = **first** chapter in the country (board). Added entries `esports-tournament` and `pet-therapy`. All Ch3 entries now point at scene `ch3-diary`.
- Build: `src/story/scenes/ch3-diary/` with a lead-owned contract (`CONTRACT.md`, `types.ts`, `kit.ts`, `diary.css`, `pages/index.ts`, `PageHarness.tsx` at `/?ch3-pages&spread=N&u=0.6`, wired in App.tsx DEV block). The engine plus three page modules were built in parallel by four agents. Self-hosted font `public/fonts/GochiHand.ttf` (OFL).

- **BUILT 2026-10-14** (4 agents + lead review of ~25 CDP screenshots; not formally verified; audio unheard). DUR 63.2 s. Engine files: `index.tsx, meta.ts, config.ts, book.ts, curl.ts, stage.ts, cover.ts, book.css`. Pages: `pages/*.ts` (COPY consts at the top of each = all draft wording). DEV: `?ch3p=0.42`, `?ch3reduced=1`, `window.__ch3.tl`. Phone (<1.1 aspect) = single-page mode; reduced motion = paper-dip crossfades. Unlock cards: book "dodges" the HUD toast (lead changed it to centre in the free area); on phone every page unlocks as one compact group card (**Risheek to confirm**). The ending shows the front cover again, then black (**confirm**).
- **Screenshots of Story routes:** headless `--screenshot` captures the wrong area on scrolled pages (not an app bug). Use `node tools/cdpshot.mjs <outDir> <waitMs> "name|url|w|h[|mobile|reduced]"` (CDP `Page.captureScreenshot`).
- Open requests: `shell/plan.ts` cap the cross-chapter pixelate zone at ~1 s each side (it'll hide Ch3's book drop once Ch4/5 exist); `sfx.whoosh` volume arg; Hud compact-card option. Placeholders still [NEEDED]: carbon number, subjects, Java business and duration, how far pet therapy got.

- **Audio (2026-10-14):** Risheek wants scene-relevant real sounds, not chiptune, in the diary. Recorded files are in `public/audio/` (23 MP3s, ~1.6 MB; licences in `public/audio/CREDITS.md`), played through a sample player in `engine/audio.ts` with procedural fallbacks. Ch2 has punches, kicks, block, K.O., crowd "ooh", a cheer after the stage bow and applause after the council speech. Ch3 music is now "Uplifting Funny Whistle Folk" by Emmraan (Pixabay licence, no credit needed; `music-diary.mp3`, 110 bpm, acoustic guitar + claps + whistle; alternatives `music-diary-alt1/alt2.mp3` audition at `/?audio-demo`, so delete the unchosen ones before deploy, ~3 MB; alt1 needs CC BY credit if used). "Investigations" is deleted and banned. Ch3 also has paper sounds, applause and a laugh (lonemonk, **CC BY 3.0**) on the stage page. **The credit line is in the Index footer; keep it.** `/?audio-demo` auditions everything. Unheard by a human. Flipbook riffle reworked by the lead: 24 snap-and-hold pages, with a bigger walking/growing corner doodle and a cap toss (`kit.corner`, `FLIP_FROM`).

- **End of session 3 (2026-10-14):** (1) Transition fix in `shell/plan.ts`: zones are capped at 0.9 scroll-seconds per side (`ZONE_SECONDS`), and each scene's local progress now runs over `plan.windows[i]` (its slot minus the zones), so no scene start or end is hidden under the pixelate. Ch2 also holds its select screen 1.3 s longer (`SELECT_HOLD` / `sceneProgress` in `ch2-select/config.ts`; meta.duration = `SCROLL_DUR`). The Ch3 opening was shortened (`OPEN` in `ch3-diary/config.ts`). (2) Risheek HATED "Investigations" (banned, as is the synth diary score). An agent was replacing it with upbeat acoustic indie-pop (`public/audio/music-diary.mp3`, plus alt1/alt2 to swap in `/?audio-demo`); check its result and the Index footer credits. (3) Chapter 4 direction still open: proposed "2000s family computer desktop" (CRT, CD-ROM boot, visa error dialog → CONTINUE?, Décor Tycoon window $60→$16K, 21-in-21 folder, tester app, events) → Ch5 "real life" SF. Waiting on his two answers.


### 6e. Session 4 (2026-10-15): all five chapters built
- **Ch4 `ch4-desktop`** (2000s family PC, 73 s) and **Ch5 `ch5-sf`** (golden-hour San Francisco + Adobe card + Game Boy "save your progress?" + final screen with Contact/Index/GitHub/LinkedIn/Instagram/Email, 12.5 s) built from the approved prototype `docs/CHAPTER4-5-PROTOTYPE.html`. Risheek's changes: pet brand BEFORE the Décor Tycoon; more readable text. Lead reviewed ~60 screenshots (desktop + phone); not formally verified.
- Ch4 ends on Ch5's exact first frame (Ch4 renders `ch5-sf/City` at frame 0), and Ch5 has `meta.softEntry` (new flag in `engine/types.ts`, read in `shell/plan.ts`) so the boundary crossfades instead of pixelating.
- **Audio for Ch4/Ch5**: `sfx.desk(cue)`, `sfx.city(cue)`, music `desk` ("Energetic Funky Groove") and `city` ("Soft Hopeful Piano"), runners-up `deskAlt`/`cityAlt`. All CC0/Pixabay; full table in `public/audio/CREDITS.md`; a voluntary credits line for all sound/music is in the Index footer (Risheek asked for sfx credits). **Nobody has heard any of it.** Before deploy delete the unchosen runner-ups (`music-desk-alt`, `music-city-alt`, `music-diary-alt1/2`, ~5 MB).
- **Polish (Ch1–3 + shell):** Ch1 canvas now fits above the dock (its text box was hidden); HUD unlock cards shorter (A 4.2 s, B 3.4, C 2.4; backlog 1.6 s each), smaller, no blurb, no HUD applause, queued cards from earlier chapters dropped on chapter change; `visa` moved to tier B; HUD total = entries with a scene (31); "AGE --" removed; dock shows full names only where they fit (short names on phone); Ch2 "PHOTO COMING" tag removed (illustrations stay until photos arrive: `ch2-select/config.ts` `PHOTOS`).
- **Later on 2026-10-15:** (1) The opening: a 2D illustrated replacement was tried and Risheek HATED it; it was reverted. The opening stays the R3F 3D scene (`src/gate/Opening.tsx` + `src/gate/opening3d/*`), now developed in place with more detail (brick exterior, posters, furniture, a properly built kid in a black hoodie with glasses, detailed handheld close-up, soft shadows). Same camera path and timing. Opening chunk ~289 KB gzip. (2) Ch5 has a "Bay Area" card: UC Berkeley summer session (film and business), build sessions, consulted for Adobe; new entry `berkeley-summer` (category `Education`), so 32 story achievements. (3) Runner-up music files deleted (main picks kept). (4) `.story-layer` is now `isolation: isolate` (a scene's z-index leaked over Ch5 during the Ch4→Ch5 crossfade).
- Still open: photos (Ch2 karate/stage/council, Ch1 childhood), brand/accelerator/investor/university names, carbon number (all shown as placeholders or unnamed), §8 verify notes, Vercel deploy + Resend env vars, a real-browser/phone listen-through.

## 7. Known issues / not verified

- **Audio has never been heard by anyone** (agents verified only AudioContext state/levels). Ask Risheek to report what he hears on the menu, Ch1, Ch2.
- Intermittent blank frames seen in headless runs were most likely **cold Vite dev-server compile** (first request after a change is slow) — run each render twice. An intermittent "empty popup box" was hardened (box skipped until font ready; self-hosted fonts).
- Phone layout checked only at a few frames; Ch2 phone text is small. Real-GPU frame rate and Lenis smooth-scroll feel untested. iOS Safari untested.
- Backend: never run on Vercel/Resend/Upstash. **Before submitting:** set env vars in Vercel (`RESEND_API_KEY` required; sign up to Resend with risheeknawka@gmail.com or sends fail; optional `CONTACT_SIGNING_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`, `STATS_TOKEN` ≥32 chars), do a **Preview deploy**, send one real test message, follow the "Before launch" checklist in `docs/api.md`. A mock-mode form says "sent" but discards messages.
- oxlint: only known warnings (`only-export-components` on scene `meta` re-exports; `set-state-in-effect` in StoryMode/pixelate; `Opening.tsx` purity/refs).
- Raw `/#highlights`-style URLs land on the menu (accepted). Google Fonts still used for the page (not scene text).
- Photo slots untested with real photos. Ch1 `PHOTO.src` and Ch2 `PHOTOS.*` are empty.

## 8. Facts still needing Risheek's confirmation (`verify` notes in entries.ts)

- `science-talent` — exact exam name and rank (currently worded "top positions" everywhere; never "top rank")
- `martial-arts` — year (2018, from memory), exact event name/division
- `performing-arts` — which performance (2,000 people) and the year
- `student-council` — roles held, elections won (council = **Grade 5 to Grade 10**, then he moved schools; NOT "to graduation")
- `robotics` — competition names/levels, 1–2 specific projects
- `english-honor-society`, `science-honor-society` — exact names + "only/first in the country" wording
- `carbon-neutral` — a number (tonnes, people, what changed) · `subject-awards` — which subjects
- `java-inventory` — business name, how long in use (hand-coded Java inventory + morning/lunch ordering system, no AI)
- `visa` — name the university? · `accelerator` — name
- `decor-brand` — brand name, revenue proof ($60 → ~$16K in <6 months), investors · `pet-brand` — name; can "never existed before" be claimed?
- `content-pitch` — investor name/anonymous, follower numbers · `unconference` — "youngest" wording (Product Folks Unconference 2025)
- `prototyping-class` — confirm "prototyping", student count · `adobe` — OK to name; Firefly GTM/competitive analysis for India
- 21-in-21: 7 shipped (`projects.ts`), 14 to come; each needs title/one-liner/link as shipped.

## 9. What to do next (suggested order)

1. **Chapter 2 rethink** with Risheek (§6) — discuss, then a small concept page, then adjust. Keep it lean.
2. **Chapter 4 (44% of the story, what a16z cares about most)** — discuss each scene with him, then mock, then build: *Continue? 9…8…7* (visa → accelerator), *$60 → $16K* counter, *Pokédex of 21* (7 live projects, 14 locked), then pitch, idea-testing platform demo, badge/whiteboard, pet-care brand. Needs: brand names, revenue proof, which investor, project one-liners (see storyboard Chapter 4, Tier A/B/C unlock model).
3. **Chapter 3 (38%)** — showpieces first: interactive electric-motor thesis, carbon-neutral meter, then guild wall, rhythm game (stage fright), "Zero AI" Java terminal. Needs the §8 numbers.
4. **Chapter 5** — San Francisco / Adobe + the final ask (trophy case, contact form, Index).
5. **One lean verification** of shell + all chapters together; then the Vercel preview deploy checklist.
6. Small pending items: session-only mute default, `chapters[1]`-style combined unlock cleanups (Ch1 now unlocks per box), trophy case, deploy, photos when he sends them (gi photo first).

**Practical gotchas for agents:** use headless Chrome with `--timeout=7000+` (not `--virtual-time-budget`) for canvas/WebGL; run each screenshot twice; phone sizes via CDP `Emulation.setDeviceMetricsOverride` (headless ignores widths < ~500); the dev server on 5173 may be dead — check before opening tabs; give agents their own ports (5950/6100+ used so far); agents must not run `git add/commit`; agent IDs from this session won't exist next time — spawn fresh agents with focused prompts (see `.claude/agents/*.md`).

## 10. Useful files to open first next session

`HANDOFF.md` · `AGENTS.md` · `docs/STORYBOARD.html` (the full chapter plan) · `docs/CHAPTER1.md` · `src/content/entries.ts` · `src/story/scenes/ch2-select/config.ts` · `src/story/scenes/ch1-walk/config.ts` · `docs/verify/*.md` · `docs/api.md`.
