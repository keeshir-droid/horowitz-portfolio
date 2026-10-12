import type { SceneMeta, SceneProps } from '../../engine/types'

/** Throwaway scene used by the engine demo harness. Not registered in the real story. */
export const meta: SceneMeta = { id: '_demo', chapter: 1, duration: 10, entryIds: ['decor-brand'] }

const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

export default function DemoScene({ progress, active }: SceneProps) {
  const p = clamp(progress)
  const x = 6 + p * 78 // walker crosses the screen
  const step = Math.floor(p * 24) % 2
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: 'linear-gradient(#9bbc0f 0 70%, #306230 70% 100%)',
        imageRendering: 'pixelated',
        fontFamily: 'var(--pixel)',
        color: '#0f380f',
      }}
    >
      <div style={{ position: 'absolute', left: 12, top: 56, fontSize: 9 }}>
        DEMO SCENE {active ? '(ACTIVE)' : '(idle)'} · PROGRESS {p.toFixed(2)}
      </div>
      {/* pixel "stage" at the end of the walk */}
      <div style={{ position: 'absolute', right: '4%', top: '38%', width: 64, height: 40, background: '#0f380f', border: '4px solid #306230' }} />
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: '52%',
          width: 20,
          height: 28,
          background: '#0f380f',
          boxShadow: `inset 0 8px 0 #8bac0f, ${step ? '-4px' : '4px'} 28px 0 -4px #0f380f`,
        }}
      />
    </div>
  )
}
