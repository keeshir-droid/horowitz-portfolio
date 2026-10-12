/** Stale-chunk reload guard (sessionStorage, always in try/catch). */
const RELOAD_KEY = 'rn-chunk-reload'
export const CHUNK_RE = /dynamically imported module|importing a module script|failed to fetch|ChunkLoadError|Loading chunk/i

export const hasReloaded = (): boolean => {
  try {
    return window.sessionStorage.getItem(RELOAD_KEY) === '1'
  } catch {
    return true // storage blocked: behave as "already reloaded" so we can never loop
  }
}
export const markReloaded = (): void => {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Call once the app has been healthy for a while: a later stale chunk may auto-reload again. */
export const clearReloadGuard = (): void => {
  try {
    window.sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    /* ignore */
  }
}

