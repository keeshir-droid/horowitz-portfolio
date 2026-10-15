/**
 * Shot A art: the street at night. Every plane is drawn in world centimetres (y down, the bedroom floor is y = 0,
 * the street is y = +330) and placed at a depth Z by the camera (scene.ts). The bedroom window in WALL is a real
 * hole: the room behind it is the actual interior planes, so the push goes through the window without a cut.
 */
import { f, rng } from './util'

/** The lit window's hole in the facade (world cm). */
export const HOLE = { x0: -70, x1: 70, y0: -215, y1: -85 }

// ───────────────────────── far city (Z = 60000) ─────────────────────────
export function citySvg(): string {
  const r = rng(31)
  let sil = ''
  let lit = ''
  const base = 1500
  for (let x = -95000; x < 95000; ) {
    const w = 1400 + r() * 2600
    const down = Math.abs(x + 16000) < 9000 // a small downtown cluster on the moon side
    const h = (down ? 5200 + r() * 9000 : 1600 + r() * 4200) * (r() < 0.15 ? 0.5 : 1)
    const top = base - h
    if (r() < 0.25) sil += `M${f(x)} ${base}V${f(top + 500)}L${f(x + w / 2)} ${f(top)}L${f(x + w)} ${f(top + 500)}V${base}Z`
    else sil += `M${f(x)} ${base}V${f(top)}H${f(x + w)}V${base}Z`
    const nl = Math.floor(r() * (down ? 9 : 4))
    for (let i = 0; i < nl; i++) {
      const lx = x + 250 + r() * (w - 500)
      const ly = top + 500 + r() * (h - 900)
      lit += `M${f(lx)} ${f(ly)}h220v260h-220Z`
    }
    x += w + (r() < 0.3 ? r() * 2500 : 0)
  }
  return `
  <path d="${sil}" fill="#161b40"/>
  <path d="${lit}" fill="#f2c46e" opacity=".5"/>
  <path d="M-15600 ${base}V-14200h500V${base}Z M-15800 -9000h900v400h-900Z" fill="#161b40"/>`
}

// ───────────────────────── hills (Z = 15000) ─────────────────────────
export function hillsSvg(): string {
  const r = rng(12)
  let d = 'M-32000 6000V100'
  for (let x = -32000; x <= 32000; x += 2000) {
    const y = -150 + r() * 380
    d += `Q${f(x - 1000)} ${f(y - 320)} ${f(x)} ${f(y)}`
  }
  d += 'V6000Z'
  let trees = ''
  for (let x = -32000; x <= 32000; x += 260 + r() * 300) {
    const s = 80 + r() * 120
    trees += `M${f(x)} 260l${f(s * 0.6)} -${f(s * 2.4)}l${f(s * 0.6)} ${f(s * 2.4)}Z`
  }
  return `<path d="${d}" fill="#0f1433"/><path d="${trees}" fill="#0b0f29"/>
  <path d="M-32000 520H32000V6000H-32000Z" fill="#0b0f29"/>`
}

// ───────────────────────── neighbours (Z = 1200) ─────────────────────────
function smallWin(x: number, y: number, w: number, h: number, glint: number): string {
  return `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="#2a2c50"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0b0f26"/>
  <path d="M${x + w * 0.2} ${y + h}L${x + w * 0.55} ${y}h${w * 0.14}L${x + w * 0.34} ${y + h}Z" fill="#9fb0ff" opacity="${glint}"/>
  <path d="M${x + w / 2} ${y}v${h}" stroke="#2a2c50" stroke-width="6"/>`
}
export function neighboursSvg(): string {
  let s = ''
  // left: two pitched-roof houses
  const houses = [
    [-4200, -2550, -330, -640],
    [-2500, -1050, -300, -590],
  ] as const
  for (const [x0, x1, eave, ridge] of houses) {
    const mid = (x0 + x1) / 2
    s += `<rect x="${x0}" y="${eave}" width="${x1 - x0}" height="${2400}" fill="#1a1c3c"/>
    <path d="M${x0 - 60} ${eave + 10}L${mid} ${ridge}L${x1 + 60} ${eave + 10}Z" fill="#11132e"/>
    <path d="M${x0 - 60} ${eave + 10}L${mid} ${ridge}L${x1 + 60} ${eave + 10}" fill="none" stroke="#2c3062" stroke-width="14"/>`
    for (const fx of [0.22, 0.62]) for (const fy of [eave + 90, eave + 420]) s += smallWin(x0 + (x1 - x0) * fx, fy, 160, 170, 0.06)
  }
  // chimney + an old TV aerial
  s += `<rect x="-3500" y="-610" width="70" height="170" fill="#11132e"/><rect x="-3515" y="-625" width="100" height="22" fill="#1d2048"/>
  <g stroke="#0a0c22" stroke-width="7" fill="none"><path d="M-1780 -560V-900M-1900 -860H-1660M-1880 -820H-1680M-1860 -780H-1700M-1840 -740H-1720"/></g>`
  // right: a taller block with a water tank
  s += `<rect x="1150" y="-960" width="2900" height="3400" fill="#171a38"/>
  <rect x="1130" y="-990" width="2940" height="40" fill="#22264c"/>
  <g fill="#0f1230"><rect x="1700" y="-1180" width="300" height="190" rx="20"/></g>
  <g stroke="#0f1230" stroke-width="16"><path d="M1730 -990V-940M1970 -990V-940M1730 -990L1970 -940"/></g>
  <path d="M1700 -1180h300" stroke="#2c3062" stroke-width="10"/>`
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) s += smallWin(1300 + i * 520, -860 + j * 330, 170, 180, (i + j) % 3 === 0 ? 0.08 : 0.04)
  return s
}

// ───────────────────────── the building (Z = 0) ─────────────────────────
type Variant = 'plain' | 'curtain' | 'blinds' | 'plant' | 'ac'
function darkWin(cx: number, y0: number, v: Variant, seed: number): string {
  const r = rng(seed)
  const x0 = cx - 70
  const w = 140
  const h = 130
  let s = `<rect x="${x0 - 12}" y="${y0 - 26}" width="${w + 24}" height="16" fill="#3b3456"/>
  <rect x="${x0 - 8}" y="${y0 - 8}" width="${w + 16}" height="${h + 16}" fill="#6b6488"/>
  <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#opx-glass)"/>`
  if (v === 'curtain') {
    const c = r() < 0.5 ? '#2a2550' : '#352545'
    s += `<path d="M${x0} ${y0}h${44 + r() * 10}q-12 ${h * 0.5} 6 ${h}H${x0}Z" fill="${c}"/>
    <path d="M${x0 + w} ${y0}h-${46 + r() * 10}q14 ${h * 0.5} -4 ${h}H${x0 + w}Z" fill="${c}"/>`
  } else if (v === 'blinds') {
    let b = ''
    for (let yy = y0 + 6; yy < y0 + h * 0.7; yy += 9) b += `M${x0} ${yy}h${w}`
    s += `<path d="${b}" stroke="#262a52" stroke-width="5"/>`
  } else if (v === 'plant') {
    s += `<g fill="#14202a"><ellipse cx="${x0 + 30}" cy="${y0 + h - 30}" rx="22" ry="26"/><ellipse cx="${x0 + 46}" cy="${y0 + h - 44}" rx="14" ry="20"/>
    <rect x="${x0 + 18}" y="${y0 + h - 16}" width="26" height="16"/></g>`
  }
  s += `<path d="M${x0 + 16} ${y0 + h}L${x0 + 64} ${y0}h20L${x0 + 36} ${y0 + h}Z M${x0 + 92} ${y0 + h}L${x0 + 118} ${y0}h8L${x0 + 100} ${y0 + h}Z" fill="#c8d2ff" opacity=".07"/>
  <path d="M${cx} ${y0}V${y0 + h}M${x0} ${y0 + 46}H${x0 + w}" stroke="#6b6488" stroke-width="5"/>
  <rect x="${x0 - 14}" y="${y0 + h + 6}" width="${w + 28}" height="11" fill="#58507a"/>
  <rect x="${x0 - 14}" y="${y0 + h + 6}" width="${w + 28}" height="3" fill="#857eaa"/>
  <rect x="${x0 - 14}" y="${y0 + h + 17}" width="${w + 28}" height="5" fill="#000" opacity=".25"/>`
  if (v === 'ac') {
    const ax = cx - 36 + (r() - 0.5) * 30
    s += `<rect x="${ax}" y="${y0 + h + 24}" width="72" height="44" rx="3" fill="#4e4a68"/>
    <rect x="${ax}" y="${y0 + h + 24}" width="72" height="5" fill="#6d6890"/>
    <path d="M${ax + 8} ${y0 + h + 36}h56M${ax + 8} ${y0 + h + 44}h56M${ax + 8} ${y0 + h + 52}h56M${ax + 8} ${y0 + h + 60}h56" stroke="#38344f" stroke-width="3"/>
    <path d="M${ax + 66} ${y0 + h + 68}q4 30 -10 60" stroke="#2a2640" stroke-width="2" fill="none"/>`
  }
  return s
}

export function wallSvg(): string {
  const { x0, x1, y0, y1 } = HOLE
  const W0 = -860
  const W1 = 860
  const top = -660
  const bot = 700
  let s = `<path fill-rule="evenodd" d="M${W0} ${top}H${W1}V${bot}H${W0}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="url(#opx-facade)"/>
  <path fill-rule="evenodd" d="M${W0} ${top}H${W1}V${bot}H${W0}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="url(#opx-brick)"/>
  <path fill-rule="evenodd" d="M${W0} ${top}H${W1}V${bot}H${W0}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="url(#opx-moonwash)"/>
  <rect x="${W0}" y="${top}" width="22" height="${bot - top}" fill="#5a5280" opacity=".55"/>
  <rect x="${W1 - 30}" y="${top}" width="30" height="${bot - top}" fill="#000" opacity=".25"/>
  <!-- parapet, cornice with dentils, floor bands -->
  <rect x="${W0 - 10}" y="${top - 44}" width="${W1 - W0 + 20}" height="44" fill="#2e2848"/>
  <rect x="${W0 - 26}" y="${top - 6}" width="${W1 - W0 + 52}" height="22" fill="#4f4770"/>
  <rect x="${W0 - 26}" y="${top - 6}" width="${W1 - W0 + 52}" height="4" fill="#7a72a0"/>
  <rect x="${W0 - 26}" y="${top + 16}" width="${W1 - W0 + 52}" height="8" fill="#000" opacity=".3"/>
  <rect x="${W0 - 12}" y="-300" width="${W1 - W0 + 24}" height="14" fill="#453e64"/><rect x="${W0 - 12}" y="-300" width="${W1 - W0 + 24}" height="3" fill="#6c6492"/>
  <rect x="${W0 - 12}" y="22" width="${W1 - W0 + 24}" height="14" fill="#453e64"/><rect x="${W0 - 12}" y="22" width="${W1 - W0 + 24}" height="3" fill="#6c6492"/>`
  let dent = ''
  for (let x = W0; x < W1; x += 30) dent += `M${x} ${top + 24}h14v10h-14Z`
  s += `<path d="${dent}" fill="#3a3358"/>`
  // roof clutter: TV aerial and a satellite dish (2000s)
  s += `<g stroke="#120f22" stroke-width="5" fill="none"><path d="M-470 ${top - 44}V-860M-560 -840H-380M-545 -810H-395M-530 -780H-410"/></g>
  <g fill="#1a1630"><path d="M560 ${top - 44}v-40h14v40Z"/><ellipse cx="548" cy="-760" rx="40" ry="52" transform="rotate(-25 548 -760)"/></g>
  <ellipse cx="552" cy="-760" rx="30" ry="42" transform="rotate(-25 552 -760)" fill="#2d2850"/>
  <path d="M548 -760l34 -14" stroke="#120f22" stroke-width="4"/>`
  // drainpipe
  s += `<rect x="-780" y="${top}" width="12" height="${bot - top}" fill="#251f3c"/><rect x="-780" y="${top}" width="3" height="${bot - top}" fill="#4c4570"/>`
  for (let y = top + 80; y < 330; y += 160) s += `<rect x="-786" y="${y}" width="24" height="7" fill="#1c172f"/>`

  // windows: three floors, five columns. Ours is floor 2, column 0 (the hole).
  const cols = [-600, -300, 0, 300, 600]
  const v3: Variant[] = ['blinds', 'plain', 'curtain', 'ac', 'plant']
  const v2: Variant[] = ['ac', 'curtain', 'plain', 'plain', 'blinds']
  const v1: Variant[] = ['plain', 'plain', 'curtain', 'ac', 'plain']
  cols.forEach((cx, i) => {
    s += darkWin(cx, -515, v3[i], 100 + i)
    if (cx !== 0) s += darkWin(cx, y0, v2[i], 200 + i)
    if (cx !== -300) s += darkWin(cx, 108, v1[i], 300 + i)
  })
  // front door (ground floor, column -300)
  s += `<rect x="-372" y="70" width="144" height="262" fill="#4a4268"/>
  <rect x="-360" y="82" width="120" height="250" fill="#251c33"/>
  <rect x="-360" y="82" width="120" height="44" fill="#141a38"/><path d="M-300 82v44" stroke="#4a4268" stroke-width="5"/>
  <g fill="none" stroke="#33283f" stroke-width="5"><rect x="-348" y="140" width="40" height="70"/><rect x="-292" y="140" width="40" height="70"/><rect x="-348" y="226" width="40" height="88"/><rect x="-292" y="226" width="40" height="88"/></g>
  <circle cx="-252" cy="232" r="5" fill="#b49a5c"/>
  <rect x="-392" y="312" width="184" height="20" fill="#3c355a"/><rect x="-392" y="312" width="184" height="3" fill="#6c6492"/>
  <rect x="-396" y="50" width="192" height="20" fill="#3b3456"/>`

  // ── the lit window ──
  // warm spill on the bricks, then the frame
  s += `<path data-k="spill" fill-rule="evenodd" d="M-380 -530H380V230H-380Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="url(#opx-spill)"/>
  <rect x="${x0 - 14}" y="${y0 - 30}" width="${x1 - x0 + 28}" height="16" fill="#5a4652"/>
  <path fill-rule="evenodd" d="M${x0 - 10} ${y0 - 10}H${x1 + 10}V${y1 + 4}H${x0 - 10}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="#e9d2a8"/>
  <path fill-rule="evenodd" d="M${x0 - 10} ${y0 - 10}H${x1 + 10}V${y1 + 4}H${x0 - 10}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="none" stroke="#ffdca0" stroke-width="1.5"/>
  <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="28" fill="#ffd38a" opacity=".42"/>
  <rect x="${x0}" y="${y0 + 28}" width="${x1 - x0}" height="6" fill="#e9d2a8"/>
  <rect x="${x0}" y="${y0 + 34}" width="${x1 - x0}" height="2" fill="#a88a64"/>
  <rect data-k="bloom" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#opx-bloom)" opacity=".5"/>
  <rect x="${x0 - 24}" y="${y1 + 4}" width="${x1 - x0 + 48}" height="12" fill="#e2c999"/>
  <rect x="${x0 - 24}" y="${y1 + 4}" width="${x1 - x0 + 48}" height="3" fill="#fff0c8"/>
  <rect x="${x0 - 24}" y="${y1 + 16}" width="${x1 - x0 + 48}" height="6" fill="#000" opacity=".3"/>`
  return s
}

// ───────────────────────── flower box (Z = -25) ─────────────────────────
export function flowerboxSvg(): string {
  const r = rng(9)
  let back = ''
  let leaves = ''
  let lit = ''
  let flowers = ''
  let hi = ''
  for (let i = 0; i < 70; i++) {
    const x = -80 + r() * 106
    const y = -84 - r() * r() * 26
    const s = 2.2 + r() * 2.6
    const a = (r() - 0.5) * 80
    const leaf = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.62)}" transform="rotate(${f(a)} ${f(x)} ${f(y)})"/>`
    if (i < 26) back += leaf
    else leaves += leaf
    if (i % 3 === 0) lit += `<ellipse cx="${f(x - 0.6)}" cy="${f(y - 0.8)}" rx="${f(s * 0.55)}" ry="${f(s * 0.3)}" transform="rotate(${f(a)} ${f(x)} ${f(y)})"/>`
  }
  for (let i = 0; i < 9; i++) {
    const cx = -72 + i * 11 + r() * 5
    const cy = -104 - r() * 12
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2
      flowers += `<circle cx="${f(cx + Math.cos(a) * 2.1)}" cy="${f(cy + Math.sin(a) * 1.7)}" r="1.5"/>`
    }
    hi += `<circle cx="${f(cx - 0.6)}" cy="${f(cy - 0.8)}" r="1"/>`
    back += `<path d="M${f(cx)} ${f(cy + 2)}q1 6 -1 12" stroke="#2c4a30" stroke-width=".8" fill="none"/>`
  }
  return `<g fill="#1f3a2a">${back}</g>
  <rect x="-86" y="-84" width="116" height="22" rx="2" fill="#6e3a2b"/>
  <rect x="-86" y="-84" width="116" height="3" fill="#b06a44"/>
  <path d="M-86 -76h116M-86 -70h116" stroke="#5a2e22" stroke-width=".8"/>
  <rect x="-86" y="-64" width="116" height="3" fill="#000" opacity=".3"/>
  <g fill="#2f5638">${leaves}</g>
  <g fill="#7fa45a" opacity=".75">${lit}</g>
  <g fill="#d8433a">${flowers}</g>
  <g fill="#ffb59a" opacity=".85">${hi}</g>
  <path d="M-62 -62q-5 14 1 26q2 4 -1 8M-30 -62q4 12 -2 22M8 -62q-3 9 2 18q1 3 -1 5" stroke="#2f5034" stroke-width="1.6" fill="none"/>
  <g fill="#3d6a40"><ellipse cx="-61" cy="-44" rx="2.4" ry="1.4"/><ellipse cx="-31" cy="-46" rx="2.2" ry="1.3"/><ellipse cx="9" cy="-48" rx="2.2" ry="1.3"/><ellipse cx="-60" cy="-30" rx="2" ry="1.2"/></g>`
}

// ───────────────────────── street level (Z = -200) ─────────────────────────
export function groundSvg(): string {
  const r = rng(4)
  let dark = ''
  let lite = ''
  for (let x = -5200; x < 5200; x += 38 + r() * 18) {
    if (x > -440 && x < -160) continue // gate in the hedge
    const rr = 36 + r() * 26
    const y = 238 - r() * 18
    dark += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}"/>`
    if (r() < 0.8) lite += `<circle cx="${f(x - rr * 0.25)}" cy="${f(y - rr * 0.3)}" r="${f(rr * 0.55)}"/>`
  }
  let slabs = ''
  for (let x = -5200; x < 5200; x += 120) slabs += `M${x} 345L${x - 30} 560`
  let dashes = ''
  for (let x = -6000; x < 6000; x += 520) dashes += `M${x} 1150h260`
  return `<rect x="-6000" y="250" width="12000" height="80" fill="#0e1d1f"/>
  <g fill="#0d1d20">${dark}</g><g fill="#1b3532" opacity=".9">${lite}</g>
  <rect x="-6000" y="290" width="5560" height="58" fill="#251e36"/><rect x="-160" y="290" width="6160" height="58" fill="#251e36"/>
  <rect x="-6000" y="284" width="5560" height="9" fill="#3c3356"/><rect x="-160" y="284" width="6160" height="9" fill="#3c3356"/>
  <rect x="-470" y="250" width="34" height="100" fill="#3c3356"/><rect x="-170" y="250" width="34" height="100" fill="#3c3356"/>
  <rect x="-6000" y="345" width="12000" height="215" fill="#1a192c"/>
  <path d="${slabs}" stroke="#121122" stroke-width="3"/>
  <rect x="-6000" y="560" width="12000" height="16" fill="#2c2a44"/>
  <rect x="-6000" y="576" width="12000" height="5000" fill="#100f22"/>
  <path d="${dashes}" stroke="#4a4860" stroke-width="12"/>
  <ellipse cx="-640" cy="470" rx="360" ry="80" fill="url(#opx-pool)"/>`
}

// ───────────────────────── street lamp (Z = -350) ─────────────────────────
export function streetlampSvg(): string {
  return `<path d="M-580 -452L-800 360H-330Z" fill="url(#opx-cone)" opacity=".32"/>
  <circle cx="-580" cy="-456" r="150" fill="url(#opx-lamphalo)"/>
  <rect x="-690" y="-430" width="12" height="800" fill="#0c0b1a"/>
  <rect x="-700" y="330" width="32" height="40" fill="#0c0b1a"/>
  <path d="M-684 -430q0 -50 70 -46h34" stroke="#0c0b1a" stroke-width="9" fill="none"/>
  <path d="M-612 -478h64l-10 18h-44Z" fill="#14132a"/>
  <path d="M-604 -460h48l-6 7h-36Z" fill="#eef4ff"/>`
}

// ───────────────────────── tree (Z = -700) ─────────────────────────
export function treeSvg(): string {
  const r = rng(21)
  const blobs: [number, number, number][] = []
  const clusters = [
    [1250, -420, 230],
    [980, -640, 230],
    [700, -820, 200],
    [470, -930, 150],
    [1450, -700, 260],
    [1250, -920, 250],
    [930, -1060, 210],
    [1580, -380, 220],
  ]
  for (const [cx, cy, rad] of clusters) {
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * rad * 0.85
      blobs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, rad * (0.16 + r() * 0.22)])
    }
  }
  const dark = blobs.map(([x, y, s]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}"/>`).join('')
  const mid = blobs.map(([x, y, s]) => `<circle cx="${f(x - s * 0.18)}" cy="${f(y - s * 0.22)}" r="${f(s * 0.72)}"/>`).join('')
  const lit = blobs
    .filter((_, i) => i % 2 === 0)
    .map(([x, y, s]) => `<circle cx="${f(x - s * 0.34)}" cy="${f(y - s * 0.4)}" r="${f(s * 0.36)}"/>`)
    .join('')
  return `<g transform="translate(-160 170)"><path d="M1400 900C1360 500 1290 100 1220 -200C1180 -380 1080 -560 980 -640M1250 -100C1340 -300 1420 -500 1450 -700M1150 -420C960 -620 760 -800 470 -930M1220 -200C1360 -260 1480 -320 1580 -380"
    stroke="#0c1030" stroke-width="44" stroke-linecap="round" fill="none"/>
  <g fill="#070a1d">${dark}</g><g fill="#0d1230">${mid}</g><g fill="#1f2853" opacity=".6">${lit}</g></g>`
}

// ───────────────────────── wires (Z = -1000) ─────────────────────────
export function wiresSvg(): string {
  return `<g fill="none" stroke="#04050e" stroke-width="2.6"><path d="M-4200 -640Q0 -380 4200 -640"/><path d="M-4200 -600Q0 -340 4200 -600"/></g>
  <path d="M-362 -510c2 -9 10 -14 18 -12c5 -6 12 -6 14 -1c-4 1 -6 3 -6 6c4 6 2 13 -8 14c-6 0 -12 -2 -16 -6l-10 2Z" fill="#04050e"/>`
}

export const EXTERIOR_DEFS = `
  <linearGradient id="opx-facade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3d3458"/><stop offset=".55" stop-color="#30294a"/><stop offset="1" stop-color="#211c36"/>
  </linearGradient>
  <linearGradient id="opx-moonwash" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9aa4ff" stop-opacity=".12"/><stop offset=".6" stop-color="#9aa4ff" stop-opacity="0"/>
  </linearGradient>
  <pattern id="opx-brick" width="32" height="16" patternUnits="userSpaceOnUse">
    <path d="M0 .5H32M0 8.5H32M.5 0V8M16.5 8V16" stroke="#150f24" stroke-width="1" opacity=".55" fill="none"/>
  </pattern>
  <linearGradient id="opx-glass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1a2350"/><stop offset="1" stop-color="#0a0e26"/>
  </linearGradient>
  <radialGradient id="opx-spill">
    <stop offset="0" stop-color="#ffb860" stop-opacity=".55"/><stop offset=".35" stop-color="#ff9a50" stop-opacity=".2"/>
    <stop offset="1" stop-color="#ff9a50" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="opx-bloom" cx=".45" cy=".55" r=".7">
    <stop offset="0" stop-color="#ffe1a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffb35a" stop-opacity=".55"/>
  </radialGradient>
  <linearGradient id="opx-cone" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9e6ff" stop-opacity=".35"/><stop offset="1" stop-color="#d9e6ff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="opx-pool"><stop offset="0" stop-color="#cfe0ff" stop-opacity=".16"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-lamphalo">
    <stop offset="0" stop-color="#eef4ff" stop-opacity=".7"/><stop offset=".25" stop-color="#cfdcff" stop-opacity=".25"/>
    <stop offset="1" stop-color="#cfdcff" stop-opacity="0"/>
  </radialGradient>`
