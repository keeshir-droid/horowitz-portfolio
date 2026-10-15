/**
 * The golden-hour city as one SVG in viewport pixels. Static geometry comes from skyline.ts (memoised per size);
 * this component only moves layers (crane parallax), sinks the sun, drifts fog/clouds/boat/gulls and switches on
 * window lights. Pure function of its props.
 */
import { memo } from 'react'
import { DUR, SKY, SKYLINE, SUN, WATER, WATER_Y } from './config'
import { WINDOW_BUCKETS, type Skyline } from './skyline'

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const f = (n: number): string => (Math.round(n * 10) / 10).toString()

export interface CityFrame {
  /** Scene time in seconds. */
  t: number
  /** Crane 0 (Chapter 4's frame) .. 1 (risen). */
  crane: number
  /** Sun centre y as a fraction of the viewport. */
  sunY: number
  /** Window lights 0..1. */
  lights: number
  /** 0..1 deepening of the upper sky as the sun goes down. */
  dusk: number
  reduced: boolean
}

/** Static layers that never change for a given size. */
const Defs = memo(function Defs() {
  return (
    <defs>
      <linearGradient id="c5-sky" x1="0" y1="0" x2="0" y2="1">
        {SKY.map(([o, c]) => (
          <stop key={o} offset={o} stopColor={c} />
        ))}
      </linearGradient>
      <linearGradient id="c5-dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#24306e" stopOpacity="0.75" />
        <stop offset="0.45" stopColor="#7a4a78" stopOpacity="0.25" />
        <stop offset="0.75" stopColor="#7a4a78" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="c5-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={WATER[0]} />
        <stop offset="1" stopColor={WATER[1]} />
      </linearGradient>
      <radialGradient id="c5-halo">
        <stop offset="0" stopColor="#fffbe6" />
        <stop offset="0.5" stopColor="#ffe9a8" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="c5-glow">
        <stop offset="0" stopColor="#fff1c2" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffb86b" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="c5-fog">
        <stop offset="0" stopColor="#fff4e6" stopOpacity="0.85" />
        <stop offset="0.6" stopColor="#fde3cf" stopOpacity="0.4" />
        <stop offset="1" stopColor="#fde3cf" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="c5-cloud">
        <stop offset="0" stopColor="#ffd2b4" stopOpacity="0.7" />
        <stop offset="1" stopColor="#f0a088" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="c5-refl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="1" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
})

/** Thin warm cloud streaks: [x, y, rx, ry] as fractions of the viewport, drift speed (fraction of w over the scene). */
const CLOUDS: readonly (readonly [number, number, number, number, number])[] = [
  [0.18, 0.2, 0.22, 0.018, 0.03],
  [0.55, 0.13, 0.3, 0.014, 0.02],
  [0.86, 0.27, 0.2, 0.016, 0.035],
  [0.38, 0.36, 0.26, 0.012, 0.04],
  [0.7, 0.45, 0.16, 0.01, 0.045],
]

function City({ sk, fr }: { sk: Skyline; fr: CityFrame }) {
  const { w, h, horizon: hz } = sk
  const { crane, t, reduced } = fr
  const u = 1 - crane
  // crane up: nearer layers rise more (they started lower / hidden behind the water line)
  const yHills = u * 0.012 * h
  const yBack = u * 0.03 * h
  const yBridge = u * 0.032 * h
  const yCity = u * 0.05 * h
  const sx = SUN.x * w
  const sy = fr.sunY * h
  const k = t / DUR
  const drift = reduced ? 0 : k

  // sun glitter on the water: short dashes under the sun, wider and sparser towards the viewer
  let glitter = ''
  const rows = 16
  for (let i = 0; i < rows; i++) {
    const d = i / (rows - 1)
    const y = hz + 3 + Math.pow(d, 1.4) * (h - hz) * 0.9
    const spread = (0.012 + d * 0.06) * w
    const ph = reduced ? i * 1.7 : t * 2.2 + i * 1.7
    const len = (0.01 + d * 0.035) * w * (0.55 + 0.45 * Math.sin(ph * 1.3))
    const x = sx + Math.sin(ph) * spread * 0.5 - len / 2
    glitter += `M${f(x)} ${f(y)} h${f(len)} `
  }

  // a few gulls far away (calm, slow); hidden with reduced motion
  let gulls = ''
  if (!reduced) {
    for (let i = 0; i < 3; i++) {
      const gx = ((0.12 + i * 0.13 + k * (0.22 + i * 0.05)) % 1.2) * w
      const gy = (0.3 + i * 0.045 + Math.sin(k * 6 + i) * 0.01) * h
      const s = (0.009 - i * 0.0015) * h
      const flap = Math.sin(t * (7 + i) + i * 2) * 0.45 * s
      gulls += `M${f(gx - s)} ${f(gy - flap)} Q${f(gx - s * 0.45)} ${f(gy - s * 0.55)} ${f(gx)} ${f(gy)} Q${f(gx + s * 0.45)} ${f(gy - s * 0.55)} ${f(gx + s)} ${f(gy - flap)} `
    }
  }

  const boatX = (0.27 + drift * 0.06) * w
  const boatY = hz + (h - hz) * 0.32
  const lit = (i: number): number => clamp01(fr.lights * WINDOW_BUCKETS - i)

  return (
    <svg className="c5-city" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" focusable="false">
      <Defs />
      <clipPath id="c5-below">
        <rect y={hz} width={w} height={h - hz} />
      </clipPath>
      <rect width={w} height={h} fill="url(#c5-sky)" />
      <rect width={w} height={h} fill="url(#c5-dusk)" opacity={fr.dusk} />
      {/* clouds */}
      {CLOUDS.map(([cx, cy, rx, ry, v], i) => (
        <ellipse key={i} cx={(cx + v * drift) * w} cy={cy * h} rx={rx * w} ry={ry * h * 2.2} fill="url(#c5-cloud)" opacity={0.75 - fr.dusk * 0.2} />
      ))}
      {/* sun: wide glow, soft halo, crisp disk */}
      <circle cx={sx} cy={sy} r={0.42 * h} fill="url(#c5-glow)" />
      <circle cx={sx} cy={sy} r={0.19 * h} fill="url(#c5-halo)" />
      <circle cx={sx} cy={sy} r={0.042 * h} fill={SUN.color} />
      {/* hills */}
      <path d={sk.ridgeFar} transform={`translate(0 ${f(yHills * 0.6)})`} fill="#c98a86" opacity="0.5" />
      <path d={sk.ridgeNear} transform={`translate(0 ${f(yHills)})`} fill="#b9707a" opacity="0.62" />
      {/* back row of buildings (hazy) */}
      <path d={sk.backCity} transform={`translate(0 ${f(yBack)})`} fill="#93525e" opacity="0.7" />
      {/* bridge */}
      <g transform={`translate(0 ${f(yBridge)})`}>
        <path d={sk.suspenders} stroke="#a3483a" strokeWidth={sk.suspW} opacity="0.55" fill="none" />
        <path d={sk.cables} stroke="#a3483a" strokeWidth={sk.cableW} fill="none" strokeLinecap="round" />
        <path d={sk.deck} fill="#8f3e34" />
        <path d={sk.towers} fill="#9c4334" />
      </g>
      {/* fog bank rolling in under the bridge */}
      <g opacity="0.9">
        <ellipse cx={(0.1 + drift * 0.05) * w} cy={hz - 0.035 * h} rx={0.32 * w} ry={0.06 * h} fill="url(#c5-fog)" />
        <ellipse cx={(0.33 + drift * 0.04) * w} cy={hz - 0.012 * h} rx={0.22 * w} ry={0.035 * h} fill="url(#c5-fog)" />
      </g>
      {/* downtown */}
      <g transform={`translate(0 ${f(yCity)})`}>
        <path d={sk.city} fill={SKYLINE} />
        <path d={sk.rim} fill="#e9946c" opacity={0.55 * (1 - fr.dusk * 0.6)} />
        {sk.windows.map((d, i) => (
          <path key={i} d={d} fill="#ffe2a0" opacity={lit(i) * 0.9} />
        ))}
      </g>
      {/* the bay */}
      <rect y={WATER_Y * h} width={w} height={h - WATER_Y * h} fill="url(#c5-water)" />
      {/* reflections of the towers and bridge (squashed, fading) */}
      <g clipPath="url(#c5-below)" opacity="0.22">
        <g transform={`translate(0 ${f(hz)}) scale(1 -0.42) translate(0 ${f(-hz)})`}>
          <path d={sk.city} transform={`translate(0 ${f(yCity)})`} fill="#4a2440" />
          <path d={sk.towers} transform={`translate(0 ${f(yBridge)})`} fill="#5e2a36" />
        </g>
      </g>
      <path d={glitter} stroke="#fff3c8" strokeWidth={Math.max(2, 0.0045 * h)} strokeLinecap="round" opacity="0.75" />
      {/* soft wave lines */}
      <path
        d={`M0 ${f(hz + 0.05 * h)} H${f(w)} M0 ${f(hz + 0.11 * h)} H${f(w)} M0 ${f(hz + 0.18 * h)} H${f(w)}`}
        stroke="#f7c08a"
        strokeWidth="1"
        strokeDasharray={`${f(0.04 * w)} ${f(0.09 * w)}`}
        strokeDashoffset={f(-drift * 0.12 * w)}
        opacity="0.35"
      />
      {/* a sailboat */}
      <path d={sk.boat} transform={`translate(${f(boatX)} ${f(boatY)})`} fill="#4c2a3e" />
      {/* near fog wisp over the water */}
      <ellipse cx={(0.58 - drift * 0.04) * w} cy={hz + 0.012 * h} rx={0.3 * w} ry={0.022 * h} fill="url(#c5-fog)" opacity="0.6" />
      {gulls && <path d={gulls} stroke="#5a2e3c" strokeWidth={Math.max(1.2, 0.0022 * h)} fill="none" strokeLinecap="round" />}
    </svg>
  )
}

export default memo(City)
