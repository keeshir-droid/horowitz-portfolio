import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { hasSeenIntro, markIntroSeen, prefersReducedMotion, replayIntro, useApp, webglAvailable } from '../store'
import { person } from '../content/entries'
import { audio, sfx } from '../story/engine/audio'

const Opening = lazy(() => import('./Opening'))

type Phase = 'cinematic' | 'menu'

const OPTIONS = [
  { key: 'story', label: 'START JOURNEY', hint: 'the immersive story · ~6 min' },
  { key: 'index', label: 'JUST SHOW ME', hint: 'every achievement, fast' },
] as const

function Menu({ visible }: { visible: boolean }) {
  const setMode = useApp((s) => s.setMode)
  const [sel, setSel] = useState(0)
  const muted = useSyncExternalStore(audio.subscribe, audio.isMuted, () => false)

  /** Play after the context is running so the first sound is never dropped while it is still 'suspended'. */
  const sound = useCallback((fn: () => void) => {
    void audio.whenRunning().then((ok) => ok && fn())
  }, [])

  const move = useCallback(
    (next: (v: number) => number) => {
      audio.unlock() // keydown is a valid gesture
      sound(sfx.blip)
      setSel(next)
    },
    [sound],
  )

  const choose = useCallback(
    (i: number) => {
      audio.unlock() // must run synchronously inside the click/Enter gesture
      sound(() => {
        sfx.confirm()
        if (OPTIONS[i].key === 'story') sfx.gameboyChime()
      })
      markIntroSeen()
      setMode(OPTIONS[i].key)
    },
    [setMode, sound],
  )

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 's' || e.key === 'w') {
        move((v) => (v + 1) % OPTIONS.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        // A focused button handles its own click: don't also fire the highlighted option.
        if ((e.target as HTMLElement | null)?.closest?.('button')) return
        choose(sel)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, sel, choose, move])

  return (
    <div className={`gate-menu ${visible ? 'is-in' : ''}`} aria-hidden={!visible}>
      <div className="lcd">
        <p className="lcd-kicker">SAVE FILE · AGE {person.age}</p>
        <h1 className="lcd-title">
          RISHEEK
          <br />
          NAWKA
        </h1>
        <p className="lcd-sub">CREATIVE TECHNOLOGIST</p>
        <ul className="lcd-options" role="menu">
          {OPTIONS.map((o, i) => (
            <li key={o.key} role="none">
              <button
                role="menuitem"
                tabIndex={visible ? 0 : -1}
                className={sel === i ? 'is-sel' : ''}
                onMouseEnter={() => {
                  if (sel !== i && audio.isUnlocked()) sound(sfx.blip) // hover is not a gesture: only once unlocked
                  setSel(i)
                }}
                onFocus={() => setSel(i)}
                onClick={() => choose(i)}
              >
                <span className="cursor">{sel === i ? '▶' : ' '}</span> {o.label}
                <small>{o.hint}</small>
              </button>
            </li>
          ))}
        </ul>
        <p className="lcd-foot">↑↓ + ENTER · or just click</p>
        <div className="lcd-tools">
          <button
            type="button"
            className={`lcd-snd ${muted ? 'is-off' : ''}`}
            tabIndex={visible ? 0 : -1}
            aria-pressed={!muted}
            onClick={() => {
              audio.unlock() // the click is the gesture
              const off = audio.toggleMute()
              if (!off) sound(sfx.blip)
            }}
          >
            {muted ? 'SND OFF' : 'SND ON'}
          </button>
          <button type="button" className="lcd-replay" tabIndex={visible ? 0 : -1} onClick={replayIntro}>
            ↻ REPLAY INTRO
          </button>
        </div>
        {muted && <p className="lcd-foot" style={{ marginTop: 14 }}>SOUND IS OFF · TAP SND TO TURN IT ON</p>}
      </div>
    </div>
  )
}

export default function Gate() {
  // Anyone coming back to the menu in-session, reduced-motion users and no-WebGL devices land straight on the menu.
  const [playCinematic] = useState(() => !hasSeenIntro() && !prefersReducedMotion() && webglAvailable())
  const [phase, setPhase] = useState<Phase>(playCinematic ? 'cinematic' : 'menu')
  const [ready, setReady] = useState(!playCinematic)
  const [menuIn, setMenuIn] = useState(!playCinematic)
  const [posterGone, setPosterGone] = useState(!playCinematic)

  const toMenu = useCallback(() => {
    setPhase('menu')
    setMenuIn(true)
  }, [])

  // Drop the poster from the DOM shortly after the first 3D frame.
  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => setPosterGone(true), 450)
    return () => window.clearTimeout(id)
  }, [ready])

  // If the 3D hasn't produced a frame in 4s, don't make anyone wait: show the menu.
  useEffect(() => {
    if (!playCinematic || ready) return
    const id = window.setTimeout(toMenu, 4000)
    return () => window.clearTimeout(id)
  }, [playCinematic, ready, toMenu])

  return (
    <main className="gate">
      {!posterGone && (
        <div className={`poster ${ready ? 'is-gone' : ''}`} aria-hidden>
          <div className="poster-window" />
        </div>
      )}

      {playCinematic && phase === 'cinematic' && (
        <Suspense fallback={null}>
          <Opening onReady={() => setReady(true)} onMenuCue={() => setMenuIn(true)} onDone={toMenu} />
        </Suspense>
      )}

      {phase === 'cinematic' && (
        <button
          className="skip"
          onClick={() => {
            markIntroSeen()
            toMenu()
          }}
        >
          SKIP ▶▶
        </button>
      )}

      <Menu visible={menuIn} />
    </main>
  )
}
