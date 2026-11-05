import { chapters, entries } from '../content/entries'
import type { ChapterId, Entry } from '../content/types'

const byId = (id: string): Entry => {
  const e = entries.find((x) => x.id === id)
  if (!e) throw new Error(`glance.ts: unknown entry id "${id}"`)
  return e
}

/** Optional photo for an entry: `Entry.image` / `imageAlt`; nothing renders until it is set. */
export const imageOf = (e: Entry): { src: string; alt: string } | undefined =>
  e.image ? { src: e.image, alt: e.imageAlt ?? '' } : undefined

/** The numbers strip under the hero (value + label come straight from each entry's `stat`). */
export const STAT_IDS = ['decor-brand', 'adobe', '21-in-21', 'content-pitch', 'martial-arts']
export const stats = STAT_IDS.map(byId).filter((e) => e.stat)

export type TileSize = 'feature' | 'wide' | 'sq'
/** "At a glance" board: 4 columns of square cells. feature = 2x2, wide = 2x1, sq = 1x1 (4 + 4 + 2 + 6 = 16 cells, no gaps). */
export const TILES: { id: string; size: TileSize; dots?: boolean; stamp?: string }[] = [
  { id: 'decor-brand', size: 'feature', stamp: 'Founder' },
  { id: 'solse', size: 'feature', stamp: 'Founder' },
  { id: 'adobe', size: 'wide' },
  { id: 'content-pitch', size: 'sq' },
  { id: 'martial-arts', size: 'sq' },
  { id: '21-in-21', size: 'sq', dots: true },
  { id: 'english-honor-society', size: 'sq' },
  { id: 'science-honor-society', size: 'sq' },
  { id: 'carbon-neutral', size: 'sq' },
]
export const tiles = TILES.map((t) => ({ ...t, entry: byId(t.id) }))

/** One honest line per chapter for the path (kept understated on purpose), and the medium it is told in. */
const PATH: Record<ChapterId, { line: string; medium: string }> = {
  1: { line: 'A curious kid: art, chess, Olympiads.', medium: 'Game Boy' },
  2: { line: 'Karate, the stage, student council.', medium: 'Arcade fighter' },
  3: { line: 'Honor societies, research, building by hand.', medium: 'School diary' },
  4: { line: 'Summer, Solse, a pet-care brand, projects shipped.', medium: 'Family PC' },
  5: { line: 'Berkeley summer session, and Adobe.', medium: 'Golden hour' },
}
export const path = ([1, 2, 3, 4, 5] as ChapterId[]).map((id) => ({
  id,
  era: chapters[id].era,
  accent: chapters[id].accent,
  line: PATH[id].line,
  medium: PATH[id].medium,
}))
