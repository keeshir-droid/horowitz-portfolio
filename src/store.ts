import { create } from 'zustand'

export type Mode = 'gate' | 'story' | 'index'

interface AppState {
  mode: Mode
  /** Scene id to scroll to when entering a mode (cross-linking Story <-> Index). */
  focus?: string
  /** Bumped to remount the Gate and replay the opening. */
  introRun: number
  setMode: (mode: Mode, focus?: string) => void
}

const hashToMode = (): Mode => {
  const h = window.location.hash
  if (h.startsWith('#/index')) return 'index'
  if (h.startsWith('#/story')) return 'story'
  return 'gate'
}

export const useApp = create<AppState>((set) => ({
  mode: hashToMode(),
  focus: undefined,
  introRun: 0,
  setMode: (mode, focus) => {
    window.location.hash = mode === 'gate' ? '' : `/${mode}`
    set({ mode, focus })
  },
}))

window.addEventListener('hashchange', () => {
  // In-page anchors (#highlights, #contact…) must not change the mode; only route hashes (#/…) or an empty hash do.
  const h = window.location.hash
  if (h && !h.startsWith('#/')) return
  useApp.setState({ mode: hashToMode() })
})

// The opening plays on every fresh page load; it only skips when you come back
// to the menu from inside the site (or hit skip). Not persisted across visits.
let introPlayed = false
export const hasSeenIntro = () => introPlayed
export const markIntroSeen = () => {
  introPlayed = true
}
export const replayIntro = () => {
  introPlayed = false
  useApp.setState((s) => ({ introRun: s.introRun + 1, mode: 'gate' }))
  window.location.hash = ''
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
