import { useState } from 'react'
import Hud from '../../engine/Hud'
import { useUnlocks } from '../../engine/unlocks'
import Ch1Walk, { meta } from './index'

/**
 * Dev harness for the Chapter 1 scene. Mount it from a temporary entry, e.g.
 *   createRoot(el).render(<ChapterOneHarness />)
 * URL params:  ?p=0.35  scene progress   &freeze=0  freeze the ambient clock (deterministic frames)
 *   &photo=test  render the photo slot from a generated test picture   &nohud  hide the HUD   &bare  hide the slider
 *   &active=0  render as an inactive scene   &reset  clear unlocks first
 */
const q = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
const num = (k: string): number | undefined => {
  const v = Number(q.get(k))
  return q.has(k) && Number.isFinite(v) ? v : undefined
}

if (q.has('reset')) useUnlocks.getState().reset()

export default function ChapterOneHarness() {
  const [p, setP] = useState(Math.min(1, Math.max(0, num('p') ?? 0)))
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Ch1Walk progress={p} active={q.get('active') !== '0'} freezeTime={num('freeze')} photo={q.get('photo') ?? undefined} />
      {!q.has('nohud') && <Hud chapter={meta.chapter} age="--" />}
      {!q.has('bare') && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, background: 'rgba(0,0,0,.6)', color: '#9bbc0f', font: '12px monospace', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor="ch1p">progress {p.toFixed(3)}</label>
          <input id="ch1p" type="range" min={0} max={1} step={0.001} value={p} onChange={(e) => setP(Number(e.target.value))} style={{ flex: 1 }} />
        </div>
      )}
    </div>
  )
}
