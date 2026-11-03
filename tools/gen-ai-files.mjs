// Generates the machine-readable versions of the portfolio from the ONE content file (src/content/*):
//   public/portfolio.json   structured data (person, achievements, projects)
//   public/portfolio.md     plain-text version, the same facts in order
//   public/llms.txt         the short index AI agents look for first
//   public/robots.txt
//   index.html              the static summary between the AI markers and the JSON-LD block
// Runs automatically before `npm run build`, or by hand: npm run gen:ai
// Set SITE_URL to the deployed address (default below) so the links in llms.txt are absolute.
import { createServer } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'

const SITE = process.env.SITE_URL || 'https://horowitz-portfolio.vercel.app'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { person, chapters, entries, indexSections } = await vite.ssrLoadModule('/src/content/entries.ts')
const { projects, projectsThesis } = await vite.ssrLoadModule('/src/content/projects.ts')
await vite.close()

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const era = (e) => chapters[e.chapter].era
const sections = indexSections.map((s) => ({ title: s.title, note: s.note, items: s.entries }))
const links = Object.values(person.contact).filter((v) => v.startsWith('http'))

const summary =
  `${person.name} is a ${person.age}-year-old ${person.title.toLowerCase()} applying to the a16z Horowitz Academy founding class. ` +
  `Tagline: "${person.tagline}" Key facts: ${person.facts.join('; ')}.`

// portfolio.json
const json = {
  name: person.name,
  title: person.title,
  age: person.age,
  summary,
  tagline: person.tagline,
  contact: person.contact,
  highlights: entries
    .filter((e) => e.highlight)
    .map((e) => ({ id: e.id, title: e.title, stat: e.stat ?? null, description: e.blurb })),
  achievements: sections.flatMap((s) =>
    s.items.map((e) => ({
      id: e.id,
      section: s.title,
      period: era(e),
      category: e.category,
      title: e.title,
      description: e.blurb,
      stat: e.stat ?? null,
      links: e.links ?? [],
    })),
  ),
  projects: projects.map((p) => ({ title: p.title, description: p.blurb, url: p.url ?? null })),
  projectsNote: projectsThesis,
  howToRead: {
    index: `${SITE}/#/index`,
    story: `${SITE}/#/story`,
    note: 'The story is a click-through animation with little readable text. The Index page and this file have every fact as text.',
  },
}
writeFileSync('public/portfolio.json', JSON.stringify(json, null, 2) + '\n')

// portfolio.md
let md = `# ${person.name}\n\n${summary}\n\n`
md += `Contact: ${person.contact.email} · ${person.contact.github} · ${person.contact.linkedin} · ${person.contact.instagram}\n\n`
for (const s of sections) {
  md += `## ${s.title}${s.note ? ` (${s.note})` : ''}\n\n`
  for (const e of s.items) {
    const key = e.stat ? ` Key fact: ${e.stat.value}, ${e.stat.label}.` : ''
    const lk = e.links && e.links.length ? ' ' + e.links.map((l) => `${l.label}: ${l.href}`).join(' ') : ''
    md += `- **${e.title}** (${era(e)}, ${e.category}). ${e.blurb}${key}${lk}\n`
  }
  md += '\n'
}
md += `## Projects shipped\n\n${projectsThesis}\n\n`
md += projects.map((p) => `- **${p.title}**: ${p.blurb}${p.url ? ' ' + p.url : ''}`).join('\n') + '\n'
writeFileSync('public/portfolio.md', md)

// llms.txt + robots.txt
const llms = `# ${person.name}

> ${summary}

This site is an interactive portfolio. The click-through "story" is animated and has little readable text; every fact is also available as plain text below.

## Read this
- [Full portfolio as Markdown](${SITE}/portfolio.md): every achievement in order, with the key number for each
- [Structured data (JSON)](${SITE}/portfolio.json): the same facts, machine-readable
- [Index page](${SITE}/#/index): the fast, readable overview in the browser

## Contact
- Email: ${person.contact.email}
- GitHub: ${person.contact.github}
- LinkedIn: ${person.contact.linkedin}
- Instagram: ${person.contact.instagram}
`
writeFileSync('public/llms.txt', llms)
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\n\n# AI-readable summary: ${SITE}/llms.txt\n`)

// index.html: JSON-LD + static summary (React replaces the summary once JS runs)
const ld = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: person.name,
    jobTitle: person.title,
    description: summary,
    email: person.contact.email,
    sameAs: links,
  },
}
const staticHtml = `<main data-ai-summary>
<h1>${esc(person.name)}: ${esc(person.title)}</h1>
<p>${esc(summary)}</p>
${sections
  .map(
    (s) =>
      `<h2>${esc(s.title)}</h2>\n<ul>\n${s.items
        .map(
          (e) =>
            `<li><strong>${esc(e.title)}</strong> (${esc(era(e))}). ${esc(e.blurb)}${e.stat ? ` ${esc(e.stat.value)}: ${esc(e.stat.label)}.` : ''}</li>`,
        )
        .join('\n')}\n</ul>`,
  )
  .join('\n')}
<h2>Projects shipped</h2>
<ul>
${projects.map((p) => `<li>${p.url ? `<a href="${esc(p.url)}">${esc(p.title)}</a>` : esc(p.title)}: ${esc(p.blurb)}</li>`).join('\n')}
</ul>
<p>Contact: <a href="mailto:${esc(person.contact.email)}">${esc(person.contact.email)}</a>. Plain-text version: <a href="/portfolio.md">portfolio.md</a>, <a href="/portfolio.json">portfolio.json</a>.</p>
</main>`
let html = readFileSync('index.html', 'utf8')
const swap = (a, b, body) => {
  const re = new RegExp(`${a}[\\s\\S]*?${b}`)
  if (!re.test(html)) throw new Error(`index.html is missing ${a}`)
  html = html.replace(re, () => `${a}\n${body}\n${b}`)
}
swap('<!-- LD:START -->', '<!-- LD:END -->', `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
swap('<!-- AI:START -->', '<!-- AI:END -->', staticHtml)
html = html.replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${esc(summary).replace(/"/g, '&quot;')}" />`)
writeFileSync('index.html', html)
console.log('AI files written:', json.achievements.length, 'achievements,', projects.length, 'projects')
