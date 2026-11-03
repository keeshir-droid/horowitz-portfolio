# CLAUDE.md: Risheek's Horowitz Academy portfolio

Start here, then read `HANDOFF.md` (full status, decisions, architecture) and `AGENTS.md` (how work gets done).

- Run: `npm run dev -- --port 5173 --host` · check: `npx tsc -b`, `npm run build`, `npx oxlint` (known warnings only).
- Screenshots: `node tools/cdpshot.mjs <outDir> <waitMs> "name|url|w|h[|mobile|reduced|js]"`.
- Content lives in one place: `src/content/entries.ts` (+ `projects.ts`). Index ranking: `HIGHLIGHT_ORDER`, `CATEGORY_ORDER`, `indexSections` there.
- Never state an unconfirmed claim; understate. Leave a `verify:` note on the entry instead of guessing.
- Don't commit or push unless Risheek asks (public repo: github.com/keeshir-droid/horowitz-portfolio).

## Waiting on Risheek (asked 2026-10-16)

Everything below is currently worded vaguely, left unnamed, or hidden on purpose. When he answers, update `entries.ts`
(and the scene copy named in brackets), delete the matching `verify:` note, and tick the item off here.

**Most valuable (top of the Index):**
1. Summer: a revenue proof screenshot (dashboard / Shopify), and which investors showed interest (name or keep anonymous).
2. Pet-care brand: its name, and is it part of Summer or separate? Can we say "a formulation that didn't exist before"? (`ch4-desktop/desktop.ts` pet sheet says "pet care" / "for dogs" for now.)
3. The investor pitch: OK to name her? Follower numbers for the Instagram/LinkedIn content.
4. Accelerator: name.
5. Adobe: confirm it's OK to name, and that the project was Firefly.
6. Top-30 US university: name it or not?
7. Projects: only 7 shipped; there is NO "21 in 21" claim any more. Add each new one to `projects.ts` as it ships.
8. Hero chips: OK with "Founder, Summer" and "Gap year, building full-time"?

**High school (Ch3 diary):**
9. Carbon-neutral project: one number or concrete result (tonnes, people, what changed). (`pages/carbon.ts` says "Lesson: carbon is everybody's job." for now.)
10. Best-in-subject awards: which subjects. (`pages/opening.ts`)
11. Java system: business name (if shareable) and how long it was used. (`pages/java.ts`)
12. Pet therapy: how far it got. (`pages/petTherapy.ts`)
13. Esports tournament: "hosted/organised" correct? Which game, how many players, year.
14. NEHS: confirm founding vice president was NEHS (not SNHS); SNHS role (board member?).
15. Prototyping class: confirm "prototyping", number of students. Unconference: confirm "youngest".

**Earlier years:**
16. Karate: year (2018?), exact event name and division.
17. 2,000-person performance: which event, which year.
18. Student council: roles held, elections won. Robotics: competition names, 1–2 projects. Science talent search: exam name + rank.

**Media and launch:**
19. Photos: karate gi/medal, stage, council (Ch2 slots), one childhood photo (Ch1), Summer product shots, pitch photo.
20. Deploy: Vercel login + a Resend account on risheeknawka@gmail.com (contact form needs `RESEND_API_KEY`).
21. Real-device feedback: where the click stops fall (`STOPS` in each scene's config), the flipbook scroll feel (`SEC_PER_PX` in `StoryMode.tsx`), and a listen-through of all audio.
22. Images for the Index: add `image: '/media/<file>'` to entries (Summer, Adobe, karate, pitch first) and `public/media/portrait.jpg`.
