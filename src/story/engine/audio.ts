/**
 * Fully procedural Web Audio engine. No audio files. Rules:
 *  - nothing is created until `audio.unlock()` is called from a user gesture (click/keypress);
 *  - every public call is a safe no-op when audio is unavailable, locked or muted;
 *  - mute is global and persisted (localStorage, try/catch).
 */

const MUTE_KEY = 'rn-portfolio-muted'

type Wave = 'square' | 'triangle' | 'sine' | 'sawtooth'

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

interface Engine {
  ctx: AudioContext
  master: GainNode
  sfxBus: GainNode
  musicBus: GainNode
  noise: AudioBuffer
}

let engine: Engine | null = null
let failed = false
/** Settles once the most recent resume() has finished (true = running). Lets callers wait before their first sound. */
let resumePending: Promise<boolean> | null = null
let muted = readMuted()
const listeners = new Set<() => void>()

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function emit(): void {
  for (const l of listeners) l()
}

const CEILING = 0.85

/**
 * master -> limiter-style compressor -> tanh soft clip (ceiling -1.4 dBFS) -> destination.
 * Exported so the limiter can be tested against an OfflineAudioContext.
 */
export function createMasterChain(ctx: BaseAudioContext, input: AudioNode): void {
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -10
  comp.knee.value = 0
  comp.ratio.value = 20
  comp.attack.value = 0.002
  comp.release.value = 0.12
  const clip = ctx.createWaveShaper()
  // curve spans input -1..1 (and beyond is clamped to the end values): hard ceiling at +-CEILING
  const n = 2048
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) curve[i] = CEILING * Math.tanh(((i / (n - 1)) * 2 - 1) * 1.6) / Math.tanh(1.6)
  clip.curve = curve
  clip.oversample = '2x'
  input.connect(comp).connect(clip).connect(ctx.destination)
}

function create(): Engine | null {
  if (engine) return engine
  if (failed) return null
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) throw new Error('no AudioContext')
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.8
    createMasterChain(ctx, master)
    const sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.9
    sfxBus.connect(master)
    const musicBus = ctx.createGain()
    musicBus.gain.value = 0.35
    musicBus.connect(master)
    // 1s of white noise, shared by every noise voice.
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    engine = { ctx, master, sfxBus, musicBus, noise }
    return engine
  } catch {
    failed = true
    return null
  }
}

/** Engine only when unlocked, running and not muted: the guard every voice uses. */
function live(): Engine | null {
  if (!engine || muted || engine.ctx.state !== 'running') return null
  return engine
}

function tone(
  e: Engine,
  freq: number,
  start: number,
  dur: number,
  wave: Wave,
  vol: number,
  dest: AudioNode,
  attack = 0.004,
  release = 0.05,
): void {
  const o = e.ctx.createOscillator()
  const g = e.ctx.createGain()
  o.type = wave
  o.frequency.setValueAtTime(freq, start)
  const end = start + dur
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(vol, start + attack)
  g.gain.setValueAtTime(vol, Math.max(start + attack, end - release))
  g.gain.exponentialRampToValueAtTime(0.0001, end + release)
  o.connect(g).connect(dest)
  o.start(start)
  o.stop(end + release + 0.02)
  o.onended = () => {
    o.disconnect()
    g.disconnect()
  }
}

function noiseHit(
  e: Engine,
  start: number,
  dur: number,
  vol: number,
  type: BiquadFilterType,
  freq: number,
  q: number,
  dest: AudioNode,
): void {
  const src = e.ctx.createBufferSource()
  src.buffer = e.noise
  const f = e.ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = e.ctx.createGain()
  g.gain.setValueAtTime(vol, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(f).connect(g).connect(dest)
  // random offset so repeated hits are not identical
  src.start(start, Math.random() * 0.5, dur + 0.02)
  src.onended = () => {
    src.disconnect()
    f.disconnect()
    g.disconnect()
  }
}

export const audio = {
  /** Call from a click/keypress handler. Idempotent. Returns true if audio is running. */
  unlock(): boolean {
    const e = create()
    if (!e) return false
    try {
      if (e.ctx.state === 'suspended') {
        resumePending = e.ctx
          .resume()
          .then(() => e.ctx.state === 'running')
          .catch(() => false)
      }
    } catch {
      return false
    }
    emit()
    return true
  },
  /**
   * Resolves true once the context is running (after the resume() started by unlock() settles), false if audio
   * is unavailable/locked. Never rejects. Use it to fire the first sound without it being dropped by live().
   */
  whenRunning(): Promise<boolean> {
    if (!engine) return Promise.resolve(false)
    if (engine.ctx.state === 'running') return Promise.resolve(true)
    return resumePending ?? Promise.resolve(false)
  },
  isUnlocked: (): boolean => engine !== null,
  /** True once a context exists (after unlock) or never possible. */
  isAvailable: (): boolean => !failed,
  isMuted: (): boolean => muted,
  setMuted(next: boolean): void {
    muted = next
    try {
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
    } catch {
      /* storage blocked: mute still holds for this session */
    }
    if (engine) {
      try {
        engine.master.gain.cancelScheduledValues(engine.ctx.currentTime)
        engine.master.gain.setTargetAtTime(next ? 0 : 0.8, engine.ctx.currentTime, 0.03)
      } catch {
        /* ignore */
      }
    }
    emit()
  },
  toggleMute(): boolean {
    audio.setMuted(!muted)
    return muted
  },
  /** For React: `useSyncExternalStore(audio.subscribe, audio.isMuted)`. */
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  /** Stop everything and release the AudioContext (e.g. harness unmount). A later unlock() makes a new one. */
  dispose(): void {
    music.stop(0)
    const e = engine
    engine = null
    if (e) void e.ctx.close().catch(() => undefined)
    emit()
  },
}

// ───────────────────────── sound effects ─────────────────────────

export const sfx = {
  blip(): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      tone(e, 880, t, 0.05, 'square', 0.18, e.sfxBus)
    } catch {
      /* never throw */
    }
  },
  coin(): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      tone(e, midiToHz(83), t, 0.07, 'square', 0.16, e.sfxBus)
      tone(e, midiToHz(88), t + 0.07, 0.28, 'square', 0.16, e.sfxBus, 0.004, 0.18)
    } catch {
      /* never throw */
    }
  },
  /** Ascending arpeggio; higher `level` = more notes and a higher climb (level 0..5). */
  tada(level = 0): void {
    const e = live()
    if (!e) return
    try {
      const lv = Math.max(0, Math.min(5, Math.floor(level)))
      const scale = [0, 4, 7, 12, 16, 19, 24] // major arpeggio
      const count = 4 + lv
      const base = 60 + lv * 2
      const t = e.ctx.currentTime
      const step = 0.075
      for (let i = 0; i < count; i++) {
        const last = i === count - 1
        const hz = midiToHz(base + scale[Math.min(i, scale.length - 1)])
        tone(e, hz, t + i * step, last ? 0.55 : 0.09, 'square', 0.12, e.sfxBus, 0.004, last ? 0.3 : 0.04)
        tone(e, hz * 0.5, t + i * step, last ? 0.55 : 0.09, 'triangle', 0.14, e.sfxBus, 0.004, last ? 0.3 : 0.04)
      }
    } catch {
      /* never throw */
    }
  },
  /** Crowd-ish applause: many short band-passed noise bursts, swelling then fading. */
  applause(duration = 2): void {
    const e = live()
    if (!e) return
    try {
      const dur = Math.max(0.3, Math.min(8, duration))
      const t = e.ctx.currentTime
      const n = Math.floor(dur * 28)
      for (let i = 0; i < n; i++) {
        const u = Math.random()
        const at = t + u * dur
        const env = Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05)) // swell and fade
        noiseHit(e, at, 0.03 + Math.random() * 0.05, 0.22 * env + 0.02, 'bandpass', 1500 + Math.random() * 2500, 0.8, e.sfxBus)
      }
    } catch {
      /* never throw */
    }
  },
  footstep(): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      noiseHit(e, t, 0.06, 0.35, 'lowpass', 500 + Math.random() * 300, 0.7, e.sfxBus)
    } catch {
      /* never throw */
    }
  },
  confirm(): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      tone(e, midiToHz(79), t, 0.06, 'square', 0.15, e.sfxBus)
      tone(e, midiToHz(86), t + 0.07, 0.12, 'square', 0.15, e.sfxBus, 0.004, 0.08)
    } catch {
      /* never throw */
    }
  },
  /** Punchy hit: low sine thump + short noise burst (K.O.). */
  impact(): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      const o = e.ctx.createOscillator()
      const g = e.ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(150, t)
      o.frequency.exponentialRampToValueAtTime(42, t + 0.22)
      g.gain.setValueAtTime(0.7, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      o.connect(g).connect(e.sfxBus)
      o.start(t)
      o.stop(t + 0.34)
      o.onended = () => {
        o.disconnect()
        g.disconnect()
      }
      noiseHit(e, t, 0.18, 0.45, 'lowpass', 2200, 0.7, e.sfxBus)
    } catch {
      /* never throw */
    }
  },
  /** Short air whoosh (a strike cutting the air): band-passed noise sweeping upward. `big` = longer, lower. */
  whoosh(big = false): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      const dur = big ? 0.32 : 0.14
      const src = e.ctx.createBufferSource()
      src.buffer = e.noise
      const f = e.ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 1.6
      f.frequency.setValueAtTime(big ? 300 : 700, t)
      f.frequency.exponentialRampToValueAtTime(big ? 2400 : 3800, t + dur)
      const g = e.ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(big ? 0.5 : 0.32, t + dur * 0.6)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      src.connect(f).connect(g).connect(e.sfxBus)
      src.start(t, Math.random() * 0.5, dur + 0.02)
      src.onended = () => {
        src.disconnect()
        f.disconnect()
        g.disconnect()
      }
    } catch {
      /* never throw */
    }
  },
  /** The two-note Game Boy boot ding (B5 -> E6, square). Safe to call before unlock: it just does nothing. */
  gameboyChime(): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      tone(e, 987.77, t, 0.09, 'square', 0.2, e.sfxBus, 0.002, 0.02)
      tone(e, 1318.51, t + 0.1, 0.9, 'square', 0.2, e.sfxBus, 0.002, 0.6)
    } catch {
      /* never throw */
    }
  },
}

// ───────────────────────── music ─────────────────────────

interface Track {
  /** Seconds per sequencer step. */
  step: number
  length: number
  /** MIDI note per step, 0 = rest. */
  lead: readonly number[]
  leadWave: Wave
  leadVol: number
  bass?: readonly number[]
  /** Soft noise tick on odd steps. */
  tick?: boolean
  /** Sustained chords keyed by step index (undefined = nothing). Each lasts `padLen` steps. */
  pad?: readonly (readonly number[] | undefined)[]
  padLen?: number
}

const TOWN_LEAD = [
  76, 0, 79, 76, 72, 0, 76, 79, // C
  79, 0, 83, 79, 74, 0, 79, 83, // G
  76, 0, 81, 76, 72, 0, 76, 81, // Am
  77, 0, 81, 77, 74, 0, 79, 0, // F -> G
]
const TOWN_BASS = [
  48, 0, 55, 0, 48, 0, 55, 0,
  43, 0, 50, 0, 43, 0, 50, 0,
  45, 0, 52, 0, 45, 0, 52, 0,
  41, 0, 48, 0, 43, 0, 50, 0,
]

const CALM_CHORDS: readonly (readonly number[])[] = [
  [48, 55, 59, 64], // Cmaj7
  [45, 52, 60, 64], // Am
  [41, 53, 57, 64], // Fmaj
  [43, 50, 59, 62], // G6
]
const CALM_PAD: (readonly number[] | undefined)[] = Array.from({ length: 16 }, (_, i) =>
  i % 4 === 0 ? CALM_CHORDS[i / 4] : undefined,
)
const CALM_LEAD = [0, 0, 79, 0, 0, 0, 0, 76, 0, 0, 77, 0, 0, 0, 74, 0]

const ARCADE_LEAD = [
  69, 0, 0, 69, 72, 0, 76, 0, 74, 0, 0, 72, 69, 0, 67, 0,
  69, 0, 0, 69, 72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0,
]
const ARCADE_BASS = [
  45, 0, 45, 0, 45, 0, 45, 0, 41, 0, 41, 0, 41, 0, 41, 0,
  43, 0, 43, 0, 43, 0, 43, 0, 40, 0, 40, 0, 40, 0, 40, 0,
]

const TRACKS = {
  /** Chapter 2: tense arcade select-screen loop, ~128 bpm, quiet. */
  arcade: {
    step: 60 / 128 / 2,
    length: 32,
    lead: ARCADE_LEAD,
    leadWave: 'square',
    leadVol: 0.04,
    bass: ARCADE_BASS,
    tick: true,
  },
  town: {
    step: 60 / 100 / 2,
    length: 32,
    lead: TOWN_LEAD,
    leadWave: 'square',
    leadVol: 0.07,
    bass: TOWN_BASS,
    tick: true,
  },
  calm: {
    step: 1,
    length: 16,
    lead: CALM_LEAD,
    leadWave: 'sine',
    leadVol: 0.05,
    pad: CALM_PAD,
    padLen: 4,
  },
} satisfies Record<string, Track>

export type TrackId = keyof typeof TRACKS

interface Player {
  track: Track
  gain: GainNode
  timer: number
  next: number
  index: number
  stopped: boolean
}

let current: Player | null = null
const LOOKAHEAD = 0.5

function schedule(e: Engine, p: Player): void {
  const now = e.ctx.currentTime
  if (p.next < now) p.next = now + 0.03
  const tr = p.track
  while (p.next < now + LOOKAHEAD) {
    const i = p.index
    const t = p.next
    const l = tr.lead[i]
    if (l) tone(e, midiToHz(l), t, tr.step * 0.85, tr.leadWave, tr.leadVol, p.gain, 0.01, 0.08)
    const b = tr.bass?.[i]
    if (b) tone(e, midiToHz(b), t, tr.step * 1.6, 'triangle', 0.16, p.gain, 0.01, 0.1)
    if (tr.tick && i % 2 === 1) noiseHit(e, t, 0.03, 0.025, 'highpass', 6000, 0.7, p.gain)
    const chord = tr.pad?.[i]
    if (chord) {
      const len = (tr.padLen ?? 4) * tr.step
      for (let k = 0; k < chord.length; k++) tone(e, midiToHz(chord[k]), t, len, 'sine', 0.05, p.gain, 1.1, 1.4)
    }
    p.index = (i + 1) % tr.length
    p.next += tr.step
  }
}

function fadeOutAndDrop(e: Engine, p: Player, fade: number): void {
  p.stopped = true
  window.clearInterval(p.timer)
  try {
    const t = e.ctx.currentTime
    p.gain.gain.cancelScheduledValues(t)
    p.gain.gain.setValueAtTime(p.gain.gain.value, t)
    p.gain.gain.linearRampToValueAtTime(0, t + Math.max(0.01, fade))
  } catch {
    /* ignore */
  }
  // Already-scheduled notes are tiny; disconnect once the fade (plus pad tails) is over.
  window.setTimeout(
    () => {
      try {
        p.gain.disconnect()
      } catch {
        /* ignore */
      }
    },
    (Math.max(0.01, fade) + 1.8) * 1000,
  )
}

export const music = {
  /** Start (or crossfade to) a track. No-op if locked/muted/unavailable. */
  play(id: TrackId, fade = 0.4): void {
    music.crossfade(id, fade)
  },
  crossfade(id: TrackId, fade = 1.2): void {
    const e = engine
    if (!e || e.ctx.state === 'closed') return
    try {
      const track: Track = TRACKS[id]
      if (current && !current.stopped && current.track === track) return
      const old = current
      if (old) fadeOutAndDrop(e, old, fade)
      const gain = e.ctx.createGain()
      const t = e.ctx.currentTime
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(1, t + Math.max(0.01, fade))
      gain.connect(e.musicBus)
      const p: Player = { track, gain, timer: 0, next: t + 0.05, index: 0, stopped: false }
      p.timer = window.setInterval(() => {
        // While muted keep the clock moving but skip scheduling work.
        if (muted) {
          p.next = e.ctx.currentTime + 0.05
          return
        }
        try {
          schedule(e, p)
        } catch {
          /* never throw from a timer */
        }
      }, 60)
      current = p
      if (!muted) schedule(e, p)
    } catch {
      /* never throw */
    }
  },
  stop(fade = 0.4): void {
    const e = engine
    const p = current
    current = null
    if (!e || !p) return
    fadeOutAndDrop(e, p, fade)
  },
  /** True if any track plays, or (with an id) if that specific track plays. */
  isPlaying: (id?: TrackId): boolean =>
    current !== null && !current.stopped && (id === undefined || current.track === TRACKS[id]),
  /** Stop only if `id` is the current track (so a scene never kills its successor's music). */
  stopIf(id: TrackId, fade = 0.4): void {
    if (music.isPlaying(id)) music.stop(fade)
  },
}
