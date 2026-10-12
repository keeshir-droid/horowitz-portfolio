export type ChapterId = 1 | 2 | 3 | 4 | 5

export type Category =
  | 'Building'
  | 'Awards'
  | 'Leadership'
  | 'Performance'
  | 'Research'
  | 'Teaching'
  | 'Art'
  | 'Consulting'

export interface Chapter {
  id: ChapterId
  era: string
  /** The visual language this chapter is told in (Story mode). */
  format: string
  accent: string
  /** Share of the Story-mode runtime. */
  weight: number
}

export interface Entry {
  id: string
  chapter: ChapterId
  title: string
  blurb: string
  category: Category
  /** Shown in the Highlights strip at the top of Index mode. */
  highlight?: boolean
  /** The one number that proves it. */
  stat?: { value: string; label: string }
  links?: { label: string; href: string }[]
  /** Placeholder label for photo/video to be uploaded later. */
  media?: string
  /** Story-mode scene that tells this entry (so Index can link into Story). */
  scene?: string
  /** Wording to confirm with Risheek before this ships. */
  verify?: string
}

export interface Project {
  day: number
  title: string
  blurb: string
  /** undefined = not built yet (locked slot in the Pokédex). */
  url?: string
  kind?: 'site' | 'skill'
  note?: string
}
