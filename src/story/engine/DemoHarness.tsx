import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { chapters } from '../../content/entries'
import DemoScene, { meta as demoMeta } from '../scenes/_demo'
import { audio, music, sfx } from './audio'
import Hud from './Hud'
import { buildTimeline, locate } from './timeline'
import PixelateTransition from './transitions/pixelate'
import { selectUnlockedCount, TOTAL_ENTRIES, unlock, useUnlocks } from './unlocks'
import type { SceneMeta } from './types'
import type { ChapterId } from '../../content/types'

/**
 * Dev-only engine harness. Mount it behind `import.meta.env.DEV`, e.g. in App.tsx:
 *   const DemoHarness = lazy(() => import('./story/engine/DemoHarness'))
 *   if (import.meta.env.DEV && location.search.includes('engine-demo')) return <Suspense><DemoHarness/></Suspense>
 * URL params (for headless runs): ?engine-demo&t=0.4 (scene progress)  &p=0.5 (pixelate)  &toast=decor-brand
 *   &toast=adobe,chess (several)  &ch=3 (chapter in the HUD)  &pin (toasts never auto-dismiss)  &tex (texture-mode test: text canvases)
 */
const q = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
const num = (k: string, d: number): number => {
  const v = Number(q.get(k))
  return q.has(k) && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d
}

const SCENES: SceneMeta[] = [
  demoMeta,
  { id: '_demo-b', chapter: 2, duration: 5, entryIds: [] },
  { id: '_demo-c', chapter: 3, duration: 5, entryIds: [] },
]

/** Texture-mode test source: text proves the upload is upright (not flipped). */
function makeTex(label: string, bg: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 360
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = bg
    g.fillRect(0, 0, 640, 360)
    g.fillStyle = '#0e0f1a'
    g.font = 'bold 96px sans-serif'
    g.textBaseline = 'top'
    g.fillText(label, 24, 16)
    g.fillRect(0, 300, 640, 60) // bar at the BOTTOM
  }
  return c
}

const btn: React.CSSProperties = {
  font: '10px var(--pixel)',
  padding: '10px 12px',
  background: '#161830',
  color: 'var(--ink)',
  border: '2px solid var(--line)',
}

export default function DemoHarness() {
  const [t, setT] = useState(() => num('t', 0))
  const [p, setP] = useState(() => num('p', 0))
  const [hasAudio, setHasAudio] = useState(audio.isUnlocked())
  const muted = useSyncExternalStore(audio.subscribe, audio.isMuted, () => false)
  const count = useUnlocks(selectUnlockedCount)
  const chRaw = Number(q.get('ch'))
  const chapter: ChapterId = chRaw === 2 || chRaw === 3 || chRaw === 4 || chRaw === 5 ? chRaw : 1
  const [tex] = useState(() => (q.has('tex') ? [makeTex('FROM', '#9bbc0f'), makeTex('TO', '#4cc9f0')] : null))

  const timeline = useMemo(() => buildTimeline(SCENES, { 1: chapters[1].weight, 2: chapters[2].weight, 3: chapters[3].weight }), [])
  const pos = locate(timeline, t)

  useEffect(() => {
    const ids = (q.get('toast') ?? '').split(',').filter(Boolean)
    for (const id of ids) unlock(id)
    return () => {
      useUnlocks.getState().reset()
      audio.dispose()
    }
  }, [])

  const gate = (fn: () => void) => () => {
    setHasAudio(audio.unlock())
    fn()
  }

  return (
    <div style={{ minHeight: '100vh', padding: '96px 14px 40px', maxWidth: 900, margin: '0 auto', position: 'relative' }}>
      <Hud chapter={chapter} age={q.get('age') ?? 12} pinToast={q.has('pin')} />
      <h1 style={{ font: '14px var(--pixel)', color: 'var(--accent)', marginBottom: 16 }}>ENGINE DEMO</h1>

      <div style={{ position: 'relative', height: 260, border: '2px solid var(--line)', marginBottom: 16 }}>
        <DemoScene progress={pos.sceneIndex === 0 ? pos.sceneProgress : 1} active={pos.sceneIndex === 0} />
      </div>
      <label style={{ display: 'grid', gap: 4, marginBottom: 14, fontSize: 14 }}>
        Total scroll progress {t.toFixed(3)} → scene {pos.sceneIndex} ({SCENES[pos.sceneIndex].id}) local {pos.sceneProgress.toFixed(2)}
        <input type="range" min={0} max={1} step={0.001} value={t} onChange={(e) => setT(Number(e.target.value))} />
      </label>
      <label style={{ display: 'grid', gap: 4, marginBottom: 14, fontSize: 14 }}>
        Pixelate transition progress {p.toFixed(2)}
        <input type="range" min={0} max={1} step={0.005} value={p} onChange={(e) => setP(Number(e.target.value))} />
      </label>

      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '10px 0 6px' }}>
        Audio is {hasAudio ? 'unlocked' : 'locked (click any button below)'} · {muted ? 'muted' : 'sound on'} · unlocked {count} / {TOTAL_ENTRIES}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <button style={btn} onClick={() => setHasAudio(audio.unlock())}>ENABLE AUDIO</button>
        <button style={btn} onClick={gate(() => sfx.blip())}>blip</button>
        <button style={btn} onClick={gate(() => sfx.coin())}>coin</button>
        <button style={btn} onClick={gate(() => sfx.tada(0))}>tada 0</button>
        <button style={btn} onClick={gate(() => sfx.tada(5))}>tada 5</button>
        <button style={btn} onClick={gate(() => sfx.applause(2))}>applause</button>
        <button style={btn} onClick={gate(() => sfx.footstep())}>footstep</button>
        <button style={btn} onClick={gate(() => sfx.confirm())}>confirm</button>
        <button style={btn} onClick={gate(() => sfx.gameboyChime())}>GB chime</button>
        <button style={btn} onClick={gate(() => music.play('town'))}>music: town</button>
        <button style={btn} onClick={gate(() => music.crossfade('calm', 1.5))}>crossfade: calm</button>
        <button style={btn} onClick={() => music.stop()}>music stop</button>
        <button style={btn} onClick={() => audio.toggleMute()}>{muted ? 'unmute' : 'mute'}</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button style={btn} onClick={() => unlock('decor-brand')}>unlock decor-brand (A)</button>
        <button style={btn} onClick={() => unlock('carbon-neutral')}>unlock carbon-neutral (B)</button>
        <button style={btn} onClick={() => unlock('chess')}>unlock chess (C)</button>
        <button style={btn} onClick={() => useUnlocks.getState().reset()}>reset unlocks</button>
      </div>

      <PixelateTransition progress={p} from={tex?.[0]} to={tex?.[1]} colors={[chapters[chapter].accent, '#0e0f1a', '#161830', '#f4f1e8']} />
    </div>
  )
}
