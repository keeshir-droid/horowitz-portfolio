/**
 * Ink-and-marker doodle of Risheek for the hero polaroid: the same character as the story (short black hair, round
 * glasses, black jacket, light-brown skin, no uniform), waving, with a Game Boy in his other hand (where the story starts).
 * Self-contained SVG so the Index bundle does not pull in the story engine.
 */
const INK = '#1b1a17'
const SKIN = '#e9b98f'

const pt = (sx: number, sy: number, a: number, len: number, side: number): [number, number] => {
  const r = (a * Math.PI) / 180
  return [sx + side * Math.sin(r) * len, sy + Math.cos(r) * len]
}

export default function Doodle() {
  const armL = 38
  const armR = 150
  const [alx, aly] = pt(-6, -25, armL, 12, -1)
  const [arx, ary] = pt(6, -25, armR, 12, 1)
  const [llx, lly] = pt(-3, -10, 8, 10, -1)
  const [lrx, lry] = pt(3, -10, 8, 10, 1)
  return (
    <svg viewBox="0 0 160 190" role="img" aria-label="Doodle of Risheek waving, holding a Game Boy" className="ix-doodle">
      <defs>
        <pattern id="ix-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke={INK} strokeWidth="0.5" opacity="0.5" />
        </pattern>
      </defs>
      {/* marker scribble behind him */}
      <path d="M26 118 C 18 70, 52 28, 96 30 C 136 32, 150 78, 134 118 C 120 150, 60 160, 26 118 Z" fill="#ffe34d" opacity="0.85" />
      <path d="M32 108 C 30 70, 58 40, 96 42" fill="none" stroke="#ff9ec4" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      {/* ground */}
      <path d="M22 176 q 14 -3 30 0 t 30 0 t 30 0 t 22 -1" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="80" cy="177" rx="26" ry="3.5" fill="url(#ix-hatch)" />
      <g transform="translate(80 176) scale(2.7)" stroke={INK} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M-3,-10 L${llx},${lly} M3,-10 L${lrx},${lry}`} fill="none" strokeWidth="1.5" />
        <ellipse cx={llx - 1.3} cy={lly} rx="2.5" ry="1.3" fill={INK} />
        <ellipse cx={lrx + 1.3} cy={lry} rx="2.5" ry="1.3" fill={INK} />
        <path d="M-6,-26 L6,-26 L7.5,-10 L-7.5,-10 Z" fill={INK} />
        <path d="M-2.2,-26 L0,-22.4 L2.2,-26 Z" fill="#fff" strokeWidth="0.8" />
        <path d={`M-6,-25 L${alx},${aly} M6,-25 L${arx},${ary}`} fill="none" strokeWidth="2.6" />
        <circle cx={alx} cy={aly} r="1.7" fill={SKIN} strokeWidth="1" />
        <circle cx={arx} cy={ary} r="1.7" fill={SKIN} strokeWidth="1" />
        {/* Game Boy */}
        <g transform={`translate(${alx - 2.2} ${aly - 4}) rotate(-14)`}>
          <rect x="-5" y="-8" width="10" height="16" rx="1.2" fill="#fff" />
          <rect x="-3.6" y="-6.6" width="7.2" height="6" rx="0.4" fill="#9bbc0f" strokeWidth="0.8" />
          <circle cx="-1.9" cy="3.6" r="0.9" fill={INK} strokeWidth="0.3" />
          <circle cx="2" cy="3" r="0.7" fill="#ff5d73" strokeWidth="0.3" />
          <circle cx={alx > 0 ? 0 : 0.6} cy="6.2" r="0" />
        </g>
        <circle cx={alx} cy={aly} r="1.7" fill={SKIN} strokeWidth="1" />
        <ellipse cx="0" cy="-38" rx="11" ry="12" fill={SKIN} />
        <path d="M-11,-40 Q-11.6,-51 0,-50.6 Q11.6,-51 11,-40 L9,-43.2 L6.8,-41 L4,-44 L1.2,-41.8 L-2,-44.4 L-5,-41.8 L-8,-44 Z" fill={INK} />
        <circle cx="-4.4" cy="-37" r="3.6" fill="#fff" />
        <circle cx="4.4" cy="-37" r="3.6" fill="#fff" />
        <path d="M-0.8,-37 L0.8,-37" fill="none" />
        <circle cx="-4.2" cy="-36.8" r="0.95" fill={INK} stroke="none" />
        <circle cx="4.6" cy="-36.8" r="0.95" fill={INK} stroke="none" />
        <path d="M-3,-31.2 Q0,-28.4 3,-31.2" fill="none" strokeWidth="1" />
      </g>
      {/* wave lines */}
      <path d="M142 38 q 6 -6 12 -2 M146 52 q 8 -2 12 4 M134 26 q 3 -8 10 -8" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
