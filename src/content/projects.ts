import type { Project } from './types'

/**
 * The 21-in-21 "Pokédex". Slots without a `url` render as locked silhouettes.
 * Add a project here and it appears in both Index and Story mode.
 */
const built: Project[] = [
  {
    day: 1,
    title: 'Shot Planner',
    blurb: 'A Claude skill that turns a reel script into a shot list.',
    kind: 'skill',
    note: 'The one non-website. Ships as a zip.',
  },
  {
    day: 2,
    title: 'Handwriting Font',
    blurb: 'Write a list on paper, take one photo, then type in your own handwriting.',
    url: 'https://handwriting-font-converter.vercel.app',
  },
  {
    day: 3,
    title: 'Doodle Alive',
    blurb: 'Snap a notebook doodle and the ink lifts off the page and wobbles in a 6-second story.',
    url: 'https://doodle-alive.vercel.app',
  },
  {
    day: 4,
    title: 'Underline',
    blurb: 'Photograph a book page and swipe a line. A real-looking highlighter marks it.',
    url: 'https://underline-it.vercel.app',
  },
  {
    day: 5,
    title: 'Look Up',
    blurb: 'Photograph the sky, trace the shape you see in a cloud, send it as a postcard.',
    url: 'https://look-up-sky.vercel.app',
  },
  {
    day: 6,
    title: 'Pocket Booth',
    blurb: 'A 4-shot photo-booth strip from your camera. Share it or print at true size.',
    url: 'https://the-pocket-booth.vercel.app',
  },
  {
    day: 7,
    title: 'Spotted a Cutie',
    blurb: 'Snap a street animal and get a goofy collectible card made for one friend.',
    url: 'https://spotted-a-cutie.vercel.app',
  },
]

export const TOTAL_PROJECTS = 21

export const projects: Project[] = Array.from({ length: TOTAL_PROJECTS }, (_, i) => {
  const day = i + 1
  return built.find((p) => p.day === day) ?? { day, title: '???', blurb: 'Not shipped yet.' }
})

export const projectsLive = projects.filter((p) => p.url || p.kind === 'skill').length

export const projectsThesis =
  'Free, phone-first websites for young, expressive people. You do something real with your hands, ' +
  'your phone captures it, the site turns it into something delightful, you send it to someone, and they discover the site.'
