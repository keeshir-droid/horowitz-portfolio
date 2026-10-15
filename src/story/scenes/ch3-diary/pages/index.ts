/**
 * The diary, in order. Lead-owned: page agents edit only their own page modules; the engine reads SPREADS.
 * Spread = what you see with the book open. Leaf k (the paper you turn) = SPREADS[k].right on its front and
 * SPREADS[k + 1].left on its back.
 */
import type { Spread } from '../types'
import { endpaper, september } from './opening'
import { honors } from './honors'
import { carbon } from './carbon'
import { motorText, motorDiagram } from './motor'
import { stage } from './stage'
import { java } from './java'
import { petTherapy, flipFast } from './petTherapy'
import { riffleSpreads, finalSpread } from './riffle'

export const SPREADS: readonly Spread[] = [
  { key: 'open', kind: 'read', left: endpaper, right: september },
  { key: 'honors-carbon', kind: 'read', left: honors, right: carbon },
  { key: 'motor', kind: 'read', left: motorText, right: motorDiagram },
  { key: 'stage-java', kind: 'read', left: stage, right: java },
  { key: 'pet', kind: 'read', left: petTherapy, right: flipFast },
  ...riffleSpreads.map((s, k): Spread => ({ key: `riffle-${k}`, kind: 'riffle', left: s.left, right: s.right })),
  { key: 'final', kind: 'final', left: finalSpread.left, right: finalSpread.right },
]
