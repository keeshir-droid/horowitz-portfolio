import { flushSync } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { categories, chapters, entries, highlights, person } from '../content/entries'
import { projects, projectsLive, projectsThesis, TOTAL_PROJECTS } from '../content/projects'
import type { Category, Entry } from '../content/types'
import { useApp } from '../store'
import ContactForm from '../components/ContactForm'

function Card({ e }: { e: Entry }) {
  const setMode = useApp((s) => s.setMode)
  const ch = chapters[e.chapter]
  return (
    <article className="card" style={{ ['--accent' as string]: ch.accent }} id={e.id}>
      <div className="card-media" aria-hidden>
        <span>{e.media ?? 'media'}</span>
      </div>
      <div className="card-body">
        <p className="eyebrow">
          {ch.era} · {e.category}
        </p>
        <h3>{e.title}</h3>
        <p>{e.blurb}</p>
        {e.stat && (
          <p className="stat">
            <strong>{e.stat.value}</strong> {e.stat.label}
          </p>
        )}
        <div className="card-links">
          {e.links?.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
          {e.scene && (
            <button className="linkish" onClick={() => setMode('story', e.scene)}>
              ▶ see it in the story
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function IndexMode() {
  const setMode = useApp((s) => s.setMode)
  const [cat, setCat] = useState<Category | 'All'>('All')
  const [q, setQ] = useState('')
  const search = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)

  // Publish the exact sticky heights so scroll offsets and the filter block never hide under the bar.
  useEffect(() => {
    const el = root.current
    const bar = el?.querySelector<HTMLElement>('.index-bar')
    const filters = el?.querySelector<HTMLElement>('.filters')
    if (!el || !bar) return
    const measure = () => {
      el.style.setProperty('--bar-h', bar.offsetHeight + 'px')
      const sticky = filters && getComputedStyle(filters).position === 'sticky'
      el.style.setProperty('--filters-h', sticky && filters ? filters.offsetHeight + 'px' : '0px')
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(bar)
    if (filters) ro.observe(filters)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter(
      (e) =>
        (cat === 'All' || e.category === cat) &&
        (!needle || `${e.title} ${e.blurb} ${e.category}`.toLowerCase().includes(needle)),
    )
  }, [cat, q])

  // In-page anchors never touch the URL hash (a reload at #highlights would land on the menu):
  // scroll below the sticky bar (smooth unless reduced motion), move focus, keep #/index.
  const onAnchor = (ev: React.MouseEvent) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
    const a = (ev.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (!a || !href || !href.startsWith('#') || href.startsWith('#/') || href.length < 2) return
    ev.preventDefault() // never let the hash change; a reload at #id would land on the menu
    let id = href.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      return
    }
    if (!entries.some((e) => e.id === id) && !document.getElementById(id)) return
    let el = document.getElementById(id)
    if (!el) {
      // Target card hidden by the active filter/search: reset both, render synchronously, then jump.
      flushSync(() => {
        setCat('All')
        setQ('')
      })
      el = document.getElementById(id)
      if (!el) return
    }
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    const isCard = el.classList.contains('card')
    const focusEl: HTMLElement = isCard ? el : el.querySelector<HTMLElement>('h2, h3') ?? el
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1')
    focusEl.focus({ preventScroll: true })
    if (isCard) {
      el.classList.add('is-target')
      window.setTimeout(() => el.classList.remove('is-target'), 2000)
    }
  }

  // Builder years first: that's where the weight is.
  const order = [4, 3, 5, 2, 1] as const

  return (
    <div className="index" ref={root} onClick={onAnchor}>
      <header className="index-bar">
        <span className="wordmark">R·N</span>
        <nav>
          <a href="#highlights">Highlights</a>
          <a href="#timeline">Everything</a>
          <a href="#shipped">21 in 21</a>
          <a href="#contact">Contact</a>
        </nav>
        <button className="btn-story" onClick={() => setMode('story')}>
          ▶ Experience the story
        </button>
      </header>

      <section className="index-hero">
        <p className="eyebrow">{person.title} · age {person.age}</p>
        <h1>{person.name}</h1>
        <p className="lede">{person.tagline}</p>
      </section>

      <section id="highlights" className="highlights">
        <h2 className="section-title">Highlights</h2>
        <div className="highlight-grid">
          {highlights.map((e) => (
            <a key={e.id} href={`#${e.id}`} className="highlight" style={{ ['--accent' as string]: chapters[e.chapter].accent }}>
              <strong>{e.stat?.value}</strong>
              <span>{e.stat?.label}</span>
              <em>{e.title}</em>
            </a>
          ))}
        </div>
      </section>

      <section id="timeline" className="timeline">
        <div className="filters">
          <h2 className="section-title">Everything</h2>
          <input
            ref={search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…  (Ctrl/⌘ K)"
            aria-label="Search achievements"
          />
          <div className="chips" role="group" aria-label="Filter by category">
            {(['All', ...categories] as const).map((c) => (
              <button key={c} className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {order.map((id) => {
          const list = filtered.filter((e) => e.chapter === id)
          if (!list.length) return null
          const ch = chapters[id]
          return (
            <div key={id} className="chapter-group" style={{ ['--accent' as string]: ch.accent }}>
              <h3 className="chapter-label">
                <span>0{id}</span> {ch.era}
              </h3>
              <div className="cards">
                {list.map((e) => (
                  <Card key={e.id} e={e} />
                ))}
              </div>
            </div>
          )
        })}
        {!filtered.length && <p className="muted">Nothing matches. Try a different filter.</p>}
      </section>

      <section id="shipped" className="shipped">
        <h2 className="section-title">
          21 projects in 21 days <small>{projectsLive} / {TOTAL_PROJECTS} shipped</small>
        </h2>
        <p className="lede small">{projectsThesis}</p>
        <div className="dex">
          {projects.map((p) => {
            const live = !!p.url || p.kind === 'skill'
            const inner = (
              <>
                <span className="dex-no">#{String(p.day).padStart(2, '0')}</span>
                <strong>{live ? p.title : '???'}</strong>
                <span className="dex-blurb">{live ? p.blurb : 'Not shipped yet'}</span>
              </>
            )
            return p.url ? (
              <a key={p.day} className="dex-cell is-live" href={p.url} target="_blank" rel="noreferrer">
                {inner}
              </a>
            ) : (
              <div key={p.day} className={`dex-cell ${live ? 'is-live' : 'is-locked'}`}>
                {inner}
              </div>
            )
          })}
        </div>
      </section>

      <footer className="index-foot">
        <p>Applying to the founding class. Thanks for looking.</p>
        <section id="contact" className="contact-section" aria-labelledby="contact-title">
        <h2 id="contact-title" className="section-title" tabIndex={-1}>Say hello</h2>
        <p className="lede small">Founding-class question, collaboration, or just hi. I read everything.</p>
        <ContactForm />
        <p className="muted contact">
          <a href={`mailto:${person.contact.email}`}>{person.contact.email}</a>
          {[
            ['GitHub', person.contact.github],
            ['LinkedIn', person.contact.linkedin],
            ['Instagram', person.contact.instagram],
          ]
            .filter(([, href]) => href.startsWith('http'))
            .map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>
            ))}
        </p>
        </section>
        <button className="btn-story" onClick={() => setMode('story')}>
          ▶ Play the story
        </button>
        {/* Required by CC BY (see public/audio/CREDITS.md). Everything else in public/audio needs no credit (CC0 /
            public domain / Pixabay licence). */}
        <p className="muted small credits">
          Audience laugh: &ldquo;approx-800-laugh-1&rdquo; by lonemonk (
          <a href="https://freesound.org/people/lonemonk/" target="_blank" rel="noreferrer">freesound.org</a>),{' '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>.
        </p>
        {/* Voluntary thanks (Risheek asked for sound credits); full list with sources in public/audio/CREDITS.md. */}
        <p className="muted small credits">
          Music from{' '}
          <a href="https://pixabay.com/music/" target="_blank" rel="noreferrer">Pixabay</a>: Emmraan, _Music_for_Creators_,
          PaulYudin. Sound effects: Joseph Sardin &amp; Pierre Sibanarco (
          <a href="https://bigsoundbank.com" target="_blank" rel="noreferrer">BigSoundBank.com</a>),{' '}
          <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney</a>, and the{' '}
          <a href="https://freesound.org" target="_blank" rel="noreferrer">Freesound</a> recordists corkob, kyles,
          jcallison, KittyKatHunter, Unicornaphobist, shogah, BapttX, SoundsofTheMachine, Sandermotions, DenisChardonnet,
          starlite, stilgar and Axeline T.
        </p>
      </footer>
    </div>
  )
}
