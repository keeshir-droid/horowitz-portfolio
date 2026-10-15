/**
 * Chapter 3 "Diary of a Boarding School Kid": the contract between the book engine and the page modules.
 * Read CONTRACT.md in this folder before editing anything here.
 */

/** One page of the diary. Page modules export these; the engine mounts, curls and animates them. */
export interface DiaryPage {
  /** Unique, kebab-case. Also used as a CSS scope: the engine adds class `dp-<id>` to the page root. */
  id: string
  /** 'l' = left-hand page, 'r' = right-hand page (decides the gutter shadow side). */
  side: 'l' | 'r'
  /**
   * Inner HTML of the page. The engine wraps it in the ruled paper (`.dp-page`), adds the page number and, on
   * right pages, the flipbook corner doodle. Coordinate system: see CONTRACT.md (80 x 96 units, 24 rows).
   */
  html: string
  /** Entry ids (src/content/entries.ts) this page proves. Unlocked once the page's spread has been read a little. */
  entryIds?: readonly string[]
  /** Optional page-specific CSS, injected once. Scope every selector under `.dp-<id>`. */
  css?: string
  /**
   * Optional per-frame hook while the page is mounted. `u` = 0..1 through this page's spread reading time
   * (0 while the page is still arriving, 1 once its spread has been turned away). Must be a pure function of `u`
   * plus any interaction state the page keeps for itself. Ink (`.dp-draw`), ticks and `.dp-appear` are handled
   * by the engine via `applyInk`; only use this for extra behaviour (a meter value, a spinning rotor...).
   */
  update?: (root: HTMLElement, u: number) => void
  /** Optional: attach pointer interactions when mounted. Return a cleanup function. */
  bind?: (root: HTMLElement) => () => void
}

/** Kinds of spread, for pacing: 'read' = a normal spread with dwell time, 'riffle' = flipbook page, 'final' = the last spread. */
export type SpreadKind = 'read' | 'riffle' | 'final'

export interface Spread {
  /** Stable key; config.ts maps it to a dwell time. */
  key: string
  kind: SpreadKind
  left: DiaryPage
  right: DiaryPage
}
