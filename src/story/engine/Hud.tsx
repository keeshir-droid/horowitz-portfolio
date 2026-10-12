import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { chapters } from '../../content/entries'
import type { ChapterId } from '../../content/types'
import { useApp } from '../../store'
import { audio, sfx } from './audio'
import { getEntry, GROUP_PREFIX, selectUnlockedCount, TOTAL_ENTRIES, tierOf, useUnlocks, type Tier } from './unlocks'
import './hud.css'

export interface HudProps {
  chapter: ChapterId
  /** Placeholder until the age beats are decided; shown as "AGE --" when omitted. */
  age?: number | string
  /** Debug/verification: never auto-dismiss toasts (still dismissable by button/Escape). */
  pinToast?: boolean
}

const TOAST_MS: Record<Tier, number> = { A: 6500, B: 4800, C: 2600 }
const PROOF_MS = 9000
/** A combined group card holds a long line of text. */
const GROUP_MS = 6500
/** After a pause, never dismiss sooner than this so the viewer can still read/click. */
const MIN_RESUME_MS = 1500

export default function Hud({ chapter, age, pinToast }: HudProps) {
  const ch = chapters[chapter] ?? chapters[1]
  const count = useUnlocks(selectUnlockedCount)
  const toastId = useUnlocks((s) => s.toastQueue[0])
  const shiftToast = useUnlocks((s) => s.shiftToast)
  const muted = useSyncExternalStore(audio.subscribe, audio.isMuted, () => false)
  // The toast sits just under the top bar (never over the bottom dock or its SKIP button); follow the bar's real height.
  const hudRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bar = barRef.current
    const root = hudRef.current
    if (!bar || !root) return
    const sync = () => root.style.setProperty('--hud-bar-h', `${bar.offsetHeight}px`)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])
  const pct = TOTAL_ENTRIES > 0 ? Math.round((count / TOTAL_ENTRIES) * 100) : 0

  const group = useUnlocks((s) => (toastId ? s.groups[toastId] : undefined))
  const entry = toastId ? getEntry(toastId) : undefined
  const isGroup = !!toastId && toastId.startsWith(GROUP_PREFIX) && !!group
  const tier: Tier = toastId ? tierOf(toastId) : 'C'
  const hasProof = !!entry?.links?.length

  // Hover / focus pause. Stored per toast id so a toast that unmounts while hovered cannot leave the next one paused.
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const hold = !!toastId && (hoverId === toastId || focusId === toastId)

  // Sound once per toast, and reset the countdown.
  const remaining = useRef(0)
  useEffect(() => {
    if (!toastId) return
    remaining.current = hasProof ? PROOF_MS : isGroup ? GROUP_MS : TOAST_MS[tier]
    if (tier === 'A') {
      sfx.tada(4)
      sfx.applause(2.2)
    } else if (tier === 'B') sfx.tada(1)
    else sfx.coin()
  }, [toastId, hasProof, tier, isGroup])

  // Countdown: runs only while not held; pausing banks the time that is left.
  useEffect(() => {
    if (!toastId || pinToast || hold) return
    const started = performance.now()
    const t = window.setTimeout(shiftToast, Math.max(MIN_RESUME_MS, remaining.current))
    return () => {
      window.clearTimeout(t)
      remaining.current = Math.max(MIN_RESUME_MS, remaining.current - (performance.now() - started))
    }
  }, [toastId, pinToast, hold, shiftToast])

  // Escape dismisses the front toast from anywhere, but only while one is visible.
  useEffect(() => {
    if (!toastId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') shiftToast()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toastId, shiftToast])

  return (
    <div className="hud" ref={hudRef} style={{ ['--hud-accent' as string]: ch.accent }}>
      <div className="hud-bar" ref={barRef}>
        <div className="hud-top">
          <div className="hud-chapter">
            <span className="hud-ch">CH {chapter}</span>
            <span className="hud-era">{ch.era.toUpperCase()}</span>
            <span className="hud-age">AGE {age ?? '--'}</span>
          </div>
          <div className="hud-actions">
            <button
              type="button"
              className="hud-btn hud-btn-snd"
              aria-pressed={muted}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              onClick={() => {
                audio.unlock()
                audio.toggleMute()
                sfx.blip()
              }}
            >
              {muted ? 'SND OFF' : 'SND ON'}
            </button>
            <button type="button" className="hud-btn hud-btn-index" onClick={() => useApp.getState().setMode('index')}>
              ☰ INDEX
            </button>
          </div>
        </div>

        <div className="hud-xp-row">
          <div
            className="hud-xp"
            role="progressbar"
            aria-label="Achievements unlocked"
            aria-valuemin={0}
            aria-valuemax={TOTAL_ENTRIES}
            aria-valuenow={count}
          >
            <i style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          <span className="hud-count">
            UNLOCKED {count} / {TOTAL_ENTRIES}
          </span>
        </div>
      </div>

      <div className="hud-toast-zone" role="status" aria-live="polite" aria-atomic="true">
        {isGroup && group && toastId && (
          <section
            key={toastId}
            className="hud-toast hud-tier-C"
            data-hold={hold ? '1' : '0'}
            onPointerEnter={() => setHoverId(toastId)}
            onPointerLeave={() => setHoverId(null)}
            onFocus={() => setFocusId(toastId)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFocusId(null)
            }}
          >
            <p className="hud-toast-kicker">{group.ids.length} UNLOCKED</p>
            <h2 className="hud-toast-title">{group.label}</h2>
            <div className="hud-toast-actions">
              <button type="button" className="hud-dismiss" onClick={shiftToast} aria-label="Dismiss achievement">
                OK
              </button>
            </div>
          </section>
        )}
        {entry && (
          <section
            key={entry.id}
            className={`hud-toast hud-tier-${tier}`}
            data-hold={hold ? "1" : "0"}
            onPointerEnter={() => setHoverId(entry.id)}
            onPointerLeave={() => setHoverId(null)}
            onFocus={() => setFocusId(entry.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFocusId(null)
            }}
          >
            <p className="hud-toast-kicker">ACHIEVEMENT UNLOCKED</p>
            <h2 className="hud-toast-title">{entry.title}</h2>
            {entry.stat && (
              <p className="hud-toast-stat">
                <strong>{entry.stat.value}</strong>
                <span>{entry.stat.label}</span>
              </p>
            )}
            {tier !== 'C' && <p className="hud-toast-blurb">{entry.blurb}</p>}
            <div className="hud-toast-actions">
              {entry.links?.[0] && (
                <a className="hud-link" href={entry.links[0].href} target="_blank" rel="noreferrer">
                  view proof
                </a>
              )}
              <button type="button" className="hud-dismiss" onClick={shiftToast} aria-label="Dismiss achievement">
                OK
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
