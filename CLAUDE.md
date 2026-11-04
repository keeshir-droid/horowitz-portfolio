# CLAUDE.md: Risheek's Horowitz Academy portfolio

Start here, then read `HANDOFF.md` (full status, decisions, architecture) and `AGENTS.md` (how work gets done).

- Run: `npm run dev -- --port 5173 --host` · check: `npx tsc -b`, `npm run build`, `npx oxlint` (known warnings only).
- Screenshots: `node tools/cdpshot.mjs <outDir> <waitMs> "name|url|w|h[|mobile|reduced|js]"`.
- Content lives in one place: `src/content/entries.ts` (+ `projects.ts`). Index ranking: `HIGHLIGHT_ORDER`, `CATEGORY_ORDER`, `indexSections` there.
- Never state an unconfirmed claim; understate. Leave a `verify:` note on the entry instead of guessing.
- Don't commit or push unless Risheek asks (public repo: github.com/keeshir-droid/horowitz-portfolio).

## Still open (updated 2026-11-04)

Answered 2026-11-04 and applied: Chewchew (pet brand, separate from Summer), Mesa School of Business (accelerator), pitch at Elevation
Capital + Ghazal Alagh's attention (named), Adobe/Firefly OK, UC Davis stays unnamed, carbon numbers (30% water, ~1,100 trees, 15%,
2030 target), Language and Culture award, Java dates (Mar 2025 to Jan 2026), pet therapy story, esports, NEHS/SNHS roles, ~65 class
sign-ups, Unconference, karate 2018, performances 2014-2018, council VP + Prefect, NSTSE/NSO/IMO.

Still needed from Risheek:
1. Photos (portrait, karate, stage, council, Summer, pitch, childhood) -> `public/media/` + `image` on entries.
2. Summer revenue proof (screenshot); investors stay unnamed.
3. Robotics: competition names, 1-2 projects (entry still has a `verify`).
4. Karate division (unknown, left out); exact ranks in the science exams (never claimed).
5. `RESEND_API_KEY` in Vercel (contact form drops messages without it); a phone + sound listen-through.
