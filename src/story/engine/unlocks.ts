import { create } from 'zustand'
import { entries } from '../../content/entries'
import type { Entry } from '../../content/types'

/** A = headline (own scene + big card), B = standard (compact card), C = collected (quick ping). */
export type Tier = 'A' | 'B' | 'C'

const TIER_A: ReadonlySet<string> = new Set([
  'martial-arts',
  'decor-brand',
  '21-in-21',
  'adobe',
  'motor-thesis',
  'visa',
  'content-pitch',
])
const TIER_B: ReadonlySet<string> = new Set([
  'carbon-neutral',
  'english-honor-society',
  'science-honor-society',
  'java-inventory',
])

export const tierOf = (entryId: string): Tier => (TIER_A.has(entryId) ? 'A' : TIER_B.has(entryId) ? 'B' : 'C')

const byId: ReadonlyMap<string, Entry> = new Map(entries.map((e) => [e.id, e]))
export const getEntry = (id: string): Entry | undefined => byId.get(id)

/** Total number of unlockable entries, derived from src/content. */
export const TOTAL_ENTRIES = entries.length

/** A single combined toast standing for several unlocks (see unlockGroup). */
export interface ToastGroup {
  label: string
  ids: readonly string[]
}
export const GROUP_PREFIX = 'group:'

interface UnlockState {
  /** Combined toasts by synthetic queue id ("group:<n>"). Only added to, never mutated. */
  groups: Readonly<Record<string, ToastGroup>>
  /** Replaced (never mutated) on change so selectors work. */
  unlocked: ReadonlySet<string>
  /** Entry ids waiting to be shown as toasts, oldest first. */
  toastQueue: readonly string[]
  /** Returns true only the first time an id is unlocked. Unknown ids are ignored. */
  unlock: (entryId: string) => boolean
  unlockMany: (entryIds: readonly string[]) => void
  /**
   * Unlock several entries at once but queue ONE compact toast carrying `label`.
   * Idempotent: ids already unlocked are skipped, and no toast is queued if nothing was new.
   */
  unlockGroup: (entryIds: readonly string[], label: string) => boolean
  isUnlocked: (entryId: string) => boolean
  /** HUD calls this when a toast has finished. */
  shiftToast: () => void
  reset: () => void
}

let groupSeq = 0

export const useUnlocks = create<UnlockState>((set, get) => ({
  groups: {},
  unlocked: new Set<string>(),
  toastQueue: [],
  unlock: (entryId) => {
    if (!byId.has(entryId) || get().unlocked.has(entryId)) return false
    set((s) => ({
      unlocked: new Set(s.unlocked).add(entryId),
      toastQueue: [...s.toastQueue, entryId],
    }))
    return true
  },
  unlockMany: (ids) => {
    for (const id of ids) get().unlock(id)
  },
  unlockGroup: (ids, label) => {
    const fresh = ids.filter((id, i) => byId.has(id) && !get().unlocked.has(id) && ids.indexOf(id) === i)
    if (fresh.length === 0) return false
    const key = `${GROUP_PREFIX}${++groupSeq}`
    set((s) => ({
      unlocked: new Set([...s.unlocked, ...fresh]),
      groups: { ...s.groups, [key]: { label, ids: fresh } },
      toastQueue: [...s.toastQueue, key],
    }))
    return true
  },
  isUnlocked: (id) => get().unlocked.has(id),
  shiftToast: () => set((s) => ({ toastQueue: s.toastQueue.slice(1) })),
  reset: () => set({ unlocked: new Set<string>(), toastQueue: [], groups: {} }),
}))

export const selectUnlockedCount = (s: UnlockState): number => s.unlocked.size
/** Non-hook access for scenes/engine code: `unlock('decor-brand')`. */
export const unlock = (entryId: string): boolean => useUnlocks.getState().unlock(entryId)
/** Non-hook: one combined toast for several entries (e.g. Chapter 1's "Early wins" card). */
export const unlockGroup = (entryIds: readonly string[], label: string): boolean =>
  useUnlocks.getState().unlockGroup(entryIds, label)
