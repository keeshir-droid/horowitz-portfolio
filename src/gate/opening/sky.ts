/**
 * The night sky, drawn in viewport pixels (it is "at infinity", so a camera that only translates never moves it).
 * Rebuilt on resize. Twinkling stars sit in three groups (data-k="tw0..2") whose opacity the frame loop drives.
 */
import { clamp01, f, lerp, rng } from './util'

export function skySvg(W: number, H: number, q: number): string {
  const r = rng(77)
  const stars: string[] = ['', '', '', '']
  const n = Math.round(clamp01((W * H) / (1280 * 720)) * 120 + 90)
  for (let i = 0; i < n; i++) {
    const x = r() * W
    const y = Math.pow(r(), 1.5) * H * 0.82
    const s = 0.45 + r() * r() * 1.5
    const o = 0.3 + r() * 0.6
    const g = i % 7 === 0 ? 1 + (i % 3) : 0
    stars[g] += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" opacity="${f(o)}"/>`
    if (s > 1.45) {
      const L = s * 4.5
      stars[g] += `<path d="M${f(x - L)} ${f(y)}H${f(x + L)}M${f(x)} ${f(y - L)}V${f(y + L)}" stroke="#dfe6ff" stroke-width=".6" opacity="${f(o * 0.6)}"/>`
    }
  }
  const mx = W * lerp(0.3, 0.2, q)
  const my = H * lerp(0.13, 0.19, q)
  const R = Math.max(16, Math.min(46, Math.min(W, H) * 0.052))
  const cr = (dx: number, dy: number, rr: number, o: number) =>
    `<circle cx="${f(mx + dx * R)}" cy="${f(my + dy * R)}" r="${f(rr * R)}" fill="#d9cfae" opacity="${o}"/>`
  // thin cloud wisps, lit on their moon side
  const cloud = (cx: number, cy: number, w: number, h: number, o: number) => `
    <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w)}" ry="${f(h * 1.6)}" fill="url(#opx-cloud)" opacity="${o}"/>
    <ellipse cx="${f(cx + w * 0.25)}" cy="${f(cy + h * 0.6)}" rx="${f(w * 0.6)}" ry="${f(h)}" fill="url(#opx-cloud)" opacity="${f(o * 0.8)}"/>
    <ellipse cx="${f(cx - w * 0.15)}" cy="${f(cy - h * 0.5)}" rx="${f(w * 0.55)}" ry="${f(h * 0.7)}" fill="url(#opx-cloudlit)" opacity="${f(o * 0.7)}"/>`
  return `
  <rect width="${W}" height="${H}" fill="url(#opx-sky)"/>
  <rect width="${W}" height="${H}" fill="url(#opx-skyglow)"/>
  <g fill="#e9eeff">${stars[0]}</g>
  <g fill="#fff6dc" data-k="tw0">${stars[1]}</g>
  <g fill="#e9eeff" data-k="tw1">${stars[2]}</g>
  <g fill="#dfe8ff" data-k="tw2">${stars[3]}</g>
  ${cloud(W * 0.62, H * 0.16, W * 0.2, H * 0.016, 0.55)}
  ${cloud(W * 0.14, H * 0.33, W * 0.17, H * 0.012, 0.45)}
  ${cloud(W * 0.86, H * 0.3, W * 0.14, H * 0.011, 0.4)}
  <circle cx="${f(mx)}" cy="${f(my)}" r="${f(R * 6)}" fill="url(#opx-halo)" opacity=".55"/>
  <circle cx="${f(mx)}" cy="${f(my)}" r="${f(R * 2.1)}" fill="url(#opx-halo)" opacity=".7"/>
  <circle cx="${f(mx)}" cy="${f(my)}" r="${f(R)}" fill="url(#opx-moon)"/>
  ${cr(-0.32, -0.25, 0.22, 0.55)}${cr(0.28, 0.18, 0.28, 0.45)}${cr(-0.1, 0.42, 0.14, 0.5)}${cr(0.42, -0.36, 0.1, 0.5)}${cr(-0.48, 0.18, 0.1, 0.4)}
  <ellipse cx="${f(mx + W * 0.03)}" cy="${f(my + R * 0.6)}" rx="${f(W * 0.1)}" ry="${f(H * 0.014)}" fill="url(#opx-cloudlit)" opacity=".6"/>`
}

export const SKY_DEFS = `
  <linearGradient id="opx-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#060918"/><stop offset=".42" stop-color="#0d1434"/>
    <stop offset=".72" stop-color="#1b1f4c"/><stop offset="1" stop-color="#2c2556"/>
  </linearGradient>
  <radialGradient id="opx-skyglow" cx=".5" cy="1.05" r=".75">
    <stop offset="0" stop-color="#5a3f72" stop-opacity=".55"/><stop offset="1" stop-color="#5a3f72" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="opx-halo">
    <stop offset="0" stop-color="#fdf3d2" stop-opacity=".6"/><stop offset=".35" stop-color="#b9b8e6" stop-opacity=".22"/>
    <stop offset="1" stop-color="#8f8fd0" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="opx-cloud"><stop offset="0" stop-color="#2c3168" stop-opacity=".9"/><stop offset="1" stop-color="#2c3168" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-cloudlit"><stop offset="0" stop-color="#6a6fae" stop-opacity=".8"/><stop offset="1" stop-color="#6a6fae" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-moon" cx=".4" cy=".38" r=".7">
    <stop offset="0" stop-color="#fffbea"/><stop offset=".7" stop-color="#efe6c6"/><stop offset="1" stop-color="#d6caa2"/>
  </radialGradient>`
