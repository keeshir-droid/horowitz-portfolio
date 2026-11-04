# CLAUDE.md: Risheek's Horowitz Academy portfolio

Start here, then read `HANDOFF.md` (full status, decisions, architecture) and `AGENTS.md` (how work gets done).

- Run: `npm run dev -- --port 5173 --host` · check: `npx tsc -b`, `npm run build`, `npx oxlint` (known warnings only).
- Screenshots: `node tools/cdpshot.mjs <outDir> <waitMs> "name|url|w|h[|mobile|reduced|js]"`.
- Content lives in one place: `src/content/entries.ts` (+ `projects.ts`). Index ranking: `HIGHLIGHT_ORDER`, `CATEGORY_ORDER`, `indexSections` there.
- Never state an unconfirmed claim; understate. Leave a `verify:` note on the entry instead of guessing.
- Don't commit or push unless Risheek asks (public repo: github.com/keeshir-droid/horowitz-portfolio).

## Still open (updated 2026-11-04)

Answered 2026-11-04 and applied: Chewcheer (pet brand, separate from Summer), Mesa School of Business (accelerator), two SEPARATE pitches: at Elevation Capital, then the next day to
Ghazal Alagh (write just "Ghazal Alagh", never "Shark Tank"), Adobe/Firefly OK, UC Davis stays unnamed, carbon numbers (30% water, ~1,100 trees, 15%,
2030 target), Language and Culture award, Java dates (Mar 2025 to Jan 2026), pet therapy story, esports, NEHS/SNHS roles, ~65 class
sign-ups, Unconference, karate 2018, performances 2014-2018, council VP + Prefect, NSTSE/NSO/IMO.

Still needed from Risheek:
1. Photos (portrait, karate, stage, council, Summer, pitch, childhood) -> `public/media/` + `image` on entries.
2. Summer revenue proof (screenshot); investors stay unnamed.
3. Robotics: competition names, 1-2 projects (entry still has a `verify`).
4. Karate division (unknown, left out); exact ranks in the science exams (never claimed).
5. `RESEND_API_KEY` in Vercel (contact form drops messages without it); a phone + sound listen-through.

## Photos (2026-11-04)
Real photos live in `public/media/` (web copies) with originals in `public/media/photos/NN-name/`. Index: `Entry.image/imageAlt/imagePos/extraImages`; "At a glance" is a 4-col board of square cells (`glance.ts` TILES: feature 2x2, wide 2x1, sq 1x1), "Everything" is uniform cards (16:10 media box; entries without a photo get a coloured stat/category block). Story: Ch1 childhood polaroid (`ch1-walk/childhood.jpg`), Ch2 framed photos (`ch2-select/{karate,stage,council}.jpg` via `PHOTOS`), Ch4 Chewcheer logo in the product doc and `pitch-wide.jpg` on the pitch slide. Ch3 and Ch5 have no photos (the art is dense; add only if a good photo exists).
