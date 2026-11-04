import { flushSync } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { categories, chapters, entries, indexSections, person } from '../content/entries'
import { projects, projectsLive, projectsThesis } from '../content/projects'
import type { Category, Entry } from '../content/types'
import { useApp } from '../store'
import Doodle from './Doodle'
import Scribbles from './Scribbles'
import { imageOf, path, stats, tiles } from './glance'
import './index-mode.css'

/** Marker colours, cycled in order. */
const HL = ['yel', 'pink', 'mint', 'sky'] as const
const SCENE_OF: Record<number, string> = { 1: 'ch1-walk', 2: 'ch2-select', 3: 'ch3-diary', 4: 'ch4-desktop', 5: 'ch5-sf' }

function Portrait() {
  const [ok, setOk] = useState(false)
  return (
    <figure className="ix-polaroid">
      <span className="ix-tape is-l" aria-hidden="true" />
      <span className="ix-tape is-r" aria-hidden="true" />
      <div className="ix-photo">
        <Doodle />
        <img
          src="/media/portrait.jpg"
          alt="Portrait of Risheek Nawka"
          className={ok ? 'is-on' : ''}
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
        />
      </div>
      <figcaption>
        {person.name}, {person.age}
      </figcaption>
      <p className="ix-note ix-hi" aria-hidden="true">
        hi, that&apos;s me
        <svg viewBox="0 0 60 40" width="60" height="40">
          <path
            d="M3 5 C 22 2, 46 10, 54 32 M54 32 l -9 -5 M54 32 l 0 -10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </p>
    </figure>
  )
}

function Card({ e }: { e: Entry }) {
  const setMode = useApp((s) => s.setMode)
  const [open, setOpen] = useState(false)
  const ch = chapters[e.chapter]
  const img = imageOf(e)
  const extra = e.extraImages ?? []
  return (
    <article className={`ix-card${open ? ' is-open' : ''}`} style={{ ['--c' as string]: ch.accent }} id={e.id}>
      <div className={`ix-media${img ? '' : ' is-ph'}${extra.length ? ' is-duo' : ''}`}>
        {img ? (
          <>
            <img src={img.src} alt={img.alt} loading="lazy" style={{ objectPosition: e.imagePos }} />
            {extra.map((x) => (
              <img key={x.src} src={x.src} alt={x.alt} loading="lazy" />
            ))}
          </>
        ) : (
          <span className={`ix-ph${e.stat ? '' : ' is-word'}`} aria-hidden="true">
            {e.stat ? e.stat.value : e.category}
          </span>
        )}
        <span className="ix-tag">{ch.era}</span>
      </div>
      <div className="ix-card-body">
        <p className="ix-cat">{e.category}</p>
        <h4>{e.title}</h4>
        <p className="ix-blurb">{e.blurb}</p>
        {e.blurb.length > 150 && (
          <button type="button" className="ix-more" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'less ↑' : 'more ↓'}
          </button>
        )}
        <div className="ix-links">
          {e.links?.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
          {e.scene && (
            <button type="button" onClick={() => setMode('story', e.scene)}>
              in the story ▶
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function Row({ e }: { e: Entry }) {
  const setMode = useApp((s) => s.setMode)
  const ch = chapters[e.chapter]
  const img = imageOf(e)
  return (
    <li className="ix-row" style={{ ['--c' as string]: ch.accent }} id={e.id}>
      {img ? (
        <img className="ix-row-thumb" src={img.src} alt={img.alt} loading="lazy" style={{ objectPosition: e.imagePos }} />
      ) : (
        <span className="ix-row-thumb is-empty" aria-hidden="true" />
      )}
      <span className="ix-row-era">{ch.era}</span>
      <span className="ix-row-title">{e.title}</span>
      {e.stat && <span className="ix-row-stat">{e.stat.value}</span>}
      {e.scene && (
        <button type="button" onClick={() => setMode('story', e.scene)} aria-label={`See ${e.title} in the story`}>
          story ▶
        </button>
      )}
    </li>
  )
}

export default function IndexMode() {
  const setMode = useApp((s) => s.setMode)
  const [cat, setCat] = useState<Category | 'All'>('All')
  const [q, setQ] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const search = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)

  // Publish the exact sticky heights so scroll offsets and the filter block never hide under the bar.
  useEffect(() => {
    const el = root.current
    const bar = el?.querySelector<HTMLElement>('.ix-bar')
    const filters = el?.querySelector<HTMLElement>('.ix-filters')
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

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const keep = (e: Entry) =>
      (cat === 'All' || e.category === cat) &&
      (!needle || `${e.title} ${e.blurb} ${e.category} ${chapters[e.chapter].era}`.toLowerCase().includes(needle))
    return indexSections.map((s) => ({ ...s, entries: s.entries.filter(keep) })).filter((s) => s.entries.length)
  }, [cat, q])

  // In-page anchors never touch the URL hash (a reload at #id would land on the menu):
  // scroll below the sticky bar (smooth unless reduced motion), move focus, keep #/index.
  const onAnchor = (ev: React.MouseEvent) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
    const a = (ev.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (!a || !href || !href.startsWith('#') || href.startsWith('#/') || href.length < 2) return
    ev.preventDefault()
    let id = href.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      return
    }
    if (!entries.some((e) => e.id === id) && !document.getElementById(id)) return
    let el = document.getElementById(id)
    if (!el) {
      // Target hidden by the active filter/search: reset both, render synchronously, then jump.
      flushSync(() => {
        setCat('All')
        setQ('')
        setOpenGroups(Object.fromEntries(indexSections.map((g) => [g.id, true])))
      })
      el = document.getElementById(id)
      if (!el) return
    }
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    const isCard = el.classList.contains('ix-card') || el.classList.contains('ix-row')
    const focusEl: HTMLElement = isCard ? el : (el.querySelector<HTMLElement>('h2, h3') ?? el)
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1')
    focusEl.focus({ preventScroll: true })
    if (isCard) {
      el.classList.add('is-target')
      window.setTimeout(() => el.classList.remove('is-target'), 2000)
    }
  }

  return (
    <div className="ix" ref={root} onClick={onAnchor}>
      <header className="ix-bar">
        <div className="ix-bar-in">
          <a className="ix-mark" href="#top" aria-label="Risheek Nawka, back to top">
            <span className="hl">Risheek</span>
          </a>
          <nav aria-label="Sections">
            <a href="#glance">At a glance</a>
            <a href="#path">Path</a>
            <a href="#timeline">Everything</a>
            <a href="#shipped">Projects</a>
            <a href="#contact">Contact</a>
          </nav>
          <button type="button" className="ix-btn is-solid" onClick={() => setMode('story')}>
            Play the story ▶
          </button>
        </div>
      </header>

      <main className="ix-main" id="top">
        <section className="ix-hero" aria-labelledby="ix-name">
          <Scribbles zone="hero" />
          <div className="ix-hero-copy">
            <p className="ix-kicker">
              {person.title.toLowerCase()}, age {person.age}
            </p>
            <h1 id="ix-name">
              Risheek <span className="hl">Nawka</span>
            </h1>
            <p className="ix-lede">{person.tagline}</p>
            <ul className="ix-facts" aria-label="Key facts">
              {person.facts.map((f, i) => (
                <li key={f} className={`is-${HL[i % HL.length]}`}>
                  {f}
                </li>
              ))}
            </ul>
            <div className="ix-cta">
              <button type="button" className="ix-btn is-solid is-lg" onClick={() => setMode('story')}>
                Play the story ▶
              </button>
              <a className="ix-btn is-lg" href={`mailto:${person.contact.email}`}>
                Email me
              </a>
            </div>
            <p className="ix-note ix-skim">
              short on time? the numbers are right below
              <svg viewBox="0 0 40 50" width="34" height="42" aria-hidden="true">
                <path
                  d="M6 4 C 30 10, 10 28, 22 44 M22 44 l -9 -6 M22 44 l 4 -11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </p>
          </div>
          <Portrait />
        </section>

        <section className="ix-stats" aria-label="Key numbers">
          <dl>
            {stats.map((e, i) => (
              <div key={e.id} className="ix-statcell">
                <dt>{e.stat?.label}</dt>
                <dd><span className={`hl is-${HL[i % HL.length]}`}>{e.stat?.value}</span></dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="glance" className="ix-sec" aria-labelledby="glance-t">
          <Scribbles zone="glance" />
          <header className="ix-sec-head">
            <p className="ix-kicker">01</p>
            <h2 id="glance-t">At a glance</h2>
            <p className="ix-sub">What I built, who trusted me with work, and where it started.</p>
          </header>
          <div className="ix-pins">
            {tiles.map(({ entry: e, size, dots, stamp }, i) => {
              const img = imageOf(e)
              return (
                <article
                  key={e.id}
                  className={`ix-tile is-${size}${img ? ' has-img' : ''}`}
                  style={{ ['--c' as string]: chapters[e.chapter].accent }}
                >
                  {img && <img className="ix-tile-img" src={img.src} alt={img.alt} loading="lazy" style={{ objectPosition: e.imagePos }} />}
                  <span className="ix-tag">{chapters[e.chapter].era}</span>
                  {stamp && (
                    <span className="ix-stamp" aria-hidden="true">
                      {stamp}
                    </span>
                  )}
                  <div className="ix-tile-body">
                    {e.stat && (
                      <p className="ix-big">
                        <span className={`hl is-${HL[i % HL.length]}`}>{e.stat.value}</span>
                      </p>
                    )}
                    {e.stat && !e.title.toLowerCase().includes(e.stat.label.toLowerCase()) && <p className="ix-bigcap">{e.stat.label}</p>}
                    <h3>{e.title}</h3>
                    {size === 'wide' && <p className="ix-blurb">{e.blurb}</p>}
                    {dots && (
                      <div className="ix-dots" role="img" aria-label={`${projectsLive} projects shipped`}>
                        {projects.map((p) => (
                          <i key={p.day} className={p.url || p.kind === 'skill' ? 'is-on' : ''} />
                        ))}
                      </div>
                    )}
                    <div className="ix-links">
                      {e.links?.map((l) => (
                        <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                          {l.label} ↗
                        </a>
                      ))}
                      <a href={dots ? '#shipped' : `#${e.id}`}>details ↓</a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="path" className="ix-sec" aria-labelledby="path-t">
          <Scribbles zone="path" />
          <header className="ix-sec-head">
            <p className="ix-kicker">02</p>
            <h2 id="path-t">The path</h2>
            <p className="ix-sub">Five chapters. In the story each one is a different old favourite, Game Boy to golden hour.</p>
          </header>
          <ol className="ix-path">
            {path.map((c) => (
              <li key={c.id} style={{ ['--c' as string]: c.accent }}>
                <span className="ix-path-n">{c.id}</span>
                <p className="ix-note">{c.medium}</p>
                <h3>{c.era}</h3>
                <p className="ix-path-line">{c.line}</p>
                <button type="button" onClick={() => setMode('story', SCENE_OF[c.id])} aria-label={`Play chapter ${c.id}: ${c.era}`}>
                  play ▶
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section id="timeline" className="ix-sec" aria-labelledby="timeline-t">
          <Scribbles zone="everything" />
          <header className="ix-sec-head">
            <p className="ix-kicker">03</p>
            <h2 id="timeline-t">Everything</h2>
            <p className="ix-sub">Every entry, most relevant first.</p>
          </header>
          <div className="ix-filters">
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…  (Ctrl/⌘ K)"
              aria-label="Search achievements"
              type="search"
            />
            <div className="ix-chips" role="group" aria-label="Filter by category">
              {(['All', ...categories] as const).map((c) => (
                <button key={c} type="button" className={cat === c ? 'is-on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {sections.map((s) => {
            const limit = s.compact ? 4 : 6
            const filtering = cat !== 'All' || q.trim() !== ''
            const open = filtering || !!openGroups[s.id]
            const shown = open ? s.entries : s.entries.slice(0, limit)
            const hidden = s.entries.length - shown.length
            return (
              <div key={s.id} className="ix-group">
                <h3 className="ix-group-t">
                  <span className="hl">{s.title}</span>
                  {s.note && <small> {s.note}</small>}
                </h3>
                {s.compact ? (
                  <ul className="ix-rows">
                    {shown.map((e) => (
                      <Row key={e.id} e={e} />
                    ))}
                  </ul>
                ) : (
                  <div className="ix-cards">
                    {shown.map((e) => (
                      <Card key={e.id} e={e} />
                    ))}
                  </div>
                )}
                {!filtering && s.entries.length > limit && (
                  <button
                    type="button"
                    className="ix-seemore"
                    aria-expanded={open}
                    onClick={() => setOpenGroups((g) => ({ ...g, [s.id]: !g[s.id] }))}
                  >
                    {open ? 'See less ↑' : `See ${hidden} more ↓`}
                  </button>
                )}
              </div>
            )
          })}
          {!sections.length && <p className="ix-empty">Nothing matches. Try a different filter.</p>}
        </section>

        <section id="shipped" className="ix-sec" aria-labelledby="shipped-t">
          <Scribbles zone="shipped" />
          <header className="ix-sec-head">
            <p className="ix-kicker">04</p>
            <h2 id="shipped-t">
              Projects shipped <small>{projectsLive}</small>
            </h2>
            <p className="ix-sub">{projectsThesis}</p>
          </header>
          <ul className="ix-dex">
            {projects.map((p) => {
              const live = !!p.url || p.kind === 'skill'
              const inner = (
                <>
                  <span className="ix-dex-no">#{String(p.day).padStart(2, '0')}</span>
                  <strong>{p.title}</strong>
                  {live && <span className="ix-dex-blurb">{p.blurb}</span>}
                  {p.url && (
                    <span className="ix-dex-go" aria-hidden="true">
                      open ↗
                    </span>
                  )}
                </>
              )
              return (
                <li key={p.day} className={`is-${HL[(p.day - 1) % HL.length]}`}>
                  {p.url ? (
                    <a className="ix-dex-cell is-live" href={p.url} target="_blank" rel="noreferrer">
                      {inner}
                    </a>
                  ) : (
                    <div className={`ix-dex-cell ${live ? 'is-live' : 'is-locked'}`}>{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section id="contact" className="ix-sec ix-contact" aria-labelledby="contact-title">
          <Scribbles zone="contact" />
          <div>
            <p className="ix-kicker">05</p>
            <h2 id="contact-title" tabIndex={-1}>
              Say <span className="hl">hello</span>
            </h2>
            <p className="ix-sub">Founding-class question, collaboration, or just hi. I read everything.</p>
            <a className="ix-btn is-solid ix-mail" href={`mailto:${person.contact.email}`}>
              {person.contact.email}
            </a>
            <ul className="ix-socials">
              {[
                ['GitHub', person.contact.github],
                ['LinkedIn', person.contact.linkedin],
                ['Instagram', person.contact.instagram],
              ]
                .filter(([, href]) => href.startsWith('http'))
                .map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer">
                      {label} ↗
                    </a>
                  </li>
                ))}
            </ul>
          </div>
          <figure className="ix-working">
            <img src="/media/working.jpg" alt="Risheek, seen from behind, working on code on a laptop at a workspace" loading="lazy" />
            <figcaption>mid-build, as usual</figcaption>
          </figure>
        </section>
      </main>

      <footer className="ix-foot">
        <p>Applying to the founding class. Thanks for looking.</p>
        <button type="button" className="ix-btn is-solid" onClick={() => setMode('story')}>
          Play the story ▶
        </button>
        {/* Required by CC BY (see public/audio/CREDITS.md). Everything else in public/audio needs no credit (CC0 /
            public domain / Pixabay licence). */}
        <p className="ix-credits">
          Audience laugh: &ldquo;approx-800-laugh-1&rdquo; by lonemonk (
          <a href="https://freesound.org/people/lonemonk/" target="_blank" rel="noreferrer">freesound.org</a>),{' '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>.
        </p>
        {/* Voluntary thanks (Risheek asked for sound credits); full list with sources in public/audio/CREDITS.md. */}
        <p className="ix-credits">
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
