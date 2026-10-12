import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { chapters, entries } from '../../content/entries'
import type { ChapterId } from '../../content/types'
import { useApp } from '../../store'
import type { SceneProps } from '../engine/types'
import type { Slide } from './plan'

/** Never white-screen: any scene render/load failure becomes a friendly card with a way out. */
interface BoundaryState {
  failed: boolean
  key: number
}

export class SceneBoundary extends Component<{ children: ReactNode; resetKey?: number }, BoundaryState> {
  state: BoundaryState = { failed: false, key: this.props.resetKey ?? 0 }
  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true }
  }
  // Scrolling on within a failed scene gives it another go (a working scene is never remounted by this).
  static getDerivedStateFromProps(props: { resetKey?: number }, state: BoundaryState): Partial<BoundaryState> | null {
    const k = props.resetKey ?? 0
    return k !== state.key ? { key: k, failed: false } : null
  }
  componentDidCatch(_e: Error, _info: ErrorInfo): void {
    /* React already logs the error once in dev; nothing else to do. */
  }
  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="story-card" role="alert">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h2>This scene couldn&apos;t load</h2>
        <p className="muted">Keep scrolling to carry on, or see everything in the Index.</p>
        <button type="button" className="story-btn" onClick={() => useApp.getState().setMode('index')}>
          ☰ SEE THE INDEX
        </button>
      </div>
    )
  }
}

export function ComingSoon({ chapter }: { chapter: ChapterId }) {
  const c = chapters[chapter]
  const count = entries.filter((e) => e.chapter === chapter).length
  return (
    <div className="story-card story-soon" style={{ ['--accent' as string]: c.accent }}>
      <p className="eyebrow">
        CHAPTER {c.id} · {c.format.toUpperCase()}
      </p>
      <h2>{c.era}</h2>
      <p className="story-soon-tag">COMING SOON</p>
      <p className="muted">
        {count} {count === 1 ? 'achievement in this chapter is' : 'achievements in this chapter are'} already in the Index.
      </p>
      <button type="button" className="story-btn" onClick={() => useApp.getState().setMode('index', undefined)}>
        ☰ SEE THEM IN THE INDEX
      </button>
    </div>
  )
}

/** Renders one slide: the real scene (lazy, boundary-wrapped) or the coming-soon card. */
export function SlideView({ slide, props }: { slide: Slide; props: SceneProps }) {
  if (!slide.entry) return <ComingSoon chapter={slide.meta.chapter} />
  const Scene = slide.entry.Component
  return (
    <SceneBoundary resetKey={Math.round(props.progress * 8)}>
      <Suspense fallback={<div className="story-loading">LOADING…</div>}>
        <Scene {...props} />
      </Suspense>
    </SceneBoundary>
  )
}
