import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChapterId } from '../../content/types'

/**
 * "Click to continue" cue. The story rests at each stop and waits for a click (Risheek, 2026-11-03: scroll speed was
 * never right). `rest` is a key that changes at every new rest (null while playing). The first few rests show the cue
 * quickly; later ones only after a longer idle. In a scroll zone (the flipbook) it says what to scroll instead.
 */
const FIRST_IDLE = 500
const LATER_IDLE = 1800
const GUIDED_RESTS = 6

export default function ClickCue(props: {
  rest: number | null
  chapter: ChapterId
  accent: string
  scrollHint: string | null
  label?: string
  hidden: boolean
}) {
  const { rest, chapter, accent, scrollHint, label, hidden } = props
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const [on, setOn] = useState(false)
  const rests = useRef(0)
  const seenZone = useRef(false)

  useEffect(() => {
    setOn(false)
    if (rest === null || hidden) return
    rests.current += 1
    const guided = rests.current <= GUIDED_RESTS || (!!scrollHint && !seenZone.current)
    const t = window.setTimeout(
      () => {
        if (scrollHint) seenZone.current = true
        setOn(true)
      },
      guided ? FIRST_IDLE : LATER_IDLE,
    )
    return () => window.clearTimeout(t)
  }, [rest, hidden, scrollHint, chapter])

  return (
    <div className={`cue${on ? ' is-on' : ''}${touch ? ' is-touch' : ''}`} role="status" aria-live="polite">
      {on && (
        <div className="cue-card" style={{ ['--accent' as string]: accent }}>
          <span className="cue-icon" aria-hidden="true">
            <i />
          </span>
          <span className="cue-text">
            {scrollHint ? (
              <>
                <strong>
                  {touch ? 'Swipe up' : 'Scroll'} to {scrollHint}
                </strong>
                <small>{touch ? 'Or tap' : 'Or click'} to play it through.</small>
              </>
            ) : (
              <>
              <strong>{label ? (touch ? label.replace(/^Click/, 'Tap') : label) : touch ? 'Tap to go forward' : 'Click to go forward'}</strong>
                <small>{touch ? 'Tap anywhere on the screen' : 'Click anywhere on the screen'}</small>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
