import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  SAMPLE_IDS,
  SAMPLE_SETS,
  audio,
  isRecordedTrack,
  music,
  renderPreview,
  sfx,
  trackSeconds,
  type CityCue,
  type DeskCue,
  type PreviewWhat,
  type SampleId,
  type TrackId,
} from './audio'

/**
 * DEV-only audition page: http://localhost:5173/?audio-demo
 * Play/stop every music track, fire every sfx and every recorded sample, and download offline renders as WAV files.
 * Also exposes `window.__audioDemo` ({ render(what), trackSeconds, audio, music, sfx, SAMPLE_IDS }) for headless checks.
 * Recorded files live in public/audio (credits: public/audio/CREDITS.md).
 */

const TRACKS: { id: TrackId; note: string }[] = [
  { id: 'town', note: 'Chapter 1 (Pokemon-style walk)' },
  { id: 'arcade', note: 'Chapter 2 (arcade)' },
  { id: 'calm', note: 'old Chapter 3 pad (unused)' },
  {
    id: 'diary',
    note: 'Chapter 3 diary (live): "Uplifting Funny Whistle Folk" by Emmraan (Pixabay): guitar, whistle, claps, 110 bpm',
  },
  {
    id: 'diaryAlt1',
    note: 'runner-up 1: "Happy Clappy Ukulele" by Shane Ivers (CC BY 4.0, needs a footer credit): ukulele, glockenspiel, whistle, claps, 90 bpm',
  },
  {
    id: 'diaryAlt2',
    note: 'runner-up 2: "Upbeat Acoustic" by Stockaudios (Pixabay): acoustic guitar, claps, glockenspiel, 120 bpm',
  },
  { id: 'diaryScore', note: 'old procedural diary score (rejected; no longer used, not even as a fallback)' },
  {
    id: 'desk',
    note: 'Chapter 4 family PC (live): "Energetic Funky Groove" by _Music_for_Creators_ (Pixabay): drums, funk bass, clean guitar, 100 bpm',
  },
  {
    id: 'deskAlt',
    note: 'Ch4 runner-up: "Jazzy Abstract Beat_Chops" by Coma-Media (Pixabay): minimal jazzy hip-hop beat, 93 bpm',
  },
  {
    id: 'city',
    note: 'Chapter 5 San Francisco (live): "Soft Hopeful Piano" by PaulYudin (Pixabay): piano, string/bass swell, C major',
  },
  {
    id: 'cityAlt',
    note: 'Ch5 runner-up: "Ambient Piano and Strings" by Good_B_Music (Pixabay): slower, lusher strings, 80 bpm',
  },
]

const DESK_CUE_LIST: DeskCue[] = [
  'crtOn',
  'boot',
  'mail',
  'windowOpen',
  'click',
  'error',
  'screenOff',
  'countdown',
  'continueYes',
  'installDone',
  'sale',
  'cashBig',
  'message',
  'chatNudge',
  'typing',
  'vote',
  'adDone',
  'badge',
  'applause',
  'minimise',
]
const CITY_CUE_LIST: CityCue[] = ['whoosh', 'card', 'save', 'saved', 'chord']

/** Ch4/Ch5 cues: recorded (default) and the procedural fallback each one plays until/unless its file loads. */
const CUE_SFX: { label: string; fire: () => void }[] = [
  ...DESK_CUE_LIST.map((c) => ({ label: `desk: ${c}`, fire: () => sfx.desk(c) })),
  ...CITY_CUE_LIST.map((c) => ({ label: `city: ${c}`, fire: () => sfx.city(c) })),
  {
    label: 'desk: CONTINUE? 9..1 countdown then YES',
    fire: () => {
      for (let k = 0; k < 9; k++) window.setTimeout(() => sfx.desk('countdown'), k * 700)
      window.setTimeout(() => sfx.desk('continueYes'), 9 * 700)
    },
  },
  {
    label: 'desk: 12 sales (every 350 ms) then cashBig',
    fire: () => {
      for (let k = 0; k < 12; k++) window.setTimeout(() => sfx.desk('sale'), k * 350)
      window.setTimeout(() => sfx.desk('cashBig'), 12 * 350 + 200)
    },
  },
  {
    label: 'desk: vote tally x3 (every 400 ms)',
    fire: () => {
      for (let k = 0; k < 3; k++) window.setTimeout(() => sfx.desk('vote'), k * 400)
    },
  },
  {
    label: 'city: save -> saved -> chord (scene timing)',
    fire: () => {
      sfx.city('save')
      window.setTimeout(() => sfx.city('saved'), 2050)
      window.setTimeout(() => sfx.city('chord'), 2750)
    },
  },
]
const CUE_FALLBACKS: { label: string; fire: () => void }[] = [
  ...DESK_CUE_LIST.map((c) => ({ label: c, fire: () => sfx.desk(c, { fallback: true }) })),
  ...CITY_CUE_LIST.filter((c) => c !== 'chord').map((c) => ({ label: `city ${c}`, fire: () => sfx.city(c, { fallback: true }) })),
]

const SFX: { label: string; fire: () => void }[] = [
  { label: 'punch', fire: () => sfx.punch() },
  { label: 'kick', fire: () => sfx.kick() },
  { label: 'block', fire: () => sfx.block() },
  { label: 'ko', fire: () => sfx.ko() },
  { label: 'swoosh', fire: () => sfx.swoosh() },
  { label: 'swoosh(big)', fire: () => sfx.swoosh(true) },
  {
    label: 'fight combo (swooshes, punches, block, kick, K.O., ooh)',
    fire: () => {
      const at = (ms: number, f: () => void) => window.setTimeout(f, ms)
      at(0, () => sfx.swoosh())
      at(90, () => sfx.punch())
      at(420, () => sfx.swoosh())
      at(510, () => sfx.punch())
      at(800, () => sfx.block())
      at(1150, () => sfx.swoosh(true))
      at(1250, () => sfx.kick())
      at(1700, () => sfx.swoosh(true))
      at(1820, () => sfx.ko())
      at(2000, () => sfx.crowdOoh())
    },
  },
  { label: 'crowdOoh', fire: () => sfx.crowdOoh() },
  { label: 'crowdCheer', fire: () => sfx.crowdCheer() },
  { label: 'applause', fire: () => sfx.applause(2) },
  { label: 'laugh', fire: () => sfx.laugh() },
  { label: 'coverOpen', fire: () => sfx.coverOpen() },
  { label: 'pageTurn', fire: () => sfx.pageTurn() },
  { label: 'pageTurn(soft)', fire: () => sfx.pageTurn(true) },
  {
    label: 'riffle x12 (every 100 ms)',
    fire: () => {
      for (let k = 0; k < 12; k++) window.setTimeout(() => sfx.pageTurn(true), k * 100)
    },
  },
  { label: 'bookThud', fire: () => sfx.bookThud() },
  { label: 'bookThud(soft)', fire: () => sfx.bookThud(true) },
  { label: 'pencilTick', fire: () => sfx.pencilTick() },
  { label: 'blip', fire: () => sfx.blip() },
  { label: 'coin', fire: () => sfx.coin() },
  { label: 'tada(2)', fire: () => sfx.tada(2) },
  { label: 'footstep', fire: () => sfx.footstep() },
  { label: 'confirm', fire: () => sfx.confirm() },
  { label: 'impact (procedural, UI slams)', fire: () => sfx.impact() },
  { label: 'whoosh (procedural, UI wipes)', fire: () => sfx.whoosh() },
  { label: 'whoosh(big) (procedural)', fire: () => sfx.whoosh(true) },
  { label: 'gameboyChime', fire: () => sfx.gameboyChime() },
]

type What = PreviewWhat

interface Stats {
  seconds: number
  peak: number
  peakDb: number
  rmsDb: number
  /** Loudest 1 s window, dBFS. */
  maxWindowRmsDb: number
  dc: number
  clipped: number
  /** Longest run of 50 ms windows quieter than -60 dBFS (seconds), ignoring the first 0.3 s. */
  longestSilence: number
}

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity)

function measure(d: Float32Array, sr: number): Stats {
  let peak = 0
  let sum = 0
  let sq = 0
  let clipped = 0
  for (let i = 0; i < d.length; i++) {
    const v = d[i]
    const a = Math.abs(v)
    if (a > peak) peak = a
    if (a >= 0.999) clipped++
    sum += v
    sq += v * v
  }
  const win = Math.round(sr * 0.05)
  let run = 0
  let longest = 0
  for (let w = Math.round(sr * 0.3); w + win <= d.length; w += win) {
    let s = 0
    for (let i = w; i < w + win; i++) s += d[i] * d[i]
    if (db(Math.sqrt(s / win)) < -60) {
      run++
      longest = Math.max(longest, run)
    } else run = 0
  }
  let maxWin = 0
  for (let w = 0; w + sr <= d.length; w += Math.round(sr / 4)) {
    let s = 0
    for (let i = w; i < w + sr; i++) s += d[i] * d[i]
    maxWin = Math.max(maxWin, Math.sqrt(s / sr))
  }
  const r2 = (x: number): number => Math.round(x * 100) / 100
  return {
    seconds: r2(d.length / sr),
    peak: Math.round(peak * 10000) / 10000,
    peakDb: r2(db(peak)),
    rmsDb: r2(db(Math.sqrt(sq / d.length))),
    maxWindowRmsDb: r2(db(maxWin)),
    dc: Math.round((sum / d.length) * 1e6) / 1e6,
    clipped,
    longestSilence: r2(longest * 0.05),
  }
}

/** RMS (dBFS) of consecutive 0.5 s windows from `from` to `to` seconds: to eyeball a loop seam. */
function windows(d: Float32Array, sr: number, from: number, to: number): number[] {
  const out: number[] = []
  const n = Math.round(sr * 0.5)
  for (let t = from; t + 0.5 <= to; t += 0.5) {
    const a = Math.round(t * sr)
    let s = 0
    for (let i = a; i < a + n && i < d.length; i++) s += d[i] * d[i]
    out.push(Math.round(db(Math.sqrt(s / n)) * 10) / 10)
  }
  return out
}

function wav16(d: Float32Array, sr: number): Uint8Array {
  const buf = new ArrayBuffer(44 + d.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + d.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, d.length * 2, true)
  for (let i = 0; i < d.length; i++) {
    const x = Math.max(-1, Math.min(1, d[i]))
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(s)
}

async function render(what: What, opts: { wav?: boolean; seam?: number } = {}) {
  const buf = await renderPreview(what)
  const d = buf.getChannelData(0)
  const sr = buf.sampleRate
  return {
    stats: measure(d, sr),
    seam: opts.seam !== undefined ? windows(d, sr, Math.max(0, opts.seam - 3), opts.seam + 3) : undefined,
    wav: opts.wav ? toBase64(wav16(d, sr)) : undefined,
  }
}

async function download(what: What, name: string): Promise<void> {
  const buf = await renderPreview(what)
  const blob = new Blob([wav16(buf.getChannelData(0), buf.sampleRate).buffer as ArrayBuffer], { type: 'audio/wav' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

;(window as unknown as { __audioDemo?: unknown }).__audioDemo = { render, trackSeconds, audio, music, sfx, SAMPLE_IDS }

const fmtLoop = (id: TrackId): string => {
  const s = trackSeconds(id)
  return s === null ? 'loop length shown once loaded' : `loop ${s.toFixed(1)} s`
}

const box: React.CSSProperties = {
  minHeight: '100vh',
  padding: 24,
  background: '#14121a',
  color: '#efe9dc',
  font: '15px/1.45 system-ui, sans-serif',
}
const btn: React.CSSProperties = {
  font: 'inherit',
  padding: '8px 12px',
  margin: '0 8px 8px 0',
  background: '#2a2534',
  color: 'inherit',
  border: '1px solid #5a5068',
  borderRadius: 6,
  cursor: 'pointer',
}

export default function AudioDemo() {
  const muted = useSyncExternalStore(audio.subscribe, audio.isMuted)
  const [on, setOn] = useState(audio.isUnlocked())
  const [playing, setPlaying] = useState<TrackId | null>(null)
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState(audio.sampleStatus())

  // refresh the load status of the recorded files while the page is open
  useEffect(() => {
    const id = window.setInterval(() => setStatus(audio.sampleStatus()), 500)
    return () => window.clearInterval(id)
  }, [])

  // every button unlocks first (audio needs a user gesture)
  const go = (f: () => void) => () => {
    audio.unlock()
    setOn(true)
    void audio.whenRunning().then((ok) => {
      if (ok) f()
    })
  }

  return (
    <main style={box}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Audio audition (DEV)</h1>
      <p style={{ margin: '0 0 16px', opacity: 0.75 }}>
        Click any button to enable sound. {on ? 'Audio unlocked.' : 'Audio locked until the first click.'}{' '}
        {muted && (
          <button style={btn} onClick={() => audio.setMuted(false)}>
            Muted (site setting). Unmute
          </button>
        )}
      </p>

      <h2 style={{ fontSize: 17 }}>Music</h2>
      {TRACKS.map((t) => (
        <div key={t.id} style={{ marginBottom: 4 }}>
          <button
            style={{ ...btn, background: playing === t.id ? '#4a3c1c' : btn.background }}
            onClick={go(() => {
              music.play(t.id, 0.6)
              setPlaying(t.id)
            })}
          >
            {playing === t.id ? 'playing: ' : 'play '}
            {t.id}
          </button>
          <span style={{ opacity: 0.7 }}>
            {t.note} · {isRecordedTrack(t.id) ? 'recording' : 'procedural'} · {fmtLoop(t.id)}
          </span>
        </div>
      ))}
      <button
        style={btn}
        onClick={() => {
          music.stop(0.6)
          setPlaying(null)
        }}
      >
        stop music
      </button>

      <h2 style={{ fontSize: 17 }}>Sound effects</h2>
      <div>
        {SFX.map((s) => (
          <button key={s.label} style={btn} onClick={go(s.fire)}>
            {s.label}
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: 17 }}>Chapter 4 / 5 cues (sfx.desk / sfx.city)</h2>
      <p style={{ margin: '0 0 8px', opacity: 0.75 }}>
        Recorded cues (the first press of each may play the procedural fallback while its file loads).{' '}
        <button style={btn} onClick={go(() => audio.preload([...SAMPLE_SETS.ch4, ...SAMPLE_SETS.ch5]))}>
          load Ch4/Ch5 files
        </button>
      </p>
      <div>
        {CUE_SFX.map((s) => (
          <button key={s.label} style={btn} onClick={go(s.fire)}>
            {s.label}
          </button>
        ))}
      </div>
      <p style={{ margin: '4px 0 8px', opacity: 0.75 }}>Procedural fallbacks (what plays if a file is missing):</p>
      <div>
        {CUE_FALLBACKS.map((s) => (
          <button key={s.label} style={{ ...btn, opacity: 0.8 }} onClick={go(s.fire)}>
            {s.label}
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: 17 }}>Recorded samples (public/audio)</h2>
      <p style={{ margin: '0 0 8px', opacity: 0.75 }}>
        Each button plays the raw file at its mix level. Status: ready / loading / failed / idle (not requested yet).{' '}
        <button style={btn} onClick={go(() => audio.preload(SAMPLE_IDS))}>
          load all
        </button>
      </p>
      <div>
        {SAMPLE_IDS.map((id: SampleId) => (
          <button
            key={id}
            style={{ ...btn, borderColor: status[id] === 'failed' ? '#c0392b' : status[id] === 'ready' ? '#3f8f4f' : '#5a5068' }}
            onClick={go(() => sfx.sample(id))}
            title={status[id]}
          >
            {id} <span style={{ opacity: 0.6 }}>({status[id]})</span>
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: 17 }}>Download offline renders (WAV)</h2>
      <p style={{ margin: '0 0 8px', opacity: 0.75 }}>Rendered through the real mix levels and limiter; no unlock needed.</p>
      <div>
        {(
          [
            [{ track: 'diary' }, 'diary-recorded-with-loop-seam.wav'],
            [{ track: 'diaryAlt1' }, 'diary-alt1-with-loop-seam.wav'],
            [{ track: 'diaryAlt2' }, 'diary-alt2-with-loop-seam.wav'],
            [{ track: 'diaryScore' }, 'diary-procedural.wav'],
            [{ track: 'desk' }, 'desk-with-loop-seam.wav'],
            [{ track: 'deskAlt' }, 'desk-alt-with-loop-seam.wav'],
            [{ track: 'city' }, 'city-with-loop-seam.wav'],
            [{ track: 'cityAlt' }, 'city-alt-with-loop-seam.wav'],
            [{ sfx: 'bootChime' }, 'desk-boot-chime-procedural.wav'],
            [{ sfx: 'warmChord' }, 'city-save-chord-procedural.wav'],
            [{ track: 'town', seconds: 22 }, 'town.wav'],
            [{ sample: 'crowd-cheer' }, 'crowd-cheer.wav'],
            [{ sample: 'fight-ko' }, 'fight-ko.wav'],
            [{ sfx: 'pageTurn' }, 'page-turn-procedural.wav'],
            [{ sfx: 'riffle' }, 'riffle-procedural.wav'],
            [{ sfx: 'bookThud' }, 'book-thud-procedural.wav'],
            [{ sfx: 'pencilTick' }, 'pencil-tick-procedural.wav'],
          ] as [What, string][]
        ).map(([w, name]) => (
          <button
            key={name}
            style={btn}
            disabled={busy !== ''}
            onClick={() => {
              setBusy(name)
              void download(w, name).finally(() => setBusy(''))
            }}
          >
            {busy === name ? 'rendering…' : name}
          </button>
        ))}
      </div>
    </main>
  )
}
