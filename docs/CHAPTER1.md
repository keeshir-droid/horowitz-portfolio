# Chapter 1 — spec v2 (supersedes the Chapter 1 section of STORYBOARD.html)

**Decided with Risheek (2026-10-11):** primary-school wins do not impress the audience (a16z) and must not read as boasting. Chapter 1 is a short, warm prologue about *curiosity*, not about winning.

## Tone
- Humble, light, a little funny. The kid is curious, not triumphant.
- Wins are a quiet footnote, never the plot. No applause-heavy "ta-da" ceremonies, no "again?" gag.
- Runtime: **~15 seconds** (about 5% of the story).

## The kid (pixel avatar)
- Short hair, round glasses, brown skin tone.
- **No uniform.** A black jacket and cool, casual clothes (e.g. black jacket, a bright tee underneath, sneakers).
- Same character is redrawn in each chapter's style (pixel now; later chapters change the look but it's always recognisably him).

## What happens
1. START JOURNEY fades the menu into a small pixel town. **First sound of the site starts here**, on the click that chose START JOURNEY (browsers allow audio after that gesture): a soft 8-bit town theme, footsteps.
2. Scrolling walks the kid right. He passes small things that spark curiosity — a chess board, a paintbrush/easel, a science kit, a toy robot — and stops at each for a beat (he pokes it; it does something delightful). These are the seeds of "creative technologist", not trophies. *(Exact props depend on what he was actually into — open question.)*
3. At the end of the street there is a modest shelf in a window with a few small trophies on it. The camera doesn't linger. One compact unlock card appears, **Tier C**, as a single line:
   > Early wins: national art competition, academic Olympiads, top rank in a national science talent search, school chess champion (Grade 5).
4. Exit: the street lights come on, the town pixelates into the Chapter 2 fighter-select (pixelate transition from the engine).

## Achievements in this chapter (all Tier C, one combined card)
`national-art`, `olympiads`, `science-talent`, `every-year`, `chess` all unlock together at the shelf. Index mode still lists them individually with full detail (that's where a reviewer who cares can read them).

## Sound
Procedural (engine `audio.ts`): `music.play('town')` on entering Chapter 1, footstep blips tied to scroll, one soft `coin` ping at the shelf. No applause.

## Opening sound rule (applies to the whole site)
The opening cinematic is **silent**. Audio unlocks on the first user gesture (clicking START JOURNEY / JUST SHOW ME or pressing Enter), via `audio.unlock()`; the mute toggle is always visible. Index mode stays silent unless the user opts in.

## Follow-ups for the content file (after the engine verification finishes, to avoid disturbing it)
- Set `chapters[1].weight` to 5 (and redistribute: ch2 6, ch3 38, ch4 44, ch5 7).
- Point all five Chapter 1 entries' `scene` at `ch1-walk`.
- Tier map: all Chapter 1 entries are tier C.
