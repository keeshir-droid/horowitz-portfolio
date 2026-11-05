import { useEffect } from 'react'
import { person } from '../content/entries'
import { solse, type Shot, type SolseState } from '../content/solse'
import '../index-mode/index-mode.css'
import './case-study.css'

/** Screenshot sizes (all site shots are 1600x1000 after export; the hero is a 1600x530 crop). */
const SITE_W = 1600
const SITE_H = 1000

function Taped({ s, w = SITE_W, h = SITE_H, tilt = 0, className = '' }: { s: Shot; w?: number; h?: number; tilt?: number; className?: string }) {
  return (
    <figure className={`cs-shot ${className}`} style={{ ['--tilt' as string]: `${tilt}deg` }}>
      <span className="ix-tape" aria-hidden="true" />
      <img src={s.src} alt={s.alt} width={w} height={h} loading="lazy" />
      <figcaption>{s.caption}</figcaption>
    </figure>
  )
}

function State({ s }: { s: SolseState }) {
  return <span className={`cs-state is-${s.toLowerCase()}`}>{s}</span>
}

function Head({ n, id, title, sub, state }: { n: string; id: string; title: React.ReactNode; sub?: string; state?: SolseState }) {
  return (
    <header className="ix-sec-head">
      <p className="ix-kicker">
        {n} {state && <State s={state} />}
      </p>
      <h2 id={`${id}-t`}>{title}</h2>
      {sub && <p className="ix-sub">{sub}</p>}
    </header>
  )
}

const NAV = [
  ['problem', 'Problem'],
  ['how', 'How it works'],
  ['luce', 'Luce'],
  ['status', 'Status'],
] as const

export default function SolsePage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    const prev = document.title
    document.title = 'Solse, a case study · Risheek Nawka'
    return () => {
      document.title = prev
    }
  }, [])

  // In-page anchors never touch the URL hash (a reload at #problem would land on the menu); keep #/solse.
  const onAnchor = (ev: React.MouseEvent) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
    const href = (ev.target as HTMLElement).closest('a')?.getAttribute('href')
    if (!href || !href.startsWith('#') || href.startsWith('#/') || href.length < 2) return
    const el = document.getElementById(href.slice(1))
    if (!el) return
    ev.preventDefault()
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    const h = el.querySelector<HTMLElement>('h2') ?? el
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
  }

  const { problem, profile, luce, designed } = solse

  return (
    <div className="ix cs" onClick={onAnchor}>
      <header className="ix-bar">
        <div className="ix-bar-in">
          <a className="ix-mark" href="#/index" aria-label="Risheek Nawka, back to the Index">
            <span className="hl">Risheek</span>
          </a>
          <nav aria-label="Case study sections">
            <a href="#/index" className="cs-back">
              ← All work
            </a>
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <a className="ix-btn is-solid" href={solse.url} target="_blank" rel="noreferrer">
            {solse.urlLabel} ↗
          </a>
        </div>
      </header>

      <main className="ix-main" id="top">
        {/* ── hero ── */}
        <section className="cs-hero" aria-labelledby="cs-name">
          <p className="ix-kicker">case study · {solse.year}</p>
          <h1 id="cs-name">
            <span className="hl">{solse.name}</span>
          </h1>
          <p className="ix-lede">{solse.tagline}</p>
          <p className="cs-one">{solse.oneLiner}</p>
          <ul className="ix-facts" aria-label="Key facts">
            {solse.facts.map((f, i) => (
              <li key={f} className={`is-${['yel', 'mint', 'sky', 'pink'][i % 4]}`}>
                {f}
              </li>
            ))}
          </ul>
          <div className="ix-cta">
            <a className="ix-btn is-solid is-lg" href={solse.url} target="_blank" rel="noreferrer">
              Visit {solse.urlLabel} ↗
            </a>
            <a className="ix-btn is-lg" href="#/index">
              Back to all work
            </a>
          </div>
          <p className="cs-role">
            <strong>Role:</strong> {solse.role}
          </p>
        </section>

        <Taped s={solse.hero} w={1600} h={530} tilt={-0.6} className="cs-hero-shot" />

        <section className="cs-glance" aria-label="Where it stands">
          <p className="cs-glance-t ix-note">where it stands today</p>
          <dl>
            {solse.glance.map((g) => (
              <div key={g.state}>
                <dt>
                  <State s={g.state} />
                </dt>
                <dd>{g.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 01 problem ── */}
        <section id="problem" className="ix-sec" aria-labelledby="problem-t">
          <Head n="01" id="problem" title="The problem" sub="Why AI ad makers disappoint product brands, and why testing a new product is so costly." />
          <div className="cs-split">
            <ol className="cs-problems">
              {problem.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <Taped s={problem.shot} tilt={1.2} />
          </div>
        </section>

        {/* ── 02 what I built ── */}
        <section id="built" className="ix-sec" aria-labelledby="built-t">
          <Head n="02" id="built" title="What I built" />
          <blockquote className="cs-quote">
            <p>{solse.built}</p>
          </blockquote>

          <h3 className="cs-h3">Real product in, ad out</h3>
          <div className="cs-strip">
            <figure className="cs-pack">
              <img src={solse.packshot.src} alt={solse.packshot.alt} width={720} height={926} loading="lazy" />
              <figcaption>{solse.packshot.caption}</figcaption>
            </figure>
            <span className="cs-arrow" aria-hidden="true">
              <svg viewBox="0 0 80 40" width="72" height="36">
                <path d="M4 22 C 24 8, 46 30, 70 18 M70 18 l -11 -5 M70 18 l -6 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="ix-note">Mona</span>
            </span>
            <ul className="cs-ads" aria-label="Ads Mona made from that photo">
              {solse.ads.map((a) => (
                <li key={a.src}>
                  <img src={a.src} alt={a.alt} width={720} height={894} loading="lazy" />
                </li>
              ))}
            </ul>
          </div>
          <p className="cs-h3-sub">Same engine, other brands:</p>
          <ul className="cs-brands">
            {solse.otherBrands.map((b) => (
              <li key={b.src}>
                <img src={b.src} alt={b.alt} width={720} height={894} loading="lazy" />
                <span>{b.caption}</span>
              </li>
            ))}
          </ul>
          <p className="cs-fiction">{solse.fictionNote}</p>
        </section>

        {/* ── 03 the bet ── */}
        <section id="thesis" className="ix-sec" aria-labelledby="thesis-t">
          <Head n="03" id="thesis" title="The bet" />
          <p className="cs-thesis">{solse.thesis}</p>
        </section>

        {/* ── 04 how it works ── */}
        <section id="how" className="ix-sec" aria-labelledby="how-t">
          <Head n="04" id="how" title="How it works" sub="The technical side: the architecture, the brand profile, and the Mona pipeline as it is built today." />

          <h3 className="cs-h3">Architecture</h3>
          <div className="cs-arch">
            {solse.architecture.map((a) => (
              <article key={a.title} className="cs-card">
                <h4>{a.title}</h4>
                <ul>
                  {a.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <h3 className="cs-h3">The brand profile: parameters with provenance</h3>
          <div className="cs-split">
            <div className="cs-prose">
              <p>{profile.lead}</p>
              <p>{profile.why}</p>
              <pre className="cs-code" aria-label="The Why type">
                <code>{profile.code}</code>
              </pre>
              <p className="cs-next">
                <State s="Designed" /> {profile.next.replace(/^Designed next: /, '')}
              </p>
            </div>
            <Taped s={profile.shot} tilt={-1} />
          </div>

          <h3 className="cs-h3">
            The Mona pipeline <State s="Built" />
          </h3>
          <div className="cs-pipe">
          <ol className="cs-steps">
            {solse.pipeline.map((p, i) => (
              <li key={p.title}>
                <span className="cs-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h4>{p.title}</h4>
                  <p>{p.body}</p>
                  {p.points && (
                    <>
                      {p.pointsLabel && <p className="cs-points-t">{p.pointsLabel}:</p>}
                      <ul className="cs-points">
                        {p.points.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="cs-pipe-shots">
            {solse.pipelineShots.map((s, i) => (
              <Taped key={s.src} s={s} tilt={i ? 1 : -1} />
            ))}
          </div>
          </div>

          <div className="cs-pixel" role="group" aria-label="Where the pixel-check threshold came from">
            <p className="cs-pixel-lead">{solse.pixelCheck.lead}</p>
            <dl>
              <div>
                <dt>rejected ads</dt>
                <dd>
                  <span className="hl is-pink">{solse.pixelCheck.rejected}</span>
                </dd>
              </div>
              <div>
                <dt>kept ads</dt>
                <dd>
                  <span className="hl is-mint">{solse.pixelCheck.kept}</span>
                </dd>
              </div>
            </dl>
            <p className="cs-pixel-unit">{solse.pixelCheck.unit}</p>
          </div>
        </section>

        {/* ── 05 designed ── */}
        <section id="designed" className="ix-sec" aria-labelledby="designed-t">
          <Head
            n="05"
            id="designed"
            state="Designed"
            title="Designed, not built yet"
            sub="Where Mona goes next. These are designs on paper and on the site, not working code."
          />
          <div className="cs-split">
            <div className="cs-designed">
              {designed.items.map((d) => (
                <article key={d.title} className="cs-card is-dashed">
                  <h4>{d.title}</h4>
                  <p>{d.body}</p>
                </article>
              ))}
            </div>
            <Taped s={designed.shot} tilt={1} />
          </div>
        </section>

        {/* ── 06 luce ── */}
        <section id="luce" className="ix-sec" aria-labelledby="luce-t">
          <Head n="06" id="luce" state="Designed" title="Luce, the testing engine" sub={luce.lead} />
          <ol className="cs-luce-steps">
            {luce.steps.map((s, i) => (
              <li key={s}>
                <span className="cs-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <p>{s}</p>
              </li>
            ))}
          </ol>

          <div className="cs-example" role="group" aria-label="Worked example with sample numbers">
            <ol>
              {luce.example.map((x) => (
                <li key={x.label}>
                  <strong>{x.value}</strong>
                  <span>{x.label}</span>
                </li>
              ))}
            </ol>
            <p>{luce.exampleNote}</p>
          </div>

          <Taped s={luce.shots[0]} tilt={-0.6} className="cs-wide-shot" />
          <div className="cs-pair">
            <Taped s={luce.shots[1]} tilt={1} />
            <Taped s={luce.shots[2]} tilt={-1} />
          </div>
          <p className="cs-boundary">
            <strong>The boundary.</strong> {luce.boundary}
          </p>
        </section>

        {/* ── 07 decisions ── */}
        <section id="decisions" className="ix-sec" aria-labelledby="decisions-t">
          <Head n="07" id="decisions" title="Design decisions" />
          <ul className="cs-notes">
            {solse.decisions.map((d, i) => (
              <li key={d.title} className={`is-${['yel', 'pink', 'mint', 'sky'][i % 4]}`}>
                <strong>{d.title}</strong>
                <span>{d.body}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 08 status ── */}
        <section id="status" className="ix-sec" aria-labelledby="status-t">
          <Head n="08" id="status" title="Status, honestly" sub="What is live, what is built, and what is only designed." />
          <div className="cs-table" role="table" aria-label="Solse status">
            <div className="cs-tr cs-th" role="row">
              <span role="columnheader">Part</span>
              <span role="columnheader">State</span>
            </div>
            {solse.status.map((r) => (
              <div key={r.part} className="cs-tr" role="row">
                <span role="cell">{r.part}</span>
                <span role="cell">
                  <State s={r.state} />
                  {r.note && <small>{r.note}</small>}
                </span>
              </div>
            ))}
          </div>
          <p className="cs-pricing">{solse.pricing}</p>
          <p className="cs-credit ix-note">{solse.credit}</p>
        </section>
      </main>

      <footer className="ix-foot">
        <p>Thanks for reading.</p>
        <div className="ix-cta">
          <a className="ix-btn is-solid" href="#/index">
            ← Back to all work
          </a>
          <a className="ix-btn" href={solse.url} target="_blank" rel="noreferrer">
            {solse.urlLabel} ↗
          </a>
          <a className="ix-btn" href={`mailto:${person.contact.email}`}>
            Email me
          </a>
        </div>
      </footer>
    </div>
  )
}
