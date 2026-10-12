# How this site gets built: agents only

Three domains, each with a **builder**, a **verifier** and an **integrator**. Nobody edits outside their lane.

| Domain | Builder | Verifier | Integrator |
|---|---|---|---|
| Frontend (Index mode, UI, a11y, responsive) | `frontend-builder` | `frontend-verifier` | `frontend-integrator` |
| Cinematic (R3F scenes, shaders, camera, transitions, audio) | `cinematic-builder` | `cinematic-verifier` | `cinematic-integrator` |
| Backend (Vercel serverless API) | `backend-builder` | `backend-verifier` | `backend-integrator` |

Definitions live in `.claude/agents/`.

## The loop (per task)

1. **Brief.** One task, one domain, one acceptance list ("done means…"). Written by the lead (Claude + Risheek).
2. **Build.** The builder works only inside its owned paths and ends with a **handoff note** (files, contract, how to preview, known gaps).
3. **Verify.** The verifier tests the result *independently*, in a real browser/with real requests, against the brief. It never edits source. It writes `docs/verify/<task>.md` ending in `PASS` or `FAIL` with evidence.
4. **Fix loop.** On FAIL the builder fixes only what the report lists. Max 2 rounds, then escalate to the lead.
5. **Integrate.** On PASS the integrator wires the work into the app (registry, routes, state, bundle) and runs the full build.
6. **Verify integration.** The verifier runs again against the integrated app (regression: the opening, the menu, Index mode, Story mode all still work).

No step is skipped, and "it built" is not "it works."

## Ownership (who may edit what)

| Paths | Owner |
|---|---|
| `src/index-mode/**`, `src/components/**`, shared UI styles | frontend-builder |
| `src/gate/**`, `src/story/scenes/**`, `src/story/engine/**`, `public/audio/**` | cinematic-builder |
| `api/**`, `src/lib/api.ts`, `docs/api.md` | backend-builder |
| `src/App.tsx`, `src/store.ts`, `src/story/StoryMode.tsx` (scene registry), `package.json`, `vite.config.ts`, `vercel.json` | integrators (one at a time) |
| `src/content/**` | Risheek / lead. Builders *propose* changes in their handoff; they don't edit it |
| `docs/verify/**` | verifiers only |

## Contracts (so builders can work in parallel)

- **Content:** every achievement comes from `src/content/entries.ts` / `projects.ts`. Never hard-code a claim in a scene or a component. Entries with a `verify` note must not be presented as confirmed fact beyond what the entry text says.
- **Scene contract (cinematic):** each scene is a folder `src/story/scenes/<id>/index.tsx` default-exporting a React component that accepts `{ progress: number /*0..1 through the scene*/, active: boolean }` and a named export `meta = { id, chapter, duration /*seconds of scroll-time*/, entryIds: string[] }`. Scenes are pure of global state; the integrator registers them.
- **API contract (backend):** every endpoint is documented in `docs/api.md` (method, path, request, response, errors, rate limits). The frontend only talks to the backend through `src/lib/api.ts`.

## Non-negotiables

- **Index mode and the menu must always work**, even if WebGL, the backend or audio fails. Everything fancy degrades gracefully.
- **Performance budget:** menu + Index < 100 KB gzipped JS; heavy 3D code stays lazy-loaded; target 60 fps on a mid laptop; a lighter path for mobile and `prefers-reduced-motion`.
- **Accessibility:** keyboard operable, visible focus, readable contrast, skip option on anything timed.
- **No invented facts** about Risheek. Missing media is a labelled placeholder, never a fake.
- **No secrets in the repo** (use env vars; document names in `docs/api.md`).

## Verification recipe (browser)

```powershell
npm run build
npx vite preview --port 4173        # keep running in background
$ch = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
& $ch --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist `
  --hide-scrollbars --window-size=1280,720 --virtual-time-budget=8000 `
  "--screenshot=$env:TEMP\shots\name.png" "http://localhost:4173/?t=4.8"
```

Then read the PNG. Useful URLs: `/?t=<seconds>` jumps the opening to a moment; `/#/index` and `/#/story` open the modes directly. Use a mobile viewport (`--window-size=390,844`) too. Stop the preview server when done.

## Approved backend scope

- **Contact-message form: APPROVED** (2026-10-11). A visitor can send Risheek a message from the site; it is delivered to risheeknawka@gmail.com. Needs spam protection, input limits and a clear success/failure state.
- **Visit counting: APPROVED as silent recording only.** Count page loads (total + per day) with no cookies, no IP storage and no personal data; exclude obvious bots. Never display it on the site. A read endpoint exists only for Risheek, protected by a secret token. Revisit showing it only if the numbers are genuinely impressive.
- Guestbook ("high scores"): **not approved**; do not build.
