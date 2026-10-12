import { Component, type CSSProperties, type ReactNode } from 'react'
import { markIntroSeen, useApp } from './store'
import { CHUNK_RE, hasReloaded, markReloaded } from './chunkGuard'

const btn: CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  border: '2px solid var(--ink)',
  background: '#0e0f1a',
  color: 'var(--ink)',
  fontFamily: 'var(--pixel)',
  fontSize: 9,
}

interface State {
  error: Error | null
  retry: number
  key: string
}

/**
 * Catches failures of lazy chunks (stale deploy, offline) around Story/Gate. A chunk-load error triggers ONE automatic
 * reload (sessionStorage guard against loops); otherwise a card offers the Index (and the menu when failing in the Gate).
 */
export default class AppBoundary extends Component<{ children: ReactNode; resetKey: string }, State> {
  state: State = { error: null, retry: 0, key: this.props.resetKey }
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }
  componentDidCatch(error: Error): void {
    if (CHUNK_RE.test(String(error?.message)) && !hasReloaded()) {
      markReloaded()
      window.location.reload()
    }
  }
  static getDerivedStateFromProps(props: { resetKey: string }, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { key: props.resetKey, error: null } : null
  }
  render(): ReactNode {
    if (!this.state.error) return <div key={this.state.retry} style={{ display: 'contents' }}>{this.props.children}</div>
    const inGate = useApp.getState().mode === 'gate'
    return (
      <div className="boot-fallback" role="alert" style={{ textAlign: 'center', padding: 24 }}>
        <div>
          <p className="eyebrow">SOMETHING WENT WRONG</p>
          <h2 style={{ margin: '12px 0' }}>Something went wrong loading this part</h2>
          <p className="muted">Everything is still available in the Index.</p>
          <p style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            <button type="button" style={btn} onClick={() => useApp.getState().setMode('index')}>
              ☰ SEE THE INDEX
            </button>
            <button
              type="button"
              style={btn}
              onClick={() => {
                markIntroSeen()
                if (inGate) this.setState((s) => ({ error: null, retry: s.retry + 1 }))
                else useApp.getState().setMode('gate')
              }}
            >
              ◀ MENU
            </button>
            <button type="button" style={btn} onClick={() => window.location.reload()}>
              ↻ RELOAD
            </button>
          </p>
        </div>
      </div>
    )
  }
}
