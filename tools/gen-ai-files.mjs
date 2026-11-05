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

const SITE = process.env.SITE_URL || 'https://risheeknawka.com'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { person, chapters, entries, indexSections } = await vite.ssrLoadModule('/src/content/entries.ts')
const { projects, projectsThesis } = await vite.ssrLoadModule('/src/content/projects.ts')
const { solse } = await vite.ssrLoadModule('/src/content/solse.ts')
await vite.close()

// Route links ('#/solse') become absolute so they work outside the site.
const abs = (href) => (href.startsWith('#/') ? `${SITE}/${href}` : href)
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
      links: (e.links ?? []).map((l) => ({ ...l, href: abs(l.href) })),
    })),
  ),
  projects: projects.map((p) => ({ title: p.title, description: p.blurb, url: p.url ?? null })),
  projectsNote: projectsThesis,
  caseStudies: [
    {
      id: 'solse',
      page: `${SITE}/#/solse`,
      name: solse.name,
      tagline: solse.tagline,
      summary: solse.oneLiner,
      url: solse.url,
      role: solse.role,
      whatIBuilt: solse.built,
      thesis: solse.thesis,
      status: solse.status,
      pricing: solse.pricing,
      credit: solse.credit,
      note: solse.fictionNote,
    },
  ],
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
    const lk = e.links && e.links.length ? ' ' + e.links.map((l) => `${l.label}: ${abs(l.href)}`).join(' ') : ''
    md += `- **${e.title}** (${era(e)}, ${e.category}). ${e.blurb}${key}${lk}\n`
  }
  md += '\n'
}
md += `## Projects shipped\n\n${projectsThesis}\n\n`
md += projects.map((p) => `- **${p.title}**: ${p.blurb}${p.url ? ' ' + p.url : ''}`).join('\n') + '\n'
// The Solse case study, in full, as text.
const list = (xs) => xs.join('\n')
md += `\n## Case study: ${solse.name} (${solse.url})\n\n${solse.tagline} ${solse.oneLiner}\n\nRole: ${solse.role}, ${solse.year}. Page: ${SITE}/#/solse\n\n`
md += `### The problem\n\n${list(solse.problem.points.map((p) => `- ${p}`))}\n\n`
md += `### What I built\n\n${solse.built}\n\n${solse.fictionNote}\n\n### The bet\n\n${solse.thesis}\n\n`
md += `### Architecture\n\n${list(solse.architecture.map((a) => `- **${a.title}**: ${a.lines.join(' ')}`))}\n\n`
md += `### The brand profile\n\n${solse.profile.lead} ${solse.profile.why} (Why<T>: value, why, source.) ${solse.profile.next}\n\n`
md += `### The Mona pipeline (built)\n\n${list(
  solse.pipeline.map((p, i) => `${i + 1}. **${p.title}.** ${p.body}${p.points ? ' ' + p.points.join(' ') : ''}`),
)}\n\n${solse.pixelCheck.lead} Rejected ads were ${solse.pixelCheck.rejected} ${solse.pixelCheck.unit}; kept ads ${solse.pixelCheck.kept}.\n\n`
md += `### Designed, not built yet\n\n${list(solse.designed.items.map((d) => `- **${d.title}**: ${d.body}`))}\n\n`
md += `### Luce, the testing engine (designed)\n\n${solse.luce.lead}\n\n${list(solse.luce.steps.map((s, i) => `${i + 1}. ${s}`))}\n\n${solse.luce.boundary}\n\n`
md += `### Design decisions\n\n${list(solse.decisions.map((d) => `- **${d.title}.** ${d.body}`))}\n\n`
md += `### Status\n\n${list(solse.status.map((r) => `- ${r.part}: **${r.state}**${r.note ? ` (${r.note})` : ''}`))}\n\n${solse.pricing} ${solse.credit}\n`
writeFileSync('public/portfolio.md', md)

// llms.txt + robots.txt
const llms = `# ${person.name}

> ${summary}

This site is an interactive portfolio. The click-through "story" is animated and has little readable text; every fact is also available as plain text below.

## Read this
- [Full portfolio as Markdown](${SITE}/portfolio.md): every achievement in order, with the key number for each
- [Structured data (JSON)](${SITE}/portfolio.json): the same facts, machine-readable
- [Index page](${SITE}/#/index): the fast, readable overview in the browser
- [Solse case study](${SITE}/#/solse): ${solse.tagline} Mona (ads) and Luce (product testing); the full text is at the end of portfolio.md

## Contact
- Email: ${person.contact.email}
- GitHub: ${person.contact.github}
- LinkedIn: ${person.contact.linkedin}
- Instagram: ${person.contact.instagram}
`
writeFileSync('public/llms.txt', llms)
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\n\n# AI-readable summary: ${SITE}/llms.txt\nSitemap: ${SITE}/sitemap.xml\n`)

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
