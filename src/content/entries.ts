import type { Category, Chapter, ChapterId, Entry } from './types'
import { projectsLive } from './projects'

export const person = {
  name: 'Risheek Nawka',
  title: 'Creative technologist',
  age: 19,
  tagline: 'I build things where art and technology meet.',
  /** One-line facts under the name in Index mode (for reviewers who read nothing else). */
  facts: ['Founder, Summer', 'Consulted for Adobe', `${projectsLive} creative-tech projects shipped`, 'Gap year, building full-time'],
  contact: {
    email: 'risheeknawka@gmail.com',
    linkedin: 'https://www.linkedin.com/in/risheek-nawka/',
    github: 'https://github.com/keeshir-droid',
    instagram: 'https://instagram.com/keeshir',
  },
}

export const chapters: Record<ChapterId, Chapter> = {
  1: { id: 1, era: 'Primary school', format: 'Pixel overworld', accent: '#9bbc0f', weight: 5 },
  2: { id: 2, era: 'Middle school', format: 'Character select', accent: '#ff5d73', weight: 6 },
  3: { id: 3, era: 'High school', format: 'Mixed media', accent: '#4cc9f0', weight: 38 },
  4: { id: 4, era: 'The builder years', format: 'Startup sim', accent: '#ffc857', weight: 44 },
  5: { id: 5, era: 'San Francisco', format: 'Skyline', accent: '#c77dff', weight: 7 },
}

/** Single source of truth. Story mode and Index mode both read this. */
export const entries: Entry[] = [
  // ───────────── Chapter 1 · Primary school ─────────────
  {
    id: 'national-art',
    chapter: 1,
    title: 'National art competition winner',
    blurb: 'Won a national art competition.',
    category: 'Art',
    media: 'artwork photo',
    scene: 'ch1-walk',
  },
  {
    id: 'olympiads',
    chapter: 1,
    title: 'Academic Olympiads',
    blurb: 'Won a long list of academic Olympiads.',
    category: 'Awards',
    scene: 'ch1-walk',
  },
  {
    id: 'science-talent',
    chapter: 1,
    title: 'Top positions in national science exams (NSTSE, NSO, IMO)',
    blurb: 'Placed among the top positions in the National Level Science Talent Search Examination (NSTSE), the National Science Olympiad (NSO) and the International Mathematics Olympiad (IMO).',
    category: 'Awards',
    scene: 'ch1-walk',
  },
  {
    id: 'every-year',
    chapter: 1,
    title: 'Called to the stage, every year',
    blurb:
      'From first grade until COVID, invited to every award ceremony and given an award, because I achieved something each year.',
    category: 'Awards',
    stat: { value: 'Grade 1 →', label: 'an award every year' },
    scene: 'ch1-walk',
    media: 'ceremony photos',
  },
  {
    id: 'chess',
    chapter: 1,
    title: 'Best chess player in the school',
    blurb: 'Awarded the best chess player in the entire school trophy in fifth grade.',
    category: 'Awards',
    scene: 'ch1-walk',
    media: 'trophy photo',
  },

  // ───────────── Chapter 2 · Middle school ─────────────
  {
    id: 'martial-arts',
    chapter: 2,
    title: 'International karate champion (Seisenkai Shitoryu)',
    blurb: 'Won gold at the 4th International Karate Championship in 2018, competing in Seisenkai Shitoryu.',
    category: 'Awards',
    highlight: true,
    stat: { value: 'Gold', label: '4th International Karate Championship, 2018' },
    scene: 'ch2-select',
    media: 'medal / gi photo',
  },
  {
    id: 'performing-arts',
    chapter: 2,
    title: 'Performed in front of 2,000 people',
    blurb: 'Performed on stage in front of an audience of 2,000, across theater, dance and performing arts, over several years from 2014 to 2018.',
    category: 'Performance',
    stat: { value: '2,000', label: 'people in the audience' },
    scene: 'ch2-select',
  },
  {
    id: 'student-council',
    chapter: 2,
    title: 'Student council, grade 5 to grade 10',
    blurb: 'A member of student council from fifth grade until I left the school in tenth grade, serving as Vice President and Prefect, winning elections and being nominated every year.',
    category: 'Leadership',
    stat: { value: 'Grade 5 → 10', label: 'Vice President and Prefect' },
    scene: 'ch2-select',
  },
  {
    id: 'robotics',
    chapter: 2,
    title: 'Robotics: Arduino and microcontroller projects, coded by hand',
    blurb: 'Built many Arduino and microcontroller projects and coded them by hand, without AI, and represented my school in competitions.',
    category: 'Building',
    // Dropped from the Chapter 2 scene (2026-10-12); Index mode only until it gets a scene.
    media: 'robot / project photos',
    verify: 'Competition names/levels, and 1-2 specific projects worth naming.',
  },

  // ───────────── Chapter 3 · High school ─────────────
  {
    id: 'english-honor-society',
    chapter: 3,
    title: 'Founding vice president, National English Honor Society',
    blurb: 'Founding vice president of the National English Honor Society (NEHS) chapter at my school, the only one in the country.',
    category: 'Leadership',
    stat: { value: 'Only', label: 'NEHS chapter in the country' },
    scene: 'ch3-diary',
  },
  {
    id: 'science-honor-society',
    chapter: 3,
    title: 'Board, Science National Honor Society (first chapter in the country)',
    blurb: 'On the board of the Science National Honor Society (SNHS) chapter at my school, the first one in the country. An honor society, not a club.',
    category: 'Leadership',
    stat: { value: 'First', label: 'SNHS chapter in the country' },
    scene: 'ch3-diary',
  },
  {
    id: 'boarding-school',
    chapter: 3,
    title: 'Moved to boarding school',
    blurb: 'Moved away from home to boarding school.',
    category: 'Leadership',
    scene: 'ch3-diary',
  },
  {
    id: 'carbon-neutral',
    chapter: 3,
    title: 'Head of the carbon-neutral project',
    blurb:
      "Led the school's flagship sustainability initiative. Water wastage fell by around 30%, close to 1,100 trees were planted, and other efforts cut the overall carbon footprint by 15% (more as the saplings grow). The work continues towards a carbon-neutral school by 2030.",
    category: 'Leadership',
    stat: { value: '~1,100 trees', label: 'planted; water waste down ~30%, carbon footprint down 15%' },
    scene: 'ch3-diary',
    media: 'project photos',
  },
  {
    id: 'lesson-plans',
    chapter: 3,
    title: 'Co-designed lesson plans with teachers',
    blurb: 'Co-designed multiple lesson plans with my teachers.',
    category: 'Teaching',
    scene: 'ch3-diary',
  },
  {
    id: 'music',
    chapter: 3,
    title: 'Musical performances, stage fright beaten',
    blurb: 'Played in multiple musical performances, overcoming stage fright and a fear of music.',
    category: 'Performance',
    scene: 'ch3-diary',
    media: 'performance video',
  },
  {
    id: 'standup-paper',
    chapter: 3,
    title: 'Research paper on stand-up comedy',
    blurb: 'Wrote a research paper on stand-up comedy.',
    category: 'Research',
    scene: 'ch3-diary',
    media: 'paper cover',
  },
  {
    id: 'motor-thesis',
    chapter: 3,
    title: 'Thesis on electric motor propulsion',
    blurb: 'Wrote a thesis paper on electric motor propulsion.',
    category: 'Research',
    scene: 'ch3-diary',
    media: 'thesis / diagrams',
  },
  {
    id: 'subject-awards',
    chapter: 3,
    title: 'Perfect predicted scores, and the Language and Culture award',
    blurb: 'Perfect predicted scores in most of my subjects, and the subject award in Language and Culture.',
    category: 'Awards',
    scene: 'ch3-diary',
  },
  {
    id: 'java-inventory',
    chapter: 3,
    title: 'Hand-coded Java inventory & meal-ordering system',
    blurb:
      'Built, by hand in Java and without AI, an inventory management system and a morning/lunch ordering system for a local business. It ran from March 2025 to January 2026, until a newer AI-built system replaced it.',
    category: 'Building',
    highlight: false,
    stat: { value: '0 AI', label: 'every line written by hand' },
    scene: 'ch3-diary',
  },
  {
    id: 'esports-tournament',
    chapter: 3,
    title: "Organised and hosted the school's first formal esports tournament",
    blurb: 'Organised and hosted the first formal esports tournament at my school, with a good number of teams and cash prizes.',
    category: 'Leadership',
    scene: 'ch3-diary',
  },
  {
    id: 'pet-therapy',
    chapter: 3,
    title: 'Proposed a pet therapy initiative at school',
    blurb:
      'The first person at my school to build a pet therapy proposal. It got approvals, I found a location on a very cramped campus, and worked out where to get the pets and how to get them vaccinated. It stalled on budget: the annual board meeting fell about 8 days before the proposal was final, and a CSR sponsor was hard to find in my senior year.',
    category: 'Leadership',
    scene: 'ch3-diary',
  },

  // ───────────── Chapter 4 · The builder years ─────────────
  {
    id: 'visa',
    chapter: 4,
    title: 'Admitted to a top-30 US university. Visa said no.',
    blurb:
      'Wanted to study film and computer science in America. Got into a top-30 US university and could not go because of visa troubles. So I started building.',
    category: 'Awards',
    scene: 'ch4-desktop',
  },
  {
    id: 'accelerator',
    chapter: 4,
    title: 'Joined the Mesa School of Business accelerator',
    blurb: 'Joined the Mesa School of Business, a startup accelerator in India, and spent the next stretch building real businesses and products.',
    category: 'Building',
    scene: 'ch4-desktop',
  },
  {
    id: 'decor-brand',
    chapter: 4,
    title: 'Founded Summer, a home décor brand',
    blurb:
      'Started Summer to test whether people would buy home décor the way they buy fashion, with strong brand pull. Close to $16,000 in revenue in under six months from roughly $60 of initial investment. Drew investor attention.',
    category: 'Building',
    highlight: true,
    stat: { value: '$60 → ~$16K', label: 'Summer · revenue in under 6 months' },
    links: [
      { label: 'summerdecor.in', href: 'https://summerdecor.in' },
      { label: 'Instagram', href: 'https://www.instagram.com/summerdecor.in/' },
    ],
    scene: 'ch4-desktop',
    media: 'product + dashboard screenshots',
    verify: 'Revenue proof (screenshot). Investors stay unnamed.',
  },
  {
    id: 'pet-brand',
    chapter: 4,
    title: 'Chewchew, a pet-care brand',
    blurb:
      'Built Chewchew, a pet-care brand separate from Summer, to see whether a new kind of dog and pet-care brand could be created. The focus was gut health: a prebiotic formulation that helps dogs digest food better.',
    category: 'Building',
    scene: 'ch4-desktop',
    media: 'product shots',
  },
  {
    id: 'content-pitch',
    chapter: 4,
    title: 'A reel caught Ghazal Alagh’s attention. I pitched to her at Elevation Capital.',
    blurb:
      'Started creating content on Instagram (@keeshir) and LinkedIn. A reel caught the attention of Ghazal Alagh, an investor on Shark Tank India. I then pitched to her, at Elevation Capital.',
    category: 'Building',
    highlight: true,
    stat: { value: 'Pitched', label: 'to Ghazal Alagh, at Elevation Capital' },
    links: [{ label: 'Instagram @keeshir', href: 'https://instagram.com/keeshir' }],
    scene: 'ch4-desktop',
    media: 'pitch photo / post screenshots',
  },
  {
    id: '21-in-21',
    chapter: 4,
    title: `${projectsLive} creative-tech projects shipped`,
    blurb:
      'Small, free, phone-first creative projects (software and hardware), each shipped publicly with a short reel. New ones are added as they ship.',
    category: 'Building',
    highlight: true,
    stat: { value: `${projectsLive}`, label: 'creative-tech projects shipped' },
    scene: 'ch4-desktop',
    links: [],
  },
  {
    id: 'unconference',
    chapter: 4,
    title: 'Youngest at Product Folks Unconference 2025',
    blurb: 'The youngest attendee at the Product Folks Unconference 2025, a conference for senior leaders. I was one of the only young people invited.',
    category: 'Awards',
    scene: 'ch4-desktop',
  },
  {
    id: 'idea-testing-platform',
    chapter: 4,
    title: 'Platform to test brand ideas with AI',
    blurb:
      'Built a platform that lets brands like mine test designs, ideas and value propositions with AI, without much capex, to see what real customers want.',
    category: 'Building',
    scene: 'ch4-desktop',
    media: 'screen recording',
    links: [],
  },
  {
    id: 'ad-automation',
    chapter: 4,
    title: 'End-to-end ad automation',
    blurb: 'Built end-to-end automations that produce ads.',
    category: 'Building',
    scene: 'ch4-desktop',
    media: 'before/after reel',
  },
  {
    id: 'prototyping-class',
    chapter: 4,
    title: 'Designed and taught a prototyping class',
    blurb:
      'Learned prototyping and design, built a framework around it with mentors, and taught it as a class sanctioned by my accelerator. About 65 people signed up (full capacity), from inside and outside the accelerator.',
    category: 'Teaching',
    stat: { value: '~65', label: 'sign-ups, at full capacity' },
    scene: 'ch4-desktop',
  },

  // ───────────── Chapter 5 · San Francisco ─────────────
  {
    id: 'berkeley-summer',
    chapter: 5,
    title: 'UC Berkeley summer session: film and business',
    blurb:
      'Spent a couple of months in the Bay Area for the UC Berkeley summer session, studying film and business. While there I joined build sessions and consulted for Adobe.',
    category: 'Education',
    scene: 'ch5-sf',
  },
  {
    id: 'adobe',
    chapter: 5,
    title: 'Consulted for Adobe in San Francisco',
    blurb:
      'Invited to San Francisco for a one-time consulting project for Adobe: go-to-market and competitive analysis for Firefly, and how consumers in India use AI in creative workflows.',
    category: 'Consulting',
    highlight: true,
    stat: { value: 'Adobe', label: 'Firefly go-to-market, India' },
    scene: 'ch5-sf',
  },
]

const byId = (id: string): Entry => {
  const e = entries.find((x) => x.id === id)
  if (!e) throw new Error(`entries.ts: unknown entry id "${id}"`)
  return e
}

/** Highlights strip, most valuable to an a16z reviewer first (only entries with `highlight: true`). */
const HIGHLIGHT_ORDER = ['decor-brand', 'adobe', '21-in-21', 'content-pitch', 'martial-arts']
export const highlights = HIGHLIGHT_ORDER.map(byId).filter((e) => e.highlight)

/** Filter chips, builder categories first. */
const CATEGORY_ORDER: Category[] = [
  'Building', 'Consulting', 'Leadership', 'Research', 'Teaching', 'Education', 'Performance', 'Awards', 'Art',
]
export const categories = CATEGORY_ORDER.filter((c) => entries.some((e) => e.category === c))

/**
 * Index mode "Everything", ranked for the audience (a16z funds builders): what I built, then who trusted me with
 * work, then high school, then the earlier years as one compact list. Order within a section = order shown.
 * Entries not listed here appear only in Story mode (e.g. 'boarding-school', which is context, not an achievement).
 */
export interface IndexSection {
  id: string
  title: string
  note?: string
  /** One-line rows instead of cards. */
  compact?: boolean
  entries: Entry[]
}
export const indexSections: IndexSection[] = [
  {
    id: 'built',
    title: 'What I built',
    entries: ['decor-brand', '21-in-21', 'idea-testing-platform', 'ad-automation', 'pet-brand', 'java-inventory'].map(byId),
  },
  {
    id: 'work',
    title: 'Work and recognition',
    entries: ['adobe', 'content-pitch', 'berkeley-summer', 'accelerator', 'prototyping-class', 'unconference', 'visa'].map(byId),
  },
  {
    id: 'high-school',
    title: 'High school',
    entries: [
      'english-honor-society', 'science-honor-society', 'carbon-neutral', 'motor-thesis', 'esports-tournament',
      'standup-paper', 'subject-awards', 'lesson-plans', 'pet-therapy', 'music',
    ].map(byId),
  },
  {
    id: 'earlier',
    title: 'Earlier',
    note: 'Middle and primary school.',
    compact: true,
    entries: [
      'martial-arts', 'performing-arts', 'student-council', 'robotics', 'science-talent', 'olympiads', 'chess',
      'national-art', 'every-year',
    ].map(byId),
  },
]
