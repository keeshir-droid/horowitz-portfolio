/**
 * Web Audio engine: procedural voices plus a few recorded files (public/audio, credits in CREDITS.md). Rules:
 *  - nothing is created until `audio.unlock()` is called from a user gesture (click/keypress);
 *  - every public call is a safe no-op when audio is unavailable, locked or muted;
 *  - mute is global and persisted (localStorage, try/catch).
 */

const MUTE_KEY = 'rn-portfolio-muted'

type Wave = 'square' | 'triangle' | 'sine' | 'sawtooth'

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

/** What a voice needs. A live engine is one; so is an OfflineAudioContext preview render (see `renderPreview`). */
interface Synth {
  ctx: BaseAudioContext
  noise: AudioBuffer
}

interface Engine extends Synth {
  ctx: AudioContext
  master: GainNode
  sfxBus: GainNode
  musicBus: GainNode
}

/** 1s of white noise, shared by every noise voice. */
function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
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
    const noise = makeNoise(ctx)
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
  e: Synth,
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
  e: Synth,
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

// ───────────────────────── instrument voices (diary score + paper sfx) ─────────────────────────

/** Percussive tone: near-instant attack, exponential decay to silence. */
function decayTone(s: Synth, freq: number, start: number, decay: number, wave: Wave, vol: number, dest: AudioNode, attack = 0.003): void {
  const o = s.ctx.createOscillator()
  const g = s.ctx.createGain()
  o.type = wave
  o.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(vol, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)
  o.connect(g).connect(dest)
  o.start(start)
  o.stop(start + attack + decay + 0.02)
  o.onended = () => {
    o.disconnect()
    g.disconnect()
  }
}

/** Noise burst with a soft (linear) attack instead of noiseHit's instant one. */
function noiseSwell(s: Synth, start: number, attack: number, decay: number, vol: number, type: BiquadFilterType, freq: number, q: number, dest: AudioNode): void {
  const src = s.ctx.createBufferSource()
  src.buffer = s.noise
  const f = s.ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = s.ctx.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(vol, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)
  src.connect(f).connect(g).connect(dest)
  src.start(start, Math.random() * 0.5, attack + decay + 0.02)
  src.onended = () => {
    src.disconnect()
    f.disconnect()
    g.disconnect()
  }
}

/** Plucked string (pizzicato / upright bass): sawtooth through a low-pass that closes as the note dies, plus a finger click. */
function pluck(s: Synth, freq: number, start: number, decay: number, vol: number, bright: number, dest: AudioNode): void {
  const c = s.ctx
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(freq, start)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.9
  lp.frequency.setValueAtTime(Math.min(freq * bright, 12000), start)
  lp.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.25, 160), start + decay * 0.55)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, start + decay)
  o.connect(lp).connect(g).connect(dest)
  o.start(start)
  o.stop(start + decay + 0.02)
  o.onended = () => {
    o.disconnect()
    lp.disconnect()
    g.disconnect()
  }
  noiseHit(s, start, 0.014, vol * 0.3, 'bandpass', Math.min(freq * 3, 5000), 1.2, dest)
}

/** Glockenspiel: sine + the bar's inharmonic partials (2.76x, 5.40x), upper ones dying fast, plus a soft mallet tick. */
function glock(s: Synth, freq: number, start: number, vol: number, dest: AudioNode): void {
  decayTone(s, freq, start, 1.1, 'sine', vol, dest, 0.0015)
  decayTone(s, freq * 2.756, start, 0.28, 'sine', vol * 0.3, dest, 0.0015)
  if (freq * 5.404 < 14000) decayTone(s, freq * 5.404, start, 0.09, 'sine', vol * 0.12, dest, 0.0015)
  noiseHit(s, start, 0.006, vol * 0.35, 'highpass', 5000, 0.7, dest)
}

/** Whistle: pure sine that scoops up into pitch, vibrato fading in, a breathy chiff on the attack. */
function whistle(s: Synth, freq: number, start: number, dur: number, vol: number, dest: AudioNode): void {
  const c = s.ctx
  const end = start + Math.max(0.08, dur)
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq * 0.972, start)
  o.frequency.exponentialRampToValueAtTime(freq, start + 0.06)
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 5.4
  const depth = c.createGain()
  depth.gain.setValueAtTime(0, start)
  depth.gain.linearRampToValueAtTime(freq * 0.007, start + Math.min(0.4, dur))
  lfo.connect(depth).connect(o.frequency)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.045)
  g.gain.setValueAtTime(vol, Math.max(start + 0.045, end - 0.06))
  g.gain.exponentialRampToValueAtTime(0.0001, end + 0.06)
  o.connect(g).connect(dest)
  o.start(start)
  lfo.start(start)
  o.stop(end + 0.08)
  lfo.stop(end + 0.08)
  o.onended = () => {
    o.disconnect()
    lfo.disconnect()
    depth.disconnect()
    g.disconnect()
  }
  noiseSwell(s, start, 0.01, 0.06, vol * 0.18, 'bandpass', Math.min(freq * 2, 8000), 2, dest)
}

/** Brushed shaker: high band of noise with a soft attack. */
function shaker(s: Synth, start: number, vol: number, dest: AudioNode): void {
  noiseSwell(s, start, 0.012, 0.07, vol, 'bandpass', 7200, 0.9, dest)
}

/** Finger snap: sharp mid-band crack + a tiny high tick. */
function snap(s: Synth, start: number, vol: number, dest: AudioNode): void {
  noiseHit(s, start, 0.05, vol, 'bandpass', 2400, 2.2, dest)
  noiseHit(s, start, 0.012, vol * 0.5, 'highpass', 6000, 0.7, dest)
}

/** One-shot that sweeps a sine down (book body / page landing thump). */
function thump(s: Synth, start: number, from: number, to: number, decay: number, vol: number, dest: AudioNode): void {
  const o = s.ctx.createOscillator()
  const g = s.ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(from, start)
  o.frequency.exponentialRampToValueAtTime(to, start + decay * 0.8)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, start + decay)
  o.connect(g).connect(dest)
  o.start(start)
  o.stop(start + decay + 0.02)
  o.onended = () => {
    o.disconnect()
    g.disconnect()
  }
}

/** Polyphony / rate cap for rapid-fire one-shots (flipbook riffle). Times are AudioContext seconds. */
interface VoiceCap {
  ends: number[]
  last: number
}

/** Returns how many voices are still sounding (>= 0), or -1 if this hit must be dropped. */
function admit(cap: VoiceCap, t: number, max: number, minGap: number): number {
  if (t < cap.last) {
    // a new AudioContext (clock restarted): forget the old one
    cap.ends = []
    cap.last = -1
  }
  cap.ends = cap.ends.filter((end) => end > t)
  if (cap.ends.length >= max || (cap.last >= 0 && t - cap.last < minGap)) return -1
  cap.last = t
  return cap.ends.length
}

const PAPER_MAX = 3
const PAPER_GAP = 0.045

/** Paper page flip: band-passed noise sweeping up then settling, with an uneven "crinkle" envelope, and a tiny landing thump. */
function paperFlip(s: Synth, t: number, soft: boolean, dest: AudioNode, cap: VoiceCap): void {
  const active = admit(cap, t, PAPER_MAX, PAPER_GAP)
  if (active < 0) return
  const c = s.ctx
  const dur = soft ? 0.16 : 0.3
  const peak = (soft ? 0.22 : 0.36) / (1 + 0.4 * active) // overlapping riffle turns duck each other: no pile-up
  const src = c.createBufferSource()
  src.buffer = s.noise
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 650
  hp.Q.value = 0.5
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.85
  bp.frequency.setValueAtTime(soft ? 1700 : 1000, t)
  bp.frequency.exponentialRampToValueAtTime(soft ? 5200 : 4300, t + dur * 0.5)
  bp.frequency.exponentialRampToValueAtTime(soft ? 3000 : 2100, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  const grains = soft ? 6 : 10
  for (let k = 1; k <= grains; k++) {
    const u = k / (grains + 1)
    const shape = Math.sin(Math.PI * Math.pow(u, 0.65)) // quick rise, longer settle
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak * shape * (0.5 + Math.random() * 0.5)), t + u * dur)
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(hp).connect(bp).connect(g).connect(dest)
  src.start(t, Math.random() * 0.5, dur + 0.02)
  src.onended = () => {
    src.disconnect()
    hp.disconnect()
    bp.disconnect()
    g.disconnect()
  }
  // the page settling: small low thump + a puff of air
  const land = t + dur * 0.8
  thump(s, land, 120, 62, 0.08, (soft ? 0.05 : 0.11) / (1 + 0.4 * active), dest)
  noiseHit(s, land, 0.07, (soft ? 0.04 : 0.09) / (1 + 0.4 * active), 'lowpass', 700, 0.7, dest)
  cap.ends.push(t + dur + 0.08)
}

/** A hardback landing on a wooden desk: air "fwump", papery cover slap, low body, a short wooden knock. `soft` = closing it. */
function bookLand(s: Synth, t: number, soft: boolean, dest: AudioNode): void {
  const k = soft ? 0.6 : 1
  noiseSwell(s, t, 0.004, soft ? 0.12 : 0.17, 0.42 * k, 'lowpass', 900, 0.7, dest)
  noiseHit(s, t, soft ? 0.04 : 0.055, 0.2 * k, 'bandpass', 1700, 0.8, dest)
  thump(s, t, 105, 56, soft ? 0.16 : 0.22, 0.5 * k, dest)
  decayTone(s, 187, t, 0.09, 'triangle', 0.1 * k, dest)
  decayTone(s, 433, t, 0.05, 'sine', 0.045 * k, dest)
}

/** Pencil tick: tiny contact click, short down-stroke, longer up-stroke of grainy high noise. */
function pencilStroke(s: Synth, t: number, dur: number, vol: number, freq: number, dest: AudioNode): void {
  const c = s.ctx
  const src = c.createBufferSource()
  src.buffer = s.noise
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2400
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.4
  bp.frequency.setValueAtTime(freq, t)
  bp.frequency.linearRampToValueAtTime(freq * 1.15, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  const grains = 6
  for (let i = 1; i <= grains; i++) g.gain.linearRampToValueAtTime(vol * (0.35 + Math.random() * 0.65), t + (i / (grains + 1)) * dur)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(hp).connect(bp).connect(g).connect(dest)
  src.start(t, Math.random() * 0.5, dur + 0.02)
  src.onended = () => {
    src.disconnect()
    hp.disconnect()
    bp.disconnect()
    g.disconnect()
  }
}

function pencil(s: Synth, t: number, dest: AudioNode): void {
  noiseHit(s, t, 0.005, 0.07, 'highpass', 6000, 0.7, dest)
  pencilStroke(s, t, 0.035, 0.1, 4200, dest)
  pencilStroke(s, t + 0.055, 0.085, 0.12, 5000, dest)
}

const paperCap: VoiceCap = { ends: [], last: -1 }

// ───────────────────────── recorded samples (public/audio, credits in public/audio/CREDITS.md) ─────────────────────────
// Lazy: nothing is fetched until audio is unlocked AND a scene asks for it (audio.preload / music.play / the first
// sfx call). Decoded buffers are cached for the whole visit. A file that fails to fetch/decode is marked failed and
// its sfx/track falls back to the procedural voice (or to silence: the Ch3 diary music has no fallback), so audio can
// never break the page.

/** Every recorded file, relative to `<base>/audio/`. */
const SAMPLE_FILES = {
  'fight-punch-1': 'fight-punch-1.mp3',
  'fight-punch-2': 'fight-punch-2.mp3',
  'fight-punch-3': 'fight-punch-3.mp3',
  'fight-kick': 'fight-kick.mp3',
  'fight-block': 'fight-block.mp3',
  'fight-ko': 'fight-ko.mp3',
  'fight-swoosh': 'fight-swoosh.mp3',
  'fight-swoosh-big': 'fight-swoosh-big.mp3',
  'crowd-ooh': 'crowd-ooh.mp3',
  'crowd-cheer': 'crowd-cheer.mp3',
  'crowd-applause': 'crowd-applause.mp3',
  'crowd-laugh': 'crowd-laugh.mp3',
  'paper-page-turn-1': 'paper-page-turn-1.mp3',
  'paper-page-turn-2': 'paper-page-turn-2.mp3',
  'paper-flick-1': 'paper-flick-1.mp3',
  'paper-flick-2': 'paper-flick-2.mp3',
  'paper-flick-3': 'paper-flick-3.mp3',
  'paper-cover-open': 'paper-cover-open.mp3',
  'paper-book-drop': 'paper-book-drop.mp3',
  'paper-book-close': 'paper-book-close.mp3',
  'paper-pencil-tick-1': 'paper-pencil-tick-1.mp3',
  'paper-pencil-tick-2': 'paper-pencil-tick-2.mp3',
  // Ch3 diary music. The auditioned runners-up were removed on 2026-10-15 (Risheek kept the main picks); they are in git
  // history (commit dd6a9bb) if a swap is ever wanted.
  'music-diary': 'music-diary.mp3',
  // Ch4 (2000s family PC) sound cues (`sfx.desk`): real recordings, see CREDITS.md
  'desk-crt-on': 'desk-crt-on.mp3',
  'desk-boot': 'desk-boot.mp3',
  'desk-mail': 'desk-mail.mp3',
  'desk-window': 'desk-window.mp3',
  'desk-click-1': 'desk-click-1.mp3',
  'desk-click-2': 'desk-click-2.mp3',
  'desk-error': 'desk-error.mp3',
  'desk-crt-off': 'desk-crt-off.mp3',
  'desk-countdown': 'desk-countdown.mp3',
  'desk-coin': 'desk-coin.mp3',
  'desk-install-done': 'desk-install-done.mp3',
  'desk-sale': 'desk-sale.mp3',
  'desk-cash-big': 'desk-cash-big.mp3',
  'desk-message': 'desk-message.mp3',
  'desk-nudge': 'desk-nudge.mp3',
  'desk-typing-1': 'desk-typing-1.mp3',
  'desk-typing-2': 'desk-typing-2.mp3',
  'desk-vote-1': 'desk-vote-1.mp3',
  'desk-vote-2': 'desk-vote-2.mp3',
  'desk-vote-3': 'desk-vote-3.mp3',
  'desk-ad-done': 'desk-ad-done.mp3',
  'desk-badge': 'desk-badge.mp3',
  'desk-minimise': 'desk-minimise.mp3',
  // Ch5 (San Francisco) sound cues (`sfx.city`; 'chord' is procedural)
  'city-whoosh': 'city-whoosh.mp3',
  'city-card': 'city-card.mp3',
  'city-save': 'city-save.mp3',
  'city-saved': 'city-saved.mp3',
  // Ch4 / Ch5 music (runners-up removed 2026-10-15, see above).
  'music-desk': 'music-desk.mp3',
  'music-city': 'music-city.mp3',
} as const
export type SampleId = keyof typeof SAMPLE_FILES
export const SAMPLE_IDS = Object.keys(SAMPLE_FILES) as SampleId[]

/**
 * Playback level of each file (all sfx files are peak-normalised to about -3 dBFS, so this is the mix balance).
 * Shared by live playback and the offline previews.
 */
const SAMPLE_GAIN: Record<SampleId, number> = {
  'fight-punch-1': 0.7,
  'fight-punch-2': 0.7,
  'fight-punch-3': 0.7,
  'fight-kick': 0.8,
  'fight-block': 0.55,
  'fight-ko': 1,
  'fight-swoosh': 0.38,
  'fight-swoosh-big': 0.45,
  'crowd-ooh': 0.35,
  'crowd-cheer': 0.5,
  'crowd-applause': 0.5,
  'crowd-laugh': 0.4,
  'paper-page-turn-1': 0.85,
  'paper-page-turn-2': 0.8,
  'paper-flick-1': 0.45,
  'paper-flick-2': 0.45,
  'paper-flick-3': 0.4,
  'paper-cover-open': 0.55,
  'paper-book-drop': 0.85,
  'paper-book-close': 0.7,
  'paper-pencil-tick-1': 0.4,
  'paper-pencil-tick-2': 0.4,
  'music-diary': 0.9,
  // Ch4/Ch5 sfx (peak -3 dBFS files; balanced by ear-free loudness estimates against the Ch2/Ch3 sfx)
  'desk-crt-on': 0.9,
  'desk-boot': 0.5,
  'desk-mail': 0.34,
  'desk-window': 0.32,
  'desk-click-1': 0.55,
  'desk-click-2': 0.47,
  'desk-error': 0.5,
  'desk-crt-off': 0.66,
  'desk-countdown': 0.16,
  'desk-coin': 0.9,
  'desk-install-done': 0.25,
  'desk-sale': 0.25,
  'desk-cash-big': 0.4,
  'desk-message': 0.38,
  'desk-nudge': 0.33,
  'desk-typing-1': 0.4,
  'desk-typing-2': 0.4,
  'desk-vote-1': 0.41,
  'desk-vote-2': 0.6,
  'desk-vote-3': 0.46,
  'desk-ad-done': 0.55,
  'desk-badge': 0.85,
  'desk-minimise': 0.27,
  'city-whoosh': 0.22,
  'city-card': 0.8,
  'city-save': 0.42,
  'city-saved': 0.2,
  // music files are loudness-matched (-18.5 LUFS), so they share the diary's level
  'music-desk': 0.9,
  'music-city': 0.9,
}

/** Recorded music files (played on the music bus, not the sfx bus). */
const isMusicSample = (id: SampleId): boolean => id.startsWith('music-')

/** What each scene needs; scenes call `audio.preload(SAMPLE_SETS.chN)` while active so the first hit is not late. */
export const SAMPLE_SETS = {
  ch2: [
    'fight-punch-1',
    'fight-punch-2',
    'fight-punch-3',
    'fight-kick',
    'fight-block',
    'fight-ko',
    'fight-swoosh',
    'fight-swoosh-big',
    'crowd-ooh',
    'crowd-cheer',
    'crowd-applause',
  ],
  ch3: [
    'music-diary',
    'paper-book-drop',
    'paper-cover-open',
    'paper-page-turn-1',
    'paper-page-turn-2',
    'paper-flick-1',
    'paper-flick-2',
    'paper-flick-3',
    'paper-pencil-tick-1',
    'paper-pencil-tick-2',
    'paper-book-close',
    'crowd-applause',
    'crowd-laugh',
  ],
  ch4: [
    'music-desk',
    'desk-crt-on',
    'desk-boot',
    'desk-mail',
    'desk-window',
    'desk-click-1',
    'desk-click-2',
    'desk-error',
    'desk-crt-off',
    'desk-countdown',
    'desk-coin',
    'desk-install-done',
    'desk-sale',
    'desk-cash-big',
    'desk-message',
    'desk-nudge',
    'desk-typing-1',
    'desk-typing-2',
    'desk-vote-1',
    'desk-vote-2',
    'desk-vote-3',
    'desk-ad-done',
    'desk-badge',
    'desk-minimise',
    'crowd-applause',
  ],
  ch5: ['music-city', 'city-whoosh', 'city-card', 'city-save', 'city-saved'],
} as const satisfies Record<string, readonly SampleId[]>

const sampleBytes = new Map<SampleId, Promise<ArrayBuffer | null>>()
const sampleBufs = new Map<SampleId, AudioBuffer>()
const sampleDecoding = new Map<SampleId, Promise<AudioBuffer | null>>()
const sampleFailed = new Set<SampleId>()
/** Asked for by a scene before audio was unlocked: loaded on unlock. */
const sampleWanted = new Set<SampleId>()

const sampleUrl = (id: SampleId): string => `${import.meta.env.BASE_URL}audio/${SAMPLE_FILES[id]}`

/** Fetches a file once (never rejects; null = failed). */
function fetchSample(id: SampleId): Promise<ArrayBuffer | null> {
  let p = sampleBytes.get(id)
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(sampleUrl(id))
        if (!r.ok) return null
        return await r.arrayBuffer()
      } catch {
        return null
      }
    })()
    sampleBytes.set(id, p)
  }
  return p
}

/** Decodes a file with any context (the live one or an offline render). Never rejects; null = failed. */
async function decodeSample(ctx: BaseAudioContext, id: SampleId): Promise<AudioBuffer | null> {
  const bytes = await fetchSample(id)
  if (!bytes) return null
  try {
    // decodeAudioData detaches its input: give it a copy so the cached bytes stay usable
    return await ctx.decodeAudioData(bytes.slice(0))
  } catch {
    return null
  }
}

/** Loads (fetch + decode, once) with the live context. Resolves null if audio is locked or the file failed. */
function loadSample(id: SampleId): Promise<AudioBuffer | null> {
  const ready = sampleBufs.get(id)
  if (ready) return Promise.resolve(ready)
  if (sampleFailed.has(id)) return Promise.resolve(null)
  const e = engine
  if (!e) {
    sampleWanted.add(id)
    return Promise.resolve(null)
  }
  let p = sampleDecoding.get(id)
  if (!p) {
    p = decodeSample(e.ctx, id).then((b) => {
      sampleDecoding.delete(id)
      if (b) sampleBufs.set(id, b)
      else if (e.ctx.state !== 'closed') sampleFailed.add(id) // a closed (disposed) context is not the file's fault
      return b
    })
    sampleDecoding.set(id, p)
  }
  return p
}

/** Starts a decoded buffer through a gain into `dest`. */
function startBuffer(ctx: BaseAudioContext, buf: AudioBuffer, vol: number, dest: AudioNode, when: number, rate = 1): void {
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const g = ctx.createGain()
  g.gain.value = vol
  src.connect(g).connect(dest)
  src.start(when)
  src.onended = () => {
    src.disconnect()
    g.disconnect()
  }
}

/** True if any of `ids` is decoded; starts loading the others. */
function anyReady(ids: readonly SampleId[]): boolean {
  let ok = false
  for (const id of ids) {
    if (sampleBufs.has(id)) ok = true
    else void loadSample(id)
  }
  return ok
}

const roundRobin = new Map<readonly SampleId[], number>()

/**
 * Plays one of `ids` now on the sfx bus (round-robin over the decoded ones, small random pitch jitter for variety).
 * Returns false if none is decoded yet: the caller then plays its procedural fallback (and loading has started).
 */
function playOne(e: Engine, ids: readonly SampleId[], vol = 1, jitter = 0): boolean {
  if (!anyReady(ids)) return false
  const n = roundRobin.get(ids) ?? 0
  for (let k = 0; k < ids.length; k++) {
    const id = ids[(n + k) % ids.length]
    const buf = sampleBufs.get(id)
    if (!buf) continue
    roundRobin.set(ids, n + k + 1)
    startBuffer(e.ctx, buf, SAMPLE_GAIN[id] * vol, e.sfxBus, e.ctx.currentTime, 1 + (Math.random() * 2 - 1) * jitter)
    return true
  }
  return false
}

/**
 * Recorded crowd beds (cheer / applause) do not stack: while one still has more than CROWD_OVERLAP seconds to run, a
 * new request is absorbed by it (e.g. a scene's applause cue landing on top of an unlock card's applause).
 */
let crowdEnd = -1
const CROWD_OVERLAP = 1.5
function playCrowd(e: Engine, ids: readonly SampleId[], vol = 1): boolean {
  if (!anyReady(ids)) return false
  const t = e.ctx.currentTime
  if (crowdEnd > t + CROWD_OVERLAP && crowdEnd - t < 30) return true
  if (!playOne(e, ids, vol)) return false
  let len = 0
  for (const id of ids) len = Math.max(len, sampleBufs.get(id)?.duration ?? 0)
  crowdEnd = t + len
  return true
}

const PUNCHES: readonly SampleId[] = ['fight-punch-1', 'fight-punch-2', 'fight-punch-3']
const KICKS: readonly SampleId[] = ['fight-kick']
const BLOCKS: readonly SampleId[] = ['fight-block']
const KOS: readonly SampleId[] = ['fight-ko']
const SWOOSH: readonly SampleId[] = ['fight-swoosh']
const SWOOSH_BIG: readonly SampleId[] = ['fight-swoosh-big']
const OOH: readonly SampleId[] = ['crowd-ooh']
const CHEER: readonly SampleId[] = ['crowd-cheer']
const APPLAUSE: readonly SampleId[] = ['crowd-applause']
const LAUGH: readonly SampleId[] = ['crowd-laugh']
const TURNS: readonly SampleId[] = ['paper-page-turn-1', 'paper-page-turn-2']
const FLICKS: readonly SampleId[] = ['paper-flick-1', 'paper-flick-2', 'paper-flick-3']
const COVER: readonly SampleId[] = ['paper-cover-open']
const DROP: readonly SampleId[] = ['paper-book-drop']
const BOOK_CLOSE: readonly SampleId[] = ['paper-book-close']
const PENCILS: readonly SampleId[] = ['paper-pencil-tick-1', 'paper-pencil-tick-2']

// ── Chapter 4 (family PC) / Chapter 5 (San Francisco) cues ──

/** How one recorded cue plays: its files (round-robin), pitch jitter, and a voice cap so rapid calls never pile up. */
interface CueSpec {
  ids: readonly SampleId[]
  jitter?: number
  /** At most this many overlapping voices of the cue; calls closer than `gap` seconds are dropped. */
  max: number
  gap: number
}

const DESK_CUES: Record<Exclude<DeskCue, 'applause'>, CueSpec> = {
  crtOn: { ids: ['desk-crt-on'], max: 1, gap: 0.5 },
  boot: { ids: ['desk-boot'], max: 1, gap: 0.5 },
  mail: { ids: ['desk-mail'], max: 2, gap: 0.12 },
  windowOpen: { ids: ['desk-window'], jitter: 0.06, max: 3, gap: 0.05 },
  click: { ids: ['desk-click-1', 'desk-click-2'], jitter: 0.04, max: 3, gap: 0.04 },
  error: { ids: ['desk-error'], max: 1, gap: 0.4 },
  screenOff: { ids: ['desk-crt-off'], max: 1, gap: 0.5 },
  countdown: { ids: ['desk-countdown'], max: 2, gap: 0.2 },
  continueYes: { ids: ['desk-coin'], max: 1, gap: 0.3 },
  installDone: { ids: ['desk-install-done'], max: 2, gap: 0.2 },
  sale: { ids: ['desk-sale'], jitter: 0.03, max: 3, gap: 0.09 },
  cashBig: { ids: ['desk-cash-big'], max: 1, gap: 0.6 },
  message: { ids: ['desk-message'], jitter: 0.03, max: 2, gap: 0.1 },
  chatNudge: { ids: ['desk-nudge'], max: 1, gap: 0.3 },
  typing: { ids: ['desk-typing-1', 'desk-typing-2'], max: 2, gap: 0.25 },
  vote: { ids: ['desk-vote-1', 'desk-vote-2', 'desk-vote-3'], jitter: 0.05, max: 4, gap: 0.04 },
  adDone: { ids: ['desk-ad-done'], max: 2, gap: 0.2 },
  badge: { ids: ['desk-badge'], jitter: 0.04, max: 2, gap: 0.1 },
  minimise: { ids: ['desk-minimise'], jitter: 0.05, max: 3, gap: 0.05 },
}

const CITY_CUES: Record<Exclude<CityCue, 'chord'>, CueSpec> = {
  whoosh: { ids: ['city-whoosh'], jitter: 0.03, max: 2, gap: 0.15 },
  card: { ids: ['city-card'], max: 2, gap: 0.15 },
  save: { ids: ['city-save'], max: 2, gap: 0.08 },
  saved: { ids: ['city-saved'], max: 1, gap: 0.3 },
}

const cueCaps = new Map<string, VoiceCap>()

/**
 * Plays a recorded cue through its voice cap (overlapping voices duck each other), or its procedural fallback until
 * the file has loaded (or if it failed). `forceFallback` = always the procedural voice (audition page).
 */
function playCue(
  e: Engine,
  key: string,
  spec: CueSpec,
  fallback: (e: Engine, t: number, k: number) => void,
  vol: number,
  forceFallback: boolean,
): void {
  let cap = cueCaps.get(key)
  if (!cap) {
    cap = { ends: [], last: -1 }
    cueCaps.set(key, cap)
  }
  const t = e.ctx.currentTime
  const active = admit(cap, t, spec.max, spec.gap)
  if (active < 0) return
  const k = vol / (1 + 0.35 * active)
  if (!forceFallback && playOne(e, spec.ids, k, spec.jitter ?? 0)) {
    let len = 0
    for (const id of spec.ids) len = Math.max(len, sampleBufs.get(id)?.duration ?? 0)
    cap.ends.push(t + len * 0.8)
  } else {
    fallback(e, t, k)
    cap.ends.push(t + 0.4)
  }
}

// ── procedural fallbacks for the sample sfx ──

/** Low sine thump + noise burst. k scales the level and length (1 = the original K.O. impact). */
function impactVoice(e: Engine, k: number): void {
  const t = e.ctx.currentTime
  thump(e, t, 150, 42, 0.3 * Math.min(1.2, 0.6 + 0.4 * k), 0.7 * k, e.sfxBus)
  noiseHit(e, t, 0.12 + 0.06 * k, 0.45 * k, 'lowpass', 2200, 0.7, e.sfxBus)
}

/** Band-passed noise sweeping upward. `big` = longer, lower. */
function whooshVoice(e: Engine, big: boolean, vol = 1): void {
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
  g.gain.linearRampToValueAtTime((big ? 0.5 : 0.32) * vol, t + dur * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(e.sfxBus)
  src.start(t, Math.random() * 0.5, dur + 0.02)
  src.onended = () => {
    src.disconnect()
    f.disconnect()
    g.disconnect()
  }
}

/** Crowd-ish applause: many short band-passed noise bursts, swelling then fading. */
function applauseVoice(e: Engine, duration: number, vol = 1): void {
  const dur = Math.max(0.3, Math.min(8, duration))
  const t = e.ctx.currentTime
  const n = Math.floor(dur * 28)
  for (let i = 0; i < n; i++) {
    const u = Math.random()
    const at = t + u * dur
    const env = Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05)) // swell and fade
    noiseHit(e, at, 0.03 + Math.random() * 0.05, (0.22 * env + 0.02) * vol, 'bandpass', 1500 + Math.random() * 2500, 0.8, e.sfxBus)
  }
}

// ── procedural voices for the Chapter 4/5 cues (fallbacks while/if a file is missing; boot chime and SAVE chord always) ──

/** Struck bell / ding: a sine per partial [ratio to `f`, decay s, relative level], plus a tiny strike tick. */
function bellVoice(s: Synth, f: number, t: number, partials: readonly (readonly [number, number, number])[], vol: number, dest: AudioNode): void {
  for (const [r, decay, lv] of partials) if (f * r < 15000) decayTone(s, f * r, t, decay, 'sine', vol * lv, dest, 0.0015)
  noiseHit(s, t, 0.006, vol * 0.3, 'highpass', 5000, 0.7, dest)
}

/** Electric-piano-ish note (sine + quickly fading octave "tine"). */
function epNote(s: Synth, f: number, t: number, decay: number, vol: number, dest: AudioNode): void {
  decayTone(s, f, t, decay, 'sine', vol, dest, 0.004)
  decayTone(s, f * 2, t, Math.min(0.25, decay * 0.3), 'sine', vol * 0.35, dest, 0.002)
  decayTone(s, f * 4.02, t, 0.05, 'sine', vol * 0.12, dest, 0.001)
}

/** The family PC's own start-up chime (original): a soft rising A-major arpeggio over a low pad. Played with every boot. */
function bootChime(s: Synth, t: number, vol: number, dest: AudioNode): void {
  const notes = [64, 69, 73, 76] // E5 A5 C#6 E6
  notes.forEach((m, i) => epNote(s, midiToHz(m), t + i * 0.11, i === notes.length - 1 ? 1.6 : 0.7, 0.07 * vol, dest))
  tone(s, midiToHz(45), t, 1.1, 'sine', 0.06 * vol, dest, 0.25, 0.8) // A2
  tone(s, midiToHz(57), t + 0.1, 1.0, 'triangle', 0.025 * vol, dest, 0.3, 0.8) // A3
}

/**
 * The opening's Game Boy boot ding (B5 -> E6) returning warm at SAVE: the same two notes on a round triangle, then a
 * C maj9 bloom (C3 G3 B3 E4 D5, so both chime notes are chord tones, and C major matches the Ch5 music) with a slow
 * swell, slight detune and an airy noise rise.
 */
function warmChord(s: Synth, t: number, vol: number, dest: AudioNode): void {
  decayTone(s, 987.77, t, 0.4, 'triangle', 0.08 * vol, dest, 0.004)
  decayTone(s, 1318.51, t + 0.1, 2.8, 'triangle', 0.08 * vol, dest, 0.006)
  decayTone(s, 2637.02, t + 0.1, 0.9, 'sine', 0.015 * vol, dest, 0.004)
  for (const m of [48, 55, 59, 64, 74]) {
    for (const cents of [-5, 5]) {
      const hz = midiToHz(m) * Math.pow(2, cents / 1200)
      tone(s, hz, t + 0.12, 2.4, m < 60 ? 'sine' : 'triangle', (m < 52 ? 0.035 : 0.02) * vol, dest, 0.9, 2.2)
    }
  }
  noiseSwell(s, t + 0.1, 0.9, 1.4, 0.018 * vol, 'bandpass', 3200, 0.6, dest)
}

const DESK_FALLBACK: Record<Exclude<DeskCue, 'applause'>, (e: Engine, t: number, k: number) => void> = {
  crtOn: (e, t, k) => {
    noiseHit(e, t, 0.015, 0.25 * k, 'highpass', 3000, 0.7, e.sfxBus) // power switch
    thump(e, t + 0.34, 110, 48, 0.55, 0.55 * k, e.sfxBus) // degauss thunk
    noiseSwell(e, t + 0.34, 0.01, 0.5, 0.14 * k, 'lowpass', 420, 0.7, e.sfxBus)
  },
  boot: (e, t, k) => {
    // CD-ROM drive spinning up and seeking
    noiseSwell(e, t, 0.15, 0.6, 0.05 * k, 'bandpass', 900, 2, e.sfxBus)
    for (const at of [0.05, 0.14, 0.31, 0.9, 1.0]) noiseHit(e, t + at, 0.02, 0.09 * k, 'bandpass', 2200, 1.4, e.sfxBus)
  },
  mail: (e, t, k) =>
    bellVoice(e, 936, t, [[1, 1.2, 1], [2.66, 0.4, 0.3], [4.93, 0.18, 0.2]], 0.16 * k, e.sfxBus),
  windowOpen: (e, t, k) => thump(e, t, 260, 640, 0.07, 0.22 * k, e.sfxBus),
  click: (e, t, k) => {
    noiseHit(e, t, 0.012, 0.22 * k, 'highpass', 2500, 0.7, e.sfxBus)
    noiseHit(e, t + 0.075, 0.01, 0.14 * k, 'highpass', 3000, 0.7, e.sfxBus)
  },
  error: (e, t, k) =>
    bellVoice(e, 1628, t, [[1, 0.9, 0.6], [1.568, 0.7, 0.8], [2.22, 0.5, 1], [2.93, 0.35, 0.7]], 0.09 * k, e.sfxBus),
  screenOff: (e, t, k) => {
    noiseHit(e, t, 0.05, 0.22 * k, 'bandpass', 2500, 1, e.sfxBus)
    thump(e, t, 140, 35, 0.7, 0.35 * k, e.sfxBus)
    noiseSwell(e, t, 0.005, 0.9, 0.06 * k, 'lowpass', 300, 0.7, e.sfxBus)
  },
  countdown: (e, t, k) => tone(e, 1000, t, 0.12, 'sine', 0.16 * k, e.sfxBus, 0.003, 0.03),
  continueYes: (e, t, k) => {
    // a coin dropping into the slot: two metal clinks and a soft landing
    bellVoice(e, 4200, t, [[1, 0.12, 1], [1.45, 0.08, 0.6]], 0.06 * k, e.sfxBus)
    bellVoice(e, 3700, t + 0.12, [[1, 0.1, 1], [1.5, 0.07, 0.5]], 0.045 * k, e.sfxBus)
    thump(e, t + 0.22, 220, 120, 0.06, 0.12 * k, e.sfxBus)
  },
  installDone: (e, t, k) =>
    bellVoice(e, 2910, t, [[1, 1.0, 1], [2.37, 0.5, 0.5], [3.87, 0.2, 0.2]], 0.12 * k, e.sfxBus),
  sale: (e, t, k) => {
    noiseHit(e, t, 0.08, 0.16 * k, 'bandpass', 3000, 0.9, e.sfxBus) // "cha"
    bellVoice(e, 2600, t + 0.06, [[1, 0.6, 1], [2.3, 0.4, 0.5]], 0.09 * k, e.sfxBus) // "ching"
  },
  cashBig: (e, t, k) => {
    noiseHit(e, t, 0.1, 0.2 * k, 'bandpass', 3000, 0.9, e.sfxBus)
    bellVoice(e, 2600, t + 0.06, [[1, 1.0, 1], [2.3, 0.6, 0.5]], 0.11 * k, e.sfxBus)
    for (let i = 0; i < 7; i++) bellVoice(e, 3500 + Math.random() * 3500, t + 0.35 + Math.random() * 0.7, [[1, 0.08, 1]], 0.03 * k, e.sfxBus)
    thump(e, t + 1.0, 180, 70, 0.12, 0.2 * k, e.sfxBus) // drawer
  },
  message: (e, t, k) => bellVoice(e, 2773, t, [[1, 0.25, 1], [2.07, 0.08, 0.3]], 0.12 * k, e.sfxBus),
  chatNudge: (e, t, k) => {
    for (let i = 0; i < 3; i++) {
      tone(e, 140, t + i * 0.26, 0.2, 'sawtooth', 0.045 * k, e.sfxBus, 0.01, 0.03)
      noiseSwell(e, t + i * 0.26, 0.01, 0.2, 0.05 * k, 'bandpass', 1000, 1.5, e.sfxBus)
    }
  },
  typing: (e, t, k) => {
    let at = t
    for (let i = 0; i < 6; i++) {
      noiseHit(e, at, 0.018, (0.1 + Math.random() * 0.06) * k, 'bandpass', 1800 + Math.random() * 1500, 1.2, e.sfxBus)
      thump(e, at, 300, 160, 0.03, 0.05 * k, e.sfxBus)
      at += 0.1 + Math.random() * 0.08
    }
  },
  vote: (e, t, k) => {
    noiseHit(e, t, 0.02, 0.16 * k, 'bandpass', 2200, 1.2, e.sfxBus)
    decayTone(e, 1700, t, 0.04, 'triangle', 0.04 * k, e.sfxBus)
  },
  adDone: (e, t, k) => bellVoice(e, 3298, t, [[1, 0.9, 1], [2.33, 0.4, 0.5]], 0.1 * k, e.sfxBus),
  badge: (e, t, k) => {
    noiseHit(e, t, 0.03, 0.22 * k, 'bandpass', 3500, 1.2, e.sfxBus)
    decayTone(e, 1300, t, 0.06, 'triangle', 0.05 * k, e.sfxBus)
    noiseHit(e, t + 0.08, 0.02, 0.08 * k, 'bandpass', 4000, 1.2, e.sfxBus)
  },
  minimise: (e, _t, k) => whooshVoice(e, false, 0.55 * k),
}

const CITY_FALLBACK: Record<Exclude<CityCue, 'chord'>, (e: Engine, t: number, k: number) => void> = {
  whoosh: (e, _t, k) => whooshVoice(e, true, 0.6 * k),
  card: (e, t, k) => {
    noiseSwell(e, t, 0.03, 0.25, 0.1 * k, 'bandpass', 2500, 0.8, e.sfxBus)
    noiseHit(e, t + 0.3, 0.02, 0.14 * k, 'bandpass', 3000, 1, e.sfxBus)
  },
  save: (e, t, k) => {
    noiseHit(e, t, 0.012, 0.18 * k, 'bandpass', 1400, 1, e.sfxBus)
    noiseHit(e, t + 0.09, 0.012, 0.12 * k, 'bandpass', 1800, 1, e.sfxBus)
  },
  saved: (e, t, k) => bellVoice(e, 2007, t, [[1, 0.8, 1], [2.77, 0.3, 0.35]], 0.11 * k, e.sfxBus),
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
    // samples a scene asked for before the first gesture
    for (const id of sampleWanted) void loadSample(id)
    sampleWanted.clear()
    emit()
    return true
  },
  /**
   * Fetch + decode these recorded samples now (or right after the first gesture unlocks audio), so their first use
   * is not late. Idempotent and cheap to call on every activation. Never throws.
   */
  preload(ids: readonly SampleId[]): void {
    try {
      for (const id of ids) void loadSample(id)
    } catch {
      /* never throw */
    }
  },
  /** DEV/verification: load state of every sample ('ready' | 'loading' | 'failed' | 'idle'). */
  sampleStatus(): Record<SampleId, 'ready' | 'loading' | 'failed' | 'idle'> {
    const out = {} as Record<SampleId, 'ready' | 'loading' | 'failed' | 'idle'>
    for (const id of SAMPLE_IDS) {
      out[id] = sampleBufs.has(id) ? 'ready' : sampleFailed.has(id) ? 'failed' : sampleDecoding.has(id) ? 'loading' : 'idle'
    }
    return out
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

/** Chapter 4 (2000s family PC) sound cues. Scenes call `sfx.desk(cue)`; each maps to a recorded file (DESK_CUES). */
export type DeskCue =
  | 'crtOn' // CRT power-on: click + rising whine/degauss thunk
  | 'boot' // short start-up jingle-ish chime (original, not any OS's)
  | 'mail' // new-mail ding
  | 'windowOpen' // soft UI pop
  | 'click' // mouse click
  | 'error' // error-dialog ding (harsh)
  | 'screenOff' // CRT switching off (zap + hum dying)
  | 'countdown' // one arcade countdown beep (called once per number)
  | 'continueYes' // arcade "coin in / confirm"
  | 'installDone' // wizard finished chime
  | 'sale' // cash register "cha-ching" (called per sale, keep it short)
  | 'cashBig' // bigger success sting when the counter lands
  | 'message' // incoming message/notification
  | 'chatNudge' // IM nudge buzz/shake
  | 'typing' // a few keyboard keystrokes
  | 'vote' // tally blips while bars grow
  | 'adDone' // render-finished ding
  | 'badge' // lanyard/badge clack
  | 'applause' // short audience applause (pitch / class)
  | 'minimise' // windows minimising whoosh
/** Chapter 5 (San Francisco) sound cues. */
export type CityCue =
  | 'whoosh' // transition air whoosh
  | 'card' // a card sliding in (the Adobe card)
  | 'save' // handheld "save your progress?" button press
  | 'saved' // save confirmed: a small bell ting
  | 'chord' // the Game Boy start-up ding returning as a warm full chord (procedural)

/** Options for `sfx.desk` / `sfx.city`. */
export interface CueOptions {
  /** Level scale (default 1). */
  vol?: number
  /** Always play the procedural fallback instead of the recording (audition page). */
  fallback?: boolean
}

export const sfx = {
  /**
   * Chapter 4 cue: a real recording per cue (files `desk-*.mp3`, credits in public/audio/CREDITS.md), with a short
   * procedural fallback until the file has loaded or if it fails. Rapid calls are capped per cue (overlaps duck, very
   * close repeats are dropped). 'boot' always adds an original procedural start-up chime over the recorded CD-ROM drive.
   */
  desk(cue: DeskCue, opts?: CueOptions): void {
    const e = live()
    if (!e) return
    try {
      const vol = opts?.vol ?? 1
      const forceFallback = opts?.fallback === true
      if (cue === 'applause') {
        if (forceFallback || !playCrowd(e, APPLAUSE, 0.9 * vol)) applauseVoice(e, 2.5, 0.9 * vol)
        return
      }
      playCue(e, 'desk:' + cue, DESK_CUES[cue], DESK_FALLBACK[cue], vol, forceFallback)
      if (cue === 'boot') bootChime(e, e.ctx.currentTime + 0.15, vol, e.sfxBus)
    } catch {
      /* never throw */
    }
  },
  /** Chapter 5 cue (files `city-*.mp3`); 'chord' is procedural (the Game Boy ding, warm). Same fallback/cap rules. */
  city(cue: CityCue, opts?: CueOptions): void {
    const e = live()
    if (!e) return
    try {
      const vol = opts?.vol ?? 1
      if (cue === 'chord') {
        warmChord(e, e.ctx.currentTime, vol, e.sfxBus)
        return
      }
      playCue(e, 'city:' + cue, CITY_CUES[cue], CITY_FALLBACK[cue], vol, opts?.fallback === true)
    } catch {
      /* never throw */
    }
  },
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
  /**
   * Polite applause: a real ~5 s concert-hall recording (swells in, fades out). `duration` only shapes the
   * procedural fallback used until/unless the file loads. `vol` scales it (default 1).
   */
  applause(duration = 2, vol = 1): void {
    const e = live()
    if (!e) return
    try {
      if (!playCrowd(e, APPLAUSE, vol)) applauseVoice(e, duration, vol)
    } catch {
      /* never throw */
    }
  },
  /** Big ovation: teens shouting "yeah!" over a large hall's applause (~6 s). For "performed in front of 2,000 people". */
  crowdCheer(): void {
    const e = live()
    if (!e) return
    try {
      if (!playCrowd(e, CHEER)) applauseVoice(e, 3, 1.2)
    } catch {
      /* never throw */
    }
  },
  /** Short crowd "ohhh!" (a big hit lands). No fallback: silent until the file loads. */
  crowdOoh(): void {
    const e = live()
    if (!e) return
    try {
      playOne(e, OOH)
    } catch {
      /* never throw */
    }
  },
  /** Audience laugh (~2.5 s). No fallback: silent until the file loads. */
  laugh(): void {
    const e = live()
    if (!e) return
    try {
      playOne(e, LAUGH)
    } catch {
      /* never throw */
    }
  },
  /** Fight: a punch landing (3 recorded variants, round-robin, slight pitch jitter). */
  punch(): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, PUNCHES, 1, 0.04)) impactVoice(e, 0.55)
    } catch {
      /* never throw */
    }
  },
  /** Fight: a heavier kick landing. */
  kick(): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, KICKS, 1, 0.04)) impactVoice(e, 0.75)
    } catch {
      /* never throw */
    }
  },
  /** Fight: a blocked strike (dull forearm thud). */
  block(): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, BLOCKS, 1, 0.03)) {
        const t = e.ctx.currentTime
        thump(e, t, 190, 90, 0.12, 0.35, e.sfxBus)
        noiseHit(e, t, 0.05, 0.2, 'lowpass', 900, 0.7, e.sfxBus)
      }
    } catch {
      /* never throw */
    }
  },
  /** Fight: the finishing K.O. hit (heavy punch + body thud + short room tail). */
  ko(): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, KOS)) impactVoice(e, 1.15)
    } catch {
      /* never throw */
    }
  },
  /** Fight: a limb cutting the air (real stick/rope whooshes). `big` = longer, for a kick or the K.O. strike. */
  swoosh(big = false): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, big ? SWOOSH_BIG : SWOOSH, 1, 0.05)) whooshVoice(e, big)
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
  /** Punchy procedural hit: low sine thump + short noise burst (arcade UI slams). Fight hits use punch/kick/ko. */
  impact(): void {
    const e = live()
    if (!e) return
    try {
      impactVoice(e, 1)
    } catch {
      /* never throw */
    }
  },
  /** Short procedural air whoosh (arcade UI wipes): band-passed noise sweeping upward. `big` = longer, lower. */
  whoosh(big = false): void {
    const e = live()
    if (!e) return
    try {
      whooshVoice(e, big)
    } catch {
      /* never throw */
    }
  },
  /**
   * Paper page turn (diary), real recordings. `soft` = a quick flick (flipbook riffle). Safe to call rapid-fire: at
   * most 3 overlap, hits closer than 45 ms are dropped, and overlapping ones duck each other so they never pile up.
   * Falls back to the procedural flip until the files load.
   */
  pageTurn(soft = false): void {
    const e = live()
    if (!e) return
    try {
      const t = e.ctx.currentTime
      const ids = soft ? FLICKS : TURNS
      if (!anyReady(ids)) {
        paperFlip(e, t, soft, e.sfxBus, paperCap)
        return
      }
      const active = admit(paperCap, t, PAPER_MAX, PAPER_GAP)
      if (active < 0) return
      playOne(e, ids, 1 / (1 + 0.4 * active), 0.04)
      paperCap.ends.push(t + (soft ? 0.3 : 0.9))
    } catch {
      /* never throw */
    }
  },
  /** The diary cover swinging open (a slow, heavy page). */
  coverOpen(): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, COVER)) paperFlip(e, e.ctx.currentTime, false, e.sfxBus, paperCap)
    } catch {
      /* never throw */
    }
  },
  /** A hardback diary dropped on a desk. `soft` = closing it (a book clapping shut). */
  bookThud(soft = false): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, soft ? BOOK_CLOSE : DROP)) bookLand(e, e.ctx.currentTime, soft, e.sfxBus)
    } catch {
      /* never throw */
    }
  },
  /** Tiny pencil scratch (a checkbox tick), two recorded variants. */
  pencilTick(): void {
    const e = live()
    if (!e) return
    try {
      if (!playOne(e, PENCILS, 1, 0.05)) pencil(e, e.ctx.currentTime, e.sfxBus)
    } catch {
      /* never throw */
    }
  },
  /** Plays one recorded sample by id at its mix level (audition page / one-offs). No fallback. */
  sample(id: SampleId, vol = 1): void {
    const e = live()
    if (!e) return
    try {
      const buf = sampleBufs.get(id)
      if (buf) startBuffer(e.ctx, buf, SAMPLE_GAIN[id] * vol, isMusicSample(id) ? e.musicBus : e.sfxBus, e.ctx.currentTime)
      else void loadSample(id)
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

/** Keep the previous note sounding through this step (whistle parts). */
const HOLD = -1

type Inst = 'pizz' | 'bass' | 'glock' | 'whistle' | 'shaker' | 'snap'
/** MIDI note, a chord (several notes), 0 = rest, HOLD. For unpitched instruments (shaker, snap) the value is the hit velocity 0..1. */
type Step = number | readonly number[]

/** One instrument line of a multi-part score track. */
interface Part {
  inst: Inst
  /** Peak level of one note at full velocity. */
  vol: number
  /** One entry per sequencer step (length = track length). */
  notes: readonly Step[]
  /** Pizz/bass only: seconds to die away (default 0.32 pizz, 0.55 bass). */
  decay?: number
}

interface Track {
  /** Seconds per sequencer step. */
  step: number
  length: number
  /** MIDI note per step, 0 = rest. (Simple tracks: town / calm / arcade.) */
  lead?: readonly number[]
  leadWave?: Wave
  leadVol?: number
  /**
   * Score tracks: any number of instrument parts. Played in addition to the simple fields above (none of the older
   * tracks use it, so they schedule exactly as before).
   */
  parts?: readonly Part[]
  /** Parts only: delay of every odd (off-beat) step, as a fraction of a step (0.18 ~ a light 8th-note swing). */
  swing?: number
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

// ── "diary": Chapter 3 school-comedy score ──
// F major, 104 bpm, light 8th-note swing, 8 steps (8ths) per bar, 32 bars = 73.8 s loop. Form A A' B A'':
//  A  (1-8)   pizzicato tiptoe tune (chromatic sneak C-C#-D), oom-pah bass + pizz chord stabs on 2 & 4,
//             shaker on the off-beats, glockenspiel echoes in the gaps.
//  A' (9-16)  tune again, glock doubles it an octave up, finger snaps on 2 & 4, full shaker; new ending that
//             tips into B flat.
//  B  (17-24) whistle takes a longer, legato tune over Bb - B dim7 - F/C - D7 - Gm7 - C7 - F; walking bass,
//             off-beat pizz arpeggios; bar 24 is a "break": everything stops but a chromatic glock tumble.
//  A'' (25-32) the glock carries the tune, pizz returns for the last 4 bars with a sneaky chromatic run
//             (Ab-A-B) that lands back on bar 1, so the loop seam is a cadence, not a cut.
const _ = 0
const H = HOLD
type Bar = readonly Step[]
const R: Bar = [_, _, _, _, _, _, _, _]
const bars = (...rows: readonly Bar[]): Step[] => {
  const out: Step[] = []
  for (const r of rows) out.push(...r)
  return out
}
const rests = (n: number): Bar[] => Array.from({ length: n }, () => R)
const up = (b: Bar, n: number): Bar => b.map((v) => (typeof v === 'number' && v > 0 ? v + n : v))

// chord voicings (stabs)
const cF = [57, 60, 65]
const cF7 = [57, 63, 65]
const cGm7 = [58, 62, 65]
const cC7 = [58, 64, 67]
const cD7 = [57, 60, 66]
const stab = (a: readonly number[], b = a): Bar => [_, _, a, _, _, _, b, _]

// pizz tune (A)
const m1: Bar = [72, _, _, 73, 74, _, 72, _] // F    C . . C# D . C .
const m2: Bar = [69, _, 65, _, _, _, _, _] //  F    A . F .
const m3: Bar = [70, _, _, 71, 72, _, 70, _] // Gm7  Bb . . B C . Bb .
const m4: Bar = [67, _, 64, _, _, _, _, _] //  C7   G . E .
const m5: Bar = [72, _, _, 73, 74, _, 77, _] // F    C . . C# D . F .
const m6: Bar = [78, _, 74, _, 72, _, 69, _] // D7   F# D C A
const m7: Bar = [70, _, 69, _, 67, _, 64, _] // Gm7|C7  Bb A | G E
const m8: Bar = [65, _, _, _, _, _, _, _] //    F
// A' second half
const m14: Bar = [81, _, 78, _, 74, _, 72, _] // D7  A F# D C
const m15: Bar = [70, _, 74, _, 72, _, 76, _] // Gm7|C7  Bb D | C E
const m16: Bar = [77, _, _, _, 75, _, _, _] //   F|F7  F . . . Eb (tips into Bb)
// A'' ending: chromatic run back to bar 1
const m32: Bar = [65, _, _, _, _, 68, 69, 71] // F|C7  F . . . . Ab A B -> (C)

// glock echoes / fills
const g2: Bar = [_, _, _, _, 81, _, 77, _]
const g4: Bar = [_, _, _, _, 79, _, 76, _]
const g8: Bar = [_, _, 77, _, 81, _, 84, _]
const g24: Bar = [_, _, 84, 83, 82, 81, 80, 79] // the "tumble" in the break bar

// whistle tune (B)
const WHISTLE_B: Bar[] = [
  [74, H, H, 72, 74, 77, H, H], // Bb     D . . C D F . .
  [80, H, H, H, 77, H, 74, H], //  Bdim7  Ab . . . F . D .
  [72, H, H, H, H, H, 69, 74], //  F/C    C . . . . . A D
  [78, H, H, H, 81, H, H, _], //   D7     F# . . . A . .
  [79, H, H, 77, 74, H, 70, H], // Gm7    G . . F D . Bb .
  [76, H, H, H, 79, H, 82, H], //  C7     E . . . G . Bb .
  [81, H, H, H, H, H, _, _], //    F      A . . . . .
  R, //                            C7     (break)
]
// off-beat pizz arpeggios (B)
const ARP_B: Bar[] = [
  [_, 62, _, 65, _, 70, _, 65],
  [_, 62, _, 65, _, 68, _, 65],
  [_, 60, _, 65, _, 69, _, 65],
  [_, 62, _, 66, _, 72, _, 66],
  [_, 62, _, 65, _, 70, _, 65],
  [_, 64, _, 67, _, 70, _, 67],
  [_, 60, _, 65, _, 69, _, 72],
  R,
]

// bass: two-beat oom-pah with chromatic pick-ups in A, walking quarters in B
const BASS_A: Bar[] = [
  [41, _, _, _, 48, _, _, _],
  [41, _, _, _, 48, _, _, 42],
  [43, _, _, _, 50, _, _, _],
  [36, _, _, _, 43, _, _, 40],
  [41, _, _, _, 48, _, _, _],
  [38, _, _, _, 45, _, _, 42],
  [43, _, _, _, 36, _, _, 40],
  [41, _, _, _, 48, _, _, 40],
]
const BASS_A2_END: Bar = [41, _, _, _, 48, _, _, 45] // -> Bb
const BASS_A3_END: Bar = [41, _, _, _, 36, _, _, 40] // -> F (loop)
const BASS_B: Bar[] = [
  [46, _, 50, _, 53, _, 48, _],
  [47, _, 50, _, 53, _, 49, _],
  [48, _, 45, _, 48, _, 49, _],
  [50, _, 45, _, 42, _, 44, _],
  [43, _, 46, _, 50, _, 47, _],
  [48, _, 46, _, 43, _, 40, _],
  [41, _, 45, _, 48, _, 47, _],
  [48, _, _, _, _, _, _, 40], // break: one note, then the pick-up into A''
]

const STABS_A: Bar[] = [stab(cF), stab(cF), stab(cGm7), stab(cC7), stab(cF), stab(cD7), stab(cGm7, cC7), stab(cF)]

const SHK_OFF: Bar = [_, 0.5, _, 0.45, _, 0.5, _, 0.45]
const SHK_FULL: Bar = [0.25, 0.65, 0.2, 0.55, 0.25, 0.65, 0.2, 0.55]
const SNAPS: Bar = [_, _, 1, _, _, _, 0.85, _]
const rep = (b: Bar, n: number): Bar[] => Array.from({ length: n }, () => b)

const DIARY_PARTS: readonly Part[] = [
  // pizzicato tune: A, A', (rests in B), last 4 bars of A''
  { inst: 'pizz', vol: 0.2, notes: bars(m1, m2, m3, m4, m5, m6, m7, m8, m1, m2, m3, m4, m5, m14, m15, m16, ...rests(8), ...rests(4), m5, m6, m7, m32) },
  // chord stabs on 2 & 4 (A sections only)
  {
    inst: 'pizz',
    vol: 0.055,
    decay: 0.16,
    notes: bars(...STABS_A, ...STABS_A.slice(0, 7), stab(cF, cF7), ...rests(8), ...STABS_A.slice(0, 7), stab(cF, cC7)),
  },
  // off-beat pizz arpeggios under the whistle
  { inst: 'pizz', vol: 0.07, decay: 0.22, notes: bars(...rests(16), ...ARP_B, ...rests(8)) },
  // plucked bass
  { inst: 'bass', vol: 0.2, notes: bars(...BASS_A, ...BASS_A.slice(0, 7), BASS_A2_END, ...BASS_B, ...BASS_A.slice(0, 7), BASS_A3_END) },
  // glock: echoes in A, the break-bar tumble
  { inst: 'glock', vol: 0.085, notes: bars(R, g2, R, g4, R, R, R, g8, ...rests(8), ...rests(7), g24, ...rests(8)) },
  // glock doubling the tune an octave up (A' first half), then carrying it (A'' first half)
  { inst: 'glock', vol: 0.045, notes: bars(...rests(8), up(m1, 12), up(m2, 12), up(m3, 12), up(m4, 12), ...rests(4), ...rests(8), ...rests(8)) },
  { inst: 'glock', vol: 0.1, notes: bars(...rests(24), up(m1, 12), up(m2, 12), up(m3, 12), up(m4, 12), ...rests(4)) },
  // whistle (B)
  { inst: 'whistle', vol: 0.052, notes: bars(...rests(16), ...WHISTLE_B, ...rests(8)) },
  // brushed shaker
  { inst: 'shaker', vol: 0.06, notes: bars(...rep(SHK_OFF, 8), ...rep(SHK_FULL, 8), ...rep(SHK_FULL, 7), R, ...rep(SHK_OFF, 8)) },
  // finger snaps on 2 & 4 (A', B, end of A'')
  { inst: 'snap', vol: 0.1, notes: bars(...rests(8), ...rep(SNAPS, 8), ...rep(SNAPS, 7), R, ...rests(4), ...rep(SNAPS, 4)) },
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
  /**
   * Old Chapter 3 procedural school-comedy score (104 bpm swing, F major, 73.8 s loop, see DIARY_PARTS). Risheek
   * rejected it ("Nintendo/retro game music"): it is NOT played as a fallback any more (a failed 'diary' file means
   * silence). Kept only so /?audio-demo can still audition it.
   */
  diaryScore: {
    step: 60 / 104 / 2,
    length: 256,
    parts: DIARY_PARTS,
    swing: 0.18,
  },
} satisfies Record<string, Track>
type SynthTrackId = keyof typeof TRACKS

/** A recorded music file played as a loop (see SAMPLE_FILES). */
interface SampleTrack {
  sample: SampleId
  /** Region looped, seconds into the file (loopEnd 0 = end of the file). */
  loopStart: number
  loopEnd: number
  /** Each pass fades out over its last `xfade` s while the next fades in (a crossfaded loop seam). */
  xfade: number
  /** Procedural track played instead if the file cannot be fetched or decoded; null = stay silent. */
  fallback: SynthTrackId | null
}

/**
 * Crossfade of the diary music files. Each file is cut as source[s, s + L + DIARY_XFADE] where L is a whole number of
 * bars and s sits just before a beat: the scheduler overlaps each pass's last 15 ms (the music running on past the
 * loop point) with the next pass's first 15 ms (the music just before the loop start), so the loop period is exactly
 * L and the beat never stumbles. All the recorded music files (diary, desk, city and their runners-up) use this value,
 * so swapping files needs no other change.
 */
const DIARY_XFADE = 0.015

const SAMPLE_TRACKS = {
  /**
   * Chapter 3 (the school diary): "Uplifting Funny Whistle Folk" by Emmraan (Pixabay Content License, no credit
   * required: see public/audio/CREDITS.md). Strummed acoustic guitar, bass, light drums and handclaps, whistled melody,
   * 110 bpm. Looped over its 50 bars (109.1 s; the song's own last bar comes back round to its first). No fallback:
   * if the file fails, Chapter 3 is silent rather than playing the rejected synth score.
   */
  diary: { sample: 'music-diary', loopStart: 0, loopEnd: 0, xfade: DIARY_XFADE, fallback: null },
  /**
   * Chapter 4 (the family PC): "Energetic Funky Groove" by _Music_for_Creators_ (Pixabay Content License, no credit
   * required). Tight drums, funk bass, clean electric guitar, 100 bpm, sparse midrange so the sale pings sit on top.
   * 28-bar loop (67.2 s) from bar 7 of the original, including its breakdown. No fallback: silent if the file fails.
   */
  desk: { sample: 'music-desk', loopStart: 0, loopEnd: 0, xfade: DIARY_XFADE, fallback: null },
  /**
   * Chapter 5 (San Francisco): "Soft Hopeful Piano" by PaulYudin (Pixabay Content License, no credit required). Piano
   * ostinato with a low string/bass swell and light percussion, C major, ~105 bpm; 40-bar loop (91.1 s) from bar 5
   * (the build and the full section). C major matches the SAVE chord (`sfx.city('chord')`). No fallback.
   */
  city: { sample: 'music-city', loopStart: 0, loopEnd: 0, xfade: DIARY_XFADE, fallback: null },
} satisfies Record<string, SampleTrack>
type SampleTrackId = keyof typeof SAMPLE_TRACKS

export type TrackId = SynthTrackId | SampleTrackId
const isSampleTrack = (id: TrackId): id is SampleTrackId => id in SAMPLE_TRACKS

/** Plays step `i` of every score part at grid time `t` (swing, beat accents and a little human looseness applied here). */
function playParts(s: Synth, tr: Track, i: number, t: number, dest: AudioNode): void {
  const parts = tr.parts
  if (!parts) return
  const at = t + (i % 2 === 1 ? (tr.swing ?? 0) * tr.step : 0)
  const accent = i % 8 === 0 ? 1 : i % 2 === 0 ? 0.88 : 0.8
  for (const part of parts) {
    const v = part.notes[i]
    if (v === undefined || v === 0 || v === HOLD) continue
    const when = at + Math.random() * 0.006 // never early: lookahead keeps `t` in the future
    const human = 0.9 + Math.random() * 0.2
    const vol = part.vol * human
    switch (part.inst) {
      case 'shaker':
        if (typeof v === 'number') shaker(s, when, vol * v, dest)
        break
      case 'snap':
        if (typeof v === 'number') snap(s, when, vol * v, dest)
        break
      case 'pizz':
      case 'bass':
      case 'glock':
      case 'whistle': {
        const notes = typeof v === 'number' ? [v] : v
        for (const n of notes) {
          const hz = midiToHz(n)
          if (part.inst === 'pizz') pluck(s, hz, when, part.decay ?? 0.32, vol * accent, 6, dest)
          else if (part.inst === 'bass') {
            pluck(s, hz, when, part.decay ?? 0.55, vol * accent, 4, dest)
            decayTone(s, hz, when, (part.decay ?? 0.55) * 0.9, 'sine', vol * accent * 0.5, dest, 0.006)
          } else if (part.inst === 'glock') glock(s, hz, when, vol * accent, dest)
          else {
            let len = 1
            while (len < tr.length && part.notes[(i + len) % tr.length] === HOLD) len++
            whistle(s, hz, when, len * tr.step * 0.94, vol * accent, dest)
          }
        }
        break
      }
    }
  }
}

interface Cursor {
  /** AudioContext time of the next step. */
  next: number
  index: number
}

/** A procedural track being sequenced. */
interface SynthLoop extends Cursor {
  track: Track
}

/** A recorded track being looped. */
interface SampleLoop {
  def: SampleTrack
  /** null until decoded. */
  buf: AudioBuffer | null
  /** Context time at which the next pass starts. */
  next: number
  passes: number
  srcs: Set<AudioBufferSourceNode>
}

interface Player {
  id: TrackId
  gain: GainNode
  timer: number
  stopped: boolean
  /**
   * Exactly one of these is set (a sample track that fails to load switches to its procedural fallback), except for a
   * failed sample track without a fallback: then both are null and `silent` is true.
   */
  synth: SynthLoop | null
  rec: SampleLoop | null
  silent: boolean
}

let current: Player | null = null
const LOOKAHEAD = 0.5

/** Schedules every step of `tr` whose time falls before `until`, advancing the cursor. */
function fill(e: Synth, tr: Track, c: Cursor, dest: AudioNode, until: number): void {
  while (c.next < until) {
    const i = c.index
    const t = c.next
    const l = tr.lead?.[i]
    if (l) tone(e, midiToHz(l), t, tr.step * 0.85, tr.leadWave ?? 'square', tr.leadVol ?? 0, dest, 0.01, 0.08)
    const b = tr.bass?.[i]
    if (b) tone(e, midiToHz(b), t, tr.step * 1.6, 'triangle', 0.16, dest, 0.01, 0.1)
    if (tr.tick && i % 2 === 1) noiseHit(e, t, 0.03, 0.025, 'highpass', 6000, 0.7, dest)
    const chord = tr.pad?.[i]
    if (chord) {
      const len = (tr.padLen ?? 4) * tr.step
      for (let k = 0; k < chord.length; k++) tone(e, midiToHz(chord[k]), t, len, 'sine', 0.05, dest, 1.1, 1.4)
    }
    if (tr.parts) playParts(e, tr, i, t, dest)
    c.index = (i + 1) % tr.length
    c.next += tr.step
  }
}

/** Loop region of a recorded track: [start, end, crossfade] in seconds. */
function loopRegion(def: SampleTrack, buf: AudioBuffer): [number, number, number] {
  const a = Math.min(Math.max(0, def.loopStart), buf.duration)
  const b = def.loopEnd > a ? Math.min(def.loopEnd, buf.duration) : buf.duration
  return [a, b, Math.min(def.xfade, (b - a) / 4)]
}

/**
 * Schedules one pass of a recorded loop at `t0` into `dest` (fading in over the crossfade unless it is the first
 * pass, fading out over the last crossfade). Returns when the next pass should start (overlapping by the crossfade).
 */
function loopPass(ctx: BaseAudioContext, r: SampleLoop, buf: AudioBuffer, dest: AudioNode, t0: number): number {
  const [a, b, x] = loopRegion(r.def, buf)
  const len = b - a
  const lvl = SAMPLE_GAIN[r.def.sample]
  const t = Math.max(t0, ctx.currentTime)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  if (r.passes === 0 || x <= 0) g.gain.setValueAtTime(lvl, t)
  else {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(lvl, t + x)
  }
  if (x > 0) {
    g.gain.setValueAtTime(lvl, t + len - x)
    g.gain.linearRampToValueAtTime(0.0001, t + len)
  }
  src.connect(g).connect(dest)
  src.start(t, a, len)
  r.srcs.add(src)
  src.onended = () => {
    r.srcs.delete(src)
    src.disconnect()
    g.disconnect()
  }
  r.passes++
  return t + len - x
}

/** One scheduler tick (every 60 ms while a track plays). */
function tick(e: Engine, p: Player): void {
  const now = e.ctx.currentTime
  const r = p.rec
  if (r) {
    if (!r.buf) {
      const b = sampleBufs.get(r.def.sample)
      if (b) {
        r.buf = b
        r.next = now + 0.05
      } else if (sampleFailed.has(r.def.sample)) {
        // the file is not available: play the procedural version under the same id, or nothing if it has none
        p.rec = null
        if (r.def.fallback) p.synth = { track: TRACKS[r.def.fallback], next: now + 0.05, index: 0 }
        else {
          // silence is better than a disliked track: keep the player (so stopIf/isPlaying still work) but stop ticking
          p.silent = true
          window.clearInterval(p.timer)
          return
        }
      } else return // still loading (the player's fade-in simply starts once it is decoded)
    }
    const buf = r.buf
    if (buf) {
      while (r.next < now + LOOKAHEAD) r.next = loopPass(e.ctx, r, buf, p.gain, r.next)
      return
    }
  }
  const s = p.synth
  if (!s) return
  // While muted keep the clock moving but skip the (procedural) scheduling work.
  if (muted) {
    s.next = now + 0.05
    return
  }
  if (s.next < now) s.next = now + 0.03
  fill(e, s.track, s, p.gain, now + LOOKAHEAD)
}

function fadeOutAndDrop(e: Engine, p: Player, fade: number): void {
  p.stopped = true
  window.clearInterval(p.timer)
  const f = Math.max(0.01, fade)
  try {
    const t = e.ctx.currentTime
    p.gain.gain.cancelScheduledValues(t)
    p.gain.gain.setValueAtTime(p.gain.gain.value, t)
    p.gain.gain.linearRampToValueAtTime(0, t + f)
    if (p.rec) for (const src of p.rec.srcs) src.stop(t + f + 0.05)
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
    (f + 1.8) * 1000,
  )
}

export const music = {
  /** Start (or crossfade to) a track. No-op if locked/unavailable. A recorded track fades in once it has loaded. */
  play(id: TrackId, fade = 0.4): void {
    music.crossfade(id, fade)
  },
  crossfade(id: TrackId, fade = 1.2): void {
    const e = engine
    if (!e || e.ctx.state === 'closed') return
    try {
      if (current && !current.stopped && current.id === id) return
      const old = current
      if (old) fadeOutAndDrop(e, old, fade)
      const gain = e.ctx.createGain()
      const t = e.ctx.currentTime
      gain.connect(e.musicBus)
      const p: Player = { id, gain, timer: 0, stopped: false, synth: null, rec: null, silent: false }
      if (isSampleTrack(id)) {
        const def: SampleTrack = SAMPLE_TRACKS[id]
        p.rec = { def, buf: sampleBufs.get(def.sample) ?? null, next: t + 0.05, passes: 0, srcs: new Set() }
        void loadSample(def.sample)
      } else {
        p.synth = { track: TRACKS[id], next: t + 0.05, index: 0 }
      }
      const pending = p.rec && !p.rec.buf ? p.rec.def.sample : null
      gain.gain.setValueAtTime(0, t)
      if (!pending) gain.gain.linearRampToValueAtTime(1, t + Math.max(0.01, fade))
      else {
        // not decoded yet: fade in from whenever the first pass starts
        void loadSample(pending).then(() => {
          if (p.stopped) return
          try {
            const now = e.ctx.currentTime
            gain.gain.cancelScheduledValues(now)
            gain.gain.setValueAtTime(0, now)
            gain.gain.linearRampToValueAtTime(1, now + Math.max(0.3, fade))
            tick(e, p)
          } catch {
            /* never throw */
          }
        })
      }
      p.timer = window.setInterval(() => {
        try {
          tick(e, p)
        } catch {
          /* never throw from a timer */
        }
      }, 60)
      current = p
      tick(e, p)
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
  isPlaying: (id?: TrackId): boolean => current !== null && !current.stopped && (id === undefined || current.id === id),
  /** Stop only if `id` is the current track (so a scene never kills its successor's music). */
  stopIf(id: TrackId, fade = 0.4): void {
    if (music.isPlaying(id)) music.stop(fade)
  },
  /** DEV/verification: what the current player is doing. */
  debugState(): { id: TrackId; mode: 'synth' | 'sample' | 'loading' | 'silent'; passes: number } | null {
    const p = current
    if (!p || p.stopped) return null
    const mode = p.silent ? 'silent' : p.synth ? 'synth' : p.rec?.buf ? 'sample' : 'loading'
    return { id: p.id, mode, passes: p.rec?.passes ?? 0 }
  },
}

// ───────────────────────── offline previews (dev tools / tests) ─────────────────────────

/** Length of one loop of a track, in seconds (null for a recorded track that has not been decoded yet). */
export const trackSeconds = (id: TrackId): number | null => {
  if (isSampleTrack(id)) {
    const def: SampleTrack = SAMPLE_TRACKS[id]
    const buf = sampleBufs.get(def.sample)
    if (!buf) return null
    const [a, b, x] = loopRegion(def, buf)
    return b - a - x
  }
  const tr: Track = TRACKS[id]
  return tr.step * tr.length
}

/** Whether a track is a recording (true) or procedural (false). */
export const isRecordedTrack = (id: TrackId): boolean => isSampleTrack(id)

export type PreviewSfx =
  | 'pageTurn'
  | 'pageTurnSoft'
  | 'riffle'
  | 'bookThud'
  | 'bookThudSoft'
  | 'pencilTick'
  | 'bootChime' // Ch4 start-up chime (procedural, always layered on the recorded 'boot')
  | 'warmChord' // Ch5 SAVE chord, sfx.city('chord')
export type PreviewWhat = { track: TrackId; seconds?: number } | { sfx: PreviewSfx } | { sample: SampleId; seconds?: number }

const SR_DEFAULT = 44100

/**
 * Renders a track, a recorded sample, or a procedural sfx (diary fallbacks, Ch4 boot chime, Ch5 SAVE chord) through
 * the real bus gains and master limiter into an AudioBuffer (mono), using an OfflineAudioContext. Needs no unlock and ignores mute. Used by the
 * DEV audition page (?audio-demo) and level checks; tree-shaken from production. `riffle` = 12 soft procedural flips
 * 0.1 s apart (stress-tests the paper voice cap). Rejects if a recording cannot be fetched/decoded.
 */
export async function renderPreview(what: PreviewWhat, sampleRate = SR_DEFAULT): Promise<AudioBuffer> {
  const recId: SampleId | null =
    'sample' in what ? what.sample : 'track' in what && isSampleTrack(what.track) ? SAMPLE_TRACKS[what.track].sample : null
  let buf: AudioBuffer | null = null
  if (recId) {
    buf = await decodeSample(new OfflineAudioContext(1, 1, sampleRate), recId)
    if (!buf) throw new Error(`audio file failed to load: ${recId}`)
  }
  const isMusic = 'track' in what || (recId !== null && isMusicSample(recId))
  let seconds: number
  if ('track' in what) {
    if (buf && isSampleTrack(what.track)) {
      const [a, b] = loopRegion(SAMPLE_TRACKS[what.track], buf)
      seconds = what.seconds ?? b - a + 4 // one pass plus the seam into the next
    } else seconds = what.seconds ?? (trackSeconds(what.track) ?? 0) + 2
  } else if ('sample' in what) seconds = what.seconds ?? (buf ? buf.duration + 0.3 : 1)
  else seconds = what.sfx === 'riffle' ? 2 : what.sfx === 'warmChord' ? 5 : what.sfx === 'bootChime' ? 2.5 : 1
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate)
  const s: Synth = { ctx, noise: makeNoise(ctx) }
  const master = ctx.createGain()
  master.gain.value = 0.8
  createMasterChain(ctx, master)
  const bus = ctx.createGain()
  bus.gain.value = isMusic ? 0.35 : 0.9
  bus.connect(master)
  if ('track' in what) {
    if (buf && isSampleTrack(what.track)) {
      const r: SampleLoop = { def: SAMPLE_TRACKS[what.track], buf, next: 0.05, passes: 0, srcs: new Set() }
      while (r.next < seconds) r.next = loopPass(ctx, r, buf, bus, r.next)
    } else if (!isSampleTrack(what.track)) {
      // (a recorded track always has `buf` here: a failed file rejected above)
      const tr: Track = TRACKS[what.track]
      // stop scheduling a little before the end so tails ring out inside the render
      fill(s, tr, { next: 0.05, index: 0 }, bus, Math.max(0.1, seconds - 1.5))
    }
  } else if ('sample' in what) {
    if (buf) startBuffer(ctx, buf, SAMPLE_GAIN[what.sample], bus, 0.05)
  } else {
    const cap: VoiceCap = { ends: [], last: -1 }
    const t = 0.05
    switch (what.sfx) {
      case 'pageTurn':
        paperFlip(s, t, false, bus, cap)
        break
      case 'pageTurnSoft':
        paperFlip(s, t, true, bus, cap)
        break
      case 'riffle':
        for (let k = 0; k < 12; k++) paperFlip(s, t + k * 0.1, true, bus, cap)
        break
      case 'bookThud':
        bookLand(s, t, false, bus)
        break
      case 'bookThudSoft':
        bookLand(s, t, true, bus)
        break
      case 'pencilTick':
        pencil(s, t, bus)
        break
      case 'bootChime':
        bootChime(s, t, 1, bus)
        break
      case 'warmChord':
        warmChord(s, t, 1, bus)
        break
    }
  }
  return ctx.startRendering()
}
