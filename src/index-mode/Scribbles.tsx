/**
 * Whimsical margin doodles for the Index: stars, squiggles, hearts, loops in marker colours, drawn behind the content.
 * Decorative only (aria-hidden, no pointer events); fewer and smaller on phones (see index-mode.css).
 */
const COLORS = { pink: '#ff5fa2', blue: '#3b82ff', mint: '#19c99a', yellow: '#ffb800', purple: '#9b5cff', orange: '#ff7a3d' } as const
type Color = keyof typeof COLORS

const SHAPES = {
  star: 'M30 6 L36 24 L55 24 L40 35 L46 54 L30 42 L14 54 L20 35 L5 24 L24 24 Z',
  squiggle: 'M4 32 Q11 10 18 32 T32 32 T46 32 T58 30',
  spiral: 'M30 30 C30 24 38 24 38 31 C38 40 24 40 22 30 C20 18 36 14 44 24 C52 36 38 52 22 48 C8 44 6 26 16 16',
  heart: 'M30 50 C5 32 8 10 22 12 C28 13 30 18 30 20 C30 18 32 13 38 12 C52 10 55 32 30 50 Z',
  sparkle: 'M30 4 L34 26 L56 30 L34 34 L30 56 L26 34 L4 30 L26 26 Z',
  loop: 'M30 8 C48 6 56 24 50 40 C44 54 22 56 12 44 C2 32 8 12 28 10 C40 9 48 18 46 30',
  arrow: 'M6 42 C18 10 42 8 52 34 M52 34 L40 32 M52 34 L50 21',
  zigzag: 'M4 42 L16 20 L28 42 L40 20 L52 42',
  cloud: 'M14 42 C4 42 4 28 14 28 C14 16 32 14 36 26 C48 22 56 36 46 42 Z',
  bolt: 'M34 4 L16 32 L28 32 L24 56 L46 24 L32 24 Z',
} as const

interface Item {
  s: keyof typeof SHAPES
  c: Color
  /** CSS position (left or right, and top, as % or px), size in px, rotation in degrees. */
  at: { left?: string; right?: string; top: string }
  size?: number
  rot?: number
  /** Hide on phones. */
  hideSm?: boolean
}

const ZONES = {
  hero: [
    { s: 'star', c: 'yellow', at: { right: '2%', top: '2%' }, size: 62, rot: 12 },
    { s: 'squiggle', c: 'pink', at: { left: '46%', top: '88%' }, size: 84, rot: -6, hideSm: true },
    { s: 'sparkle', c: 'blue', at: { left: '-1%', top: '64%' }, size: 40, rot: 8, hideSm: true },
    { s: 'heart', c: 'pink', at: { right: '1%', top: '78%' }, size: 44, rot: -14 },
  ],
  glance: [
    { s: 'spiral', c: 'purple', at: { right: '0%', top: '1%' }, size: 70, rot: 10 },
    { s: 'sparkle', c: 'yellow', at: { left: '38%', top: '3%' }, size: 38, rot: 0, hideSm: true },
    { s: 'zigzag', c: 'mint', at: { left: '-1%', top: '55%' }, size: 52, rot: 90, hideSm: true },
    { s: 'heart', c: 'orange', at: { right: '-1%', top: '60%' }, size: 40, rot: 16 },
  ],
  path: [
    { s: 'cloud', c: 'blue', at: { right: '4%', top: '4%' }, size: 70, rot: -4 },
    { s: 'arrow', c: 'pink', at: { left: '34%', top: '2%' }, size: 52, rot: 20, hideSm: true },
    { s: 'star', c: 'mint', at: { left: '19%', top: '3%' }, size: 36, rot: -12 },
    { s: 'bolt', c: 'yellow', at: { right: '24%', top: '5%' }, size: 38, rot: 8, hideSm: true },
  ],
  everything: [
    { s: 'loop', c: 'pink', at: { right: '1%', top: '1.5%' }, size: 66, rot: 14 },
    { s: 'star', c: 'blue', at: { left: '-1%', top: '16%' }, size: 40, rot: 10, hideSm: true },
    { s: 'squiggle', c: 'orange', at: { right: '0%', top: '34%' }, size: 74, rot: 80, hideSm: true },
    { s: 'sparkle', c: 'purple', at: { left: '-1%', top: '52%' }, size: 38, rot: 0, hideSm: true },
    { s: 'heart', c: 'mint', at: { right: '-1%', top: '70%' }, size: 38, rot: -10, hideSm: true },
    { s: 'zigzag', c: 'yellow', at: { left: '0%', top: '88%' }, size: 52, rot: -8, hideSm: true },
  ],
  shipped: [
    { s: 'star', c: 'pink', at: { right: '3%', top: '2%' }, size: 56, rot: -10 },
    { s: 'squiggle', c: 'blue', at: { left: '40%', top: '1%' }, size: 80, rot: 4, hideSm: true },
    { s: 'sparkle', c: 'orange', at: { left: '-1%', top: '88%' }, size: 36, rot: 12 },
    { s: 'spiral', c: 'mint', at: { right: '0%', top: '88%' }, size: 54, rot: -20, hideSm: true },
  ],
  contact: [
    { s: 'heart', c: 'pink', at: { left: '38%', top: '6%' }, size: 52, rot: -12 },
    { s: 'star', c: 'yellow', at: { left: '-1%', top: '70%' }, size: 44, rot: 14, hideSm: true },
    { s: 'squiggle', c: 'purple', at: { left: '8%', top: '96%' }, size: 80, rot: -3, hideSm: true },
    { s: 'sparkle', c: 'blue', at: { right: '0%', top: '2%' }, size: 38, rot: 6 },
  ],
} satisfies Record<string, Item[]>

export default function Scribbles({ zone }: { zone: keyof typeof ZONES }) {
  return (
    <>
      {(ZONES[zone] as Item[]).map((d, i) => (
        <svg
          key={i}
          className={`ix-doodle${d.hideSm ? ' hide-sm' : ''}`}
          viewBox="0 0 60 60"
          width={d.size ?? 48}
          height={d.size ?? 48}
          aria-hidden="true"
          focusable="false"
          style={{ ...d.at, width: Math.round((d.size ?? 48) * 1.45), height: Math.round((d.size ?? 48) * 1.45), maxWidth: 'none', ['--rot' as string]: `${d.rot ?? 0}deg`, ['--dly' as string]: `${(i * 0.7).toFixed(1)}s` }}
        >
          <path d={SHAPES[d.s]} fill="none" stroke={COLORS[d.c]} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </>
  )
}
