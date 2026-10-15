# Chapter 3 · "Diary of a Boarding School Kid" · build contract

Read this whole file before writing code. Also read `AGENTS.md` (repo root) and `HANDOFF.md` §3 (Risheek's standing decisions).

## What this chapter is

High school (38% of the story) told as a **school-diary comic + flipbook**, in the style of the famous middle-school diary books (lined pages, black-and-white cartoons, speech bubbles, deadpan first-person voice). **Evoke the style only**: no copied characters, covers, logos or jokes from any real book.

The approved look is the prototype `docs/CHAPTER3-DIARY-PROTOTYPE.html`. Risheek said "this is a lot better, let's build it." Open it in a browser and match it. His earlier rejections, so you don't repeat them: sci-fi/synthwave gradients, chrome text, generic "techy" fonts, wobbly coloured doodles, crest walls, anything that "looks AI" (pretty but meaningless). Every drawing must **show the actual thing he did**.

## Voice and facts (non-negotiable)

- Deadpan, self-deprecating, short sentences. Facts stated plainly, never boasted. No exclamation marks on achievements.
- **Every claim comes from `src/content/entries.ts`.** Read it with `entry(id)` from `kit.ts` (title, blurb, stat). Framing jokes are fine; jokes must not add facts (no invented numbers, names, dialogue that implies events, places or people).
- Anything unknown is shown with `needed('…')` (grey `[…]`), never guessed. Examples: the carbon number, which subjects, the Java business name, the esports game.
- Keep each page's narration in a `COPY` constant at the top of its module, so Risheek can edit wording in one place. All wording is a draft.

## Files and ownership

```
src/story/scenes/ch3-diary/
  CONTRACT.md  types.ts  kit.ts  diary.css  PageHarness.tsx  pages/index.ts     ← lead-owned: read, don't edit
  index.tsx  meta.ts  config.ts  book.ts (+ any engine files)               ← ENGINE agent
  pages/opening.ts  pages/honors.ts  pages/carbon.ts                        ← PAGES agent B
  pages/motor.ts  pages/stage.ts                                            ← PAGES agent C
  pages/java.ts  pages/petTherapy.ts  pages/riffle.ts                       ← PAGES agent D
```

Edit only your own files. If you need a kit/CSS/contract change, **put it in your handoff note** (or a local helper inside your own file). Never run `git add/commit`. Don't kill other processes or the dev server on :5173 (if you need your own server, use port 62xx: A=6201, B=6202, C=6203, D=6204).

## The page model (`types.ts`)

A `DiaryPage` is `{ id, side: 'l'|'r', html, entryIds?, css?, update?(root,u), bind?(root) }`.
- `html` is the page's inner HTML. The engine wraps it in `<div class="dp-page {side} dp-{id}">…</div>` and adds the page number (`.dp-pno`). On **right** pages it also adds the flipbook corner doodle (`kit.corner(spreadIndex, SPREADS.length)`).
- `u` = 0..1 reading progress through the page's **spread**. When a page is only arriving (under a curling page) u = 0; once its spread has been turned away u = 1. **Everything must be fully drawn by u ≈ 0.8** and must look right at u = 1, because pages are also seen statically.
- `pages/index.ts` lists the spreads in order. A spread is `[left | right]` as you see the open book.

## Page coordinates

- A page is **80 × 96 units** (aspect fixed by the engine). One ruled row = 4 units; **24 rows** (row r spans y = 4r … 4r+4).
- Text: `row(r, html, classes)` puts handwriting on row r, left 9% to right 8%. Classes: `dp-month` (centred month header, row 1 by convention), `dp-day` (underlined day name), `dp-grey`, `dp-caps`, `dp-center`, `dp-small`, `dp-u2` (double underline), `dp-strike`. Rows are `white-space: nowrap`, so keep lines ≤ ~46 characters at normal size.
- Drawings: `svg(inner)` is a full-page overlay with viewBox `0 0 80 96`. Inside, use `kid()`, `person()`, `bubble()`, `panel()`, `label()`, `arrow()`, `gradCap()` and `fill="url(#dp-hatch)"` for hatching.
- **Reserved zones:** row 23, centre, is the page number. On **right** pages, the bottom-right box **x ≥ 54, y ≥ 66** (rows 17–23, right ~third) is the flipbook corner; keep it empty.
- Ink colour `INK` (#161616), paper is off-white, the only skin colour is `SKIN`. **No other colours**, except a very sparing grey.

## Animation (scroll-driven, pure function of u)

- `ink(a, b, svgInner)` draws strokes between u = a and b (fills and `<text>` fade in at the end).
- `appear(a, b, html)` writes a span of text in left to right.
- `tick(at)` is a checkbox ticked at u = at.
- Order things the way you'd read them: header, then text, then the cartoon, then the punchline. A page's ink should start around u ≈ 0.05 and finish by u ≈ 0.75.
- Extra behaviour (a meter level, a rotor angle) goes in `update(root, u)`, which must be deterministic in u.

## Interaction (optional, never required)

- Scrolling alone must show everything. Interaction is a bonus: drag a rotor, pull a meter, and so on.
- Put pointer targets inside the SVG with class `dp-hit` (the overlay is `pointer-events: none`, and dp-hit opts back in). Implement in `bind(root)` and return a cleanup function. Keep per-page state in a `WeakMap<HTMLElement, State>` keyed by root (a page can be mounted twice, e.g. as the curling front and again as the under page).
- Combine interaction state with u in `update` (e.g. `angle = u * 720 + dragged`).
- You may call `sfx.*` from `src/story/engine/audio.ts` on user interaction only (audio is silent until the user's first gesture anyway).

## Preview and verify your pages

Dev server: `http://localhost:5173` (already running; if it isn't, run `npm run dev -- --port 5173 --host` in the background). Page harness:

```
http://localhost:5173/?ch3-pages&spread=<index>&u=<0..1>
```

Spread indices: 0 open · 1 honors-carbon · 2 motor · 3 stage-java · 4 pet · 5–16 riffle · 17 final.
Headless screenshot (Git Bash):

```
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --window-size=1280,800 \
  --virtual-time-budget=12000 "--screenshot=C:\\Users\\rishe\\AppData\\Local\\Temp\\shots\\<name>.png" \
  "http://localhost:5173/?ch3-pages&spread=1&u=0.6"
```

Read the PNG yourself. Check u = 0.3, 0.7 and 1 for every page you own. The first request after an edit can be a cold compile, so run it twice. Then run `npx tsc -b` (must be clean) and `npx oxlint src/story/scenes/ch3-diary` (no new warnings in your files).

## Handoff note (end your work with this)

List: the files you changed · what each page shows (one line each) · the COPY you wrote (verbatim, so the lead can review the wording) · every `needed()` placeholder · screenshots you checked (paths) · known gaps · any requests for kit/CSS/contract changes.
