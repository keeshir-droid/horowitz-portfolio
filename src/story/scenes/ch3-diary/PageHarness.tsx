/**
 * DEV-only static preview of one diary spread, without the book engine (no curl, no cover, no scroll).
 *   /?ch3-pages&spread=1&u=0.6    spread index into SPREADS, u = 0..1 reading progress of that spread
 * A slider changes u live; arrow keys step spreads. Page numbers and corner doodles mimic the engine's.
 * Lead-owned. Mounted from App.tsx behind import.meta.env.DEV.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './diary.css'
import { DEFS_SVG, applyInk, corner, loadDiaryFont, prepInk } from './kit'
import { SPREADS } from './pages'
import type { DiaryPage } from './types'

const q = new URLSearchParams(window.location.search)
const RIGHTS = SPREADS.length
const clampI = (i: number): number => Math.max(0, Math.min(SPREADS.length - 1, i))

function pageHtml(p: DiaryPage, pageNo: number, cornerIdx: number | null): string {
  return `<div class="dp-page ${p.side} dp-${p.id}">${p.html}${cornerIdx !== null ? corner(cornerIdx, RIGHTS) : ''}${pageNo > 0 ? `<div class="dp-pno">${pageNo}</div>` : ''}</div>`
}

export default function PageHarness() {
  const [i, setI] = useState(() => clampI(Number(q.get('spread') ?? 0) || 0))
  const [u, setU] = useState(() => Math.max(0, Math.min(1, Number(q.get('u') ?? 1))))
  const [fontReady, setFontReady] = useState(false)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const s = SPREADS[i]

  useEffect(() => {
    loadDiaryFont().then(() => setFontReady(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((v) => clampI(v + 1))
      if (e.key === 'ArrowLeft') setI((v) => clampI(v - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Size: two pages of 80x96 fitted into the viewport.
  useLayoutEffect(() => {
    const fit = () => {
      const el = bookRef.current
      if (!el) return
      const pw = Math.min((window.innerWidth - 48) / 2, ((window.innerHeight - 110) * 80) / 96)
      el.style.setProperty('--pw', `${pw}px`)
      el.style.width = `${pw * 2}px`
      el.style.height = `${(pw * 96) / 80}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Mount pages + css + interactions whenever the spread changes.
  useEffect(() => {
    const cleanups: (() => void)[] = []
    const mountOne = (host: HTMLDivElement | null, p: DiaryPage, pageNo: number, cornerIdx: number | null) => {
      if (!host) return
      host.innerHTML = pageHtml(p, pageNo, cornerIdx)
      const root = host.firstElementChild as HTMLElement
      prepInk(root)
      if (p.css && !document.getElementById(`dp-css-${p.id}`)) {
        const st = document.createElement('style')
        st.id = `dp-css-${p.id}`
        st.textContent = p.css
        document.head.appendChild(st)
      }
      if (p.bind) cleanups.push(p.bind(root))
    }
    mountOne(leftRef.current, s.left, i * 2, null)
    mountOne(rightRef.current, s.right, i * 2 + 1, i)
    return () => cleanups.forEach((c) => c())
  }, [i, s])

  // Per-frame state at u.
  useEffect(() => {
    for (const [host, p] of [[leftRef.current, s.left], [rightRef.current, s.right]] as const) {
      const root = host?.firstElementChild as HTMLElement | null
      if (!root) continue
      applyInk(root, u)
      p.update?.(root, u)
    }
  }, [u, i, s, fontReady])

  return (
    <div style={{ minHeight: '100vh', background: '#2a1f17', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 16, color: '#eee', font: '14px system-ui' }}>
      <div dangerouslySetInnerHTML={{ __html: DEFS_SVG }} />
      <div ref={bookRef} className="dp-book" style={{ position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,.5)' }}>
        <div ref={leftRef} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%' }} />
        <div ref={rightRef} style={{ position: 'absolute', left: '50%', top: 0, width: '50%', height: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: 'min(900px, 95vw)' }}>
        <button type="button" onClick={() => setI((v) => clampI(v - 1))}>◀</button>
        <span style={{ minWidth: 190 }}>
          spread {i} · {s.key} ({s.kind})
        </span>
        <button type="button" onClick={() => setI((v) => clampI(v + 1))}>▶</button>
        <label htmlFor="dp-u">u {u.toFixed(2)}</label>
        <input id="dp-u" type="range" min={0} max={1} step={0.01} value={u} onChange={(e) => setU(Number(e.target.value))} style={{ flex: 1 }} />
      </div>
    </div>
  )
}
