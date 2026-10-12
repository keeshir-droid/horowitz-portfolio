import { useEffect, useRef, useState } from 'react'
import { HOLD_A, HOLD_B, pixelateEnvelope } from './pixelate-math'

/**
 * Full-screen pixelate transition. `progress` 0..1:
 *   0 .. ~0.42  blocks grow from fine to huge (4 columns)
 *   ~0.42 .. ~0.58  HOLD on a few huge blocks   <- swap the scene underneath here
 *   ~0.58 .. 1  blocks shrink and the new picture resolves
 *
 * Two modes, picked by props:
 *  - cover mode (no `from`/`to`): a transparent overlay; blocks of palette colours dissolve in over whatever
 *    is underneath (DOM or canvas), fully cover at the hold, then dissolve away. Swap scenes at p = 0.5.
 *  - texture mode (`from` and/or `to` given as canvas/video/image): pixelates `from` before the hold and `to`
 *    after it, drawing an opaque result. The source is re-uploaded each time `progress` changes.
 * Reduced motion / no WebGL: a plain CSS crossfade (opacity peaks at the hold).
 */
export interface PixelateProps {
  progress: number
  from?: TexImageSource | null
  to?: TexImageSource | null
  /** Palette for cover mode (CSS hex colours). */
  colors?: readonly string[]
  /** Force the CSS fallback (defaults to prefers-reduced-motion). */
  reduced?: boolean
  className?: string
  /** Called when WebGL could not be initialised and the fallback took over. Keep it referentially stable. */
  onFallback?: () => void
}

const VERT = `attribute vec2 a; varying vec2 v; void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform float u_p;
uniform float u_aspect;
uniform float u_mode;      // 0 = cover, 1 = texture
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform vec3 u_c[4];
float hash(vec2 s){ return fract(sin(dot(s, vec2(127.1, 311.7))) * 43758.5453); }
float env(float p){
  float e = min(min(1., p / ${HOLD_A.toFixed(2)}), (1. - p) / ${(1 - HOLD_B).toFixed(2)});
  e = clamp(e, 0., 1.);
  return e * e * (3. - 2. * e);
}
void main(){
  float e = env(u_p);
  // columns: 360 (reads as full-res) down to 4 (huge), log-interpolated
  float cols = exp(mix(log(360.), log(4.), e));
  vec2 grid = vec2(cols, cols / u_aspect);
  // grid is centred on the screen, so partial edge cells are symmetric left/right and top/bottom
  vec2 cell = floor((v - 0.5) * grid + 0.5);
  vec2 q = cell / grid + 0.5;
  if (u_mode > 0.5) {
    vec2 uv = e < 0.002 ? v : q;
    vec4 a = texture2D(u_from, uv);
    vec4 b = texture2D(u_to, uv);
    gl_FragColor = vec4((u_p < 0.5 ? a : b).rgb, 1.);
    return;
  }
  float h = hash(cell);
  float cover = step(h, e * 1.08) * step(0.002, e);   // each block flips on at its own moment
  int idx = int(floor(hash(cell + 7.7) * 4.));
  vec3 col = u_c[0];
  if (idx == 1) col = u_c[1]; else if (idx == 2) col = u_c[2]; else if (idx == 3) col = u_c[3];
  // checker shading makes the huge blocks read as pixels, not a flat fill
  col *= 0.9 + 0.1 * mod(cell.x + cell.y, 2.);
  gl_FragColor = vec4(col, 1.) * cover;
}`

const DEFAULT_COLORS: readonly string[] = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']

function parseHex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

interface GlState {
  canvas: HTMLCanvasElement
  gl: WebGLRenderingContext
  program: WebGLProgram
  buf: WebGLBuffer
  texFrom: WebGLTexture
  texTo: WebGLTexture
  uP: WebGLUniformLocation
  uAspect: WebGLUniformLocation
  uMode: WebGLUniformLocation
  uC: WebGLUniformLocation
  colors: Float32Array
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)
  if (!s) throw new Error('shader alloc')
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) ?? 'compile error'
    gl.deleteShader(s)
    throw new Error(log)
  }
  return s
}

function initGl(canvas: HTMLCanvasElement): GlState {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false })
  if (!gl) throw new Error('no webgl')
  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link error')
  gl.useProgram(program)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW) // one oversized triangle
  const loc = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const mk = (): WebGLTexture => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    return t
  }
  const texFrom = mk()
  const texTo = mk()
  gl.uniform1i(gl.getUniformLocation(program, 'u_from'), 0)
  gl.uniform1i(gl.getUniformLocation(program, 'u_to'), 1)
  const uP = gl.getUniformLocation(program, 'u_p')
  const uAspect = gl.getUniformLocation(program, 'u_aspect')
  const uMode = gl.getUniformLocation(program, 'u_mode')
  const uC = gl.getUniformLocation(program, 'u_c[0]')
  if (!uP || !uAspect || !uMode || !uC) throw new Error('uniform lookup')
  // DOM sources have a top-left origin; GL textures are bottom-left, so flip on upload.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
  return { canvas, gl, program, buf, texFrom, texTo, uP, uAspect, uMode, uC, colors: new Float32Array(12) }
}

function disposeGl(s: GlState): void {
  const { gl } = s
  gl.deleteTexture(s.texFrom)
  gl.deleteTexture(s.texTo)
  gl.deleteBuffer(s.buf)
  gl.deleteProgram(s.program)
  gl.getExtension('WEBGL_lose_context')?.loseContext()
}

const reducedQuery = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * StrictMode-safe: each effect run creates its OWN canvas (appended to a host div); the cleanup removes it
 * and loses only that canvas's context, so a re-run never reuses a lost context.
 */
export default function PixelateTransition({ progress, from, to, colors, reduced, className, onFallback }: PixelateProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<GlState | null>(null)
  const fallbackRef = useRef(onFallback)
  useEffect(() => {
    fallbackRef.current = onFallback
  })
  const [failed, setFailed] = useState(false)
  // Bumped when a canvas is created or resized (both clear the drawing buffer, so we must redraw).
  const [sizeTick, setSizeTick] = useState(0)
  const useCss = (reduced ?? reducedQuery()) || failed
  const palette = colors ?? DEFAULT_COLORS
  const paletteKey = palette.join(',')

  useEffect(() => {
    if (useCss) return
    const host = hostRef.current
    if (!host) return
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    host.appendChild(canvas)
    let state: GlState
    try {
      state = initGl(canvas)
    } catch {
      host.removeChild(canvas)
      setFailed(true)
      fallbackRef.current?.()
      return
    }
    glRef.current = state
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        state.gl.viewport(0, 0, w, h)
        setSizeTick((n) => n + 1)
      }
    }
    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      glRef.current = null
      disposeGl(state)
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [useCss])

  // Draw whenever an input changes (no rAF loop: the parent drives `progress`).
  useEffect(() => {
    const s = glRef.current
    if (!s) return
    const { gl, canvas } = s
    try {
      const cs = s.colors
      const pal = paletteKey.split(',')
      for (let i = 0; i < 4; i++) {
        const [r, g, b] = parseHex(pal[i % pal.length])
        cs[i * 3] = r
        cs[i * 3 + 1] = g
        cs[i * 3 + 2] = b
      }
      const textured = !!(from || to)
      gl.uniform1f(s.uP, progress < 0 ? 0 : progress > 1 ? 1 : progress)
      gl.uniform1f(s.uAspect, canvas.width / Math.max(1, canvas.height))
      gl.uniform1f(s.uMode, textured ? 1 : 0)
      gl.uniform3fv(s.uC, cs)
      if (textured) {
        const up = (unit: number, tex: WebGLTexture, src: TexImageSource | null | undefined) => {
          gl.activeTexture(gl.TEXTURE0 + unit)
          gl.bindTexture(gl.TEXTURE_2D, tex)
          if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
        }
        up(0, s.texFrom, from ?? to)
        up(1, s.texTo, to ?? from)
      }
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    } catch {
      /* a failed upload (tainted/zero-size source) just skips this frame */
    }
  }, [progress, from, to, paletteKey, useCss, sizeTick])

  if (useCss) {
    const e = pixelateEnvelope(progress)
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none', background: palette[0], opacity: e }}
      />
    )
  }
  return (
    <div
      ref={hostRef}
      className={className}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }}
    />
  )
}
