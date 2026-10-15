/**
 * Shot B art: the bedroom, around 2007, at night. Lit by a bedside lamp (warm, left) and a CRT (cool, centre).
 * Planes in world cm (floor y = 0), placed at depths by scene.ts. Dynamic bits carry data-k attributes.
 */
import { HOLE } from './exterior'
import { f, rng } from './util'

const star5 = (x: number, y: number, r: number, rot = 0): string => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    d += `${i ? 'L' : 'M'}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`
  }
  return d + 'Z'
}

// ───────────────────────── back wall, ceiling, floor (Z = 520) ─────────────────────────
function rocketPoster(): string {
  // 92 × 118 poster at the origin, drawn in its own units
  return `<g clip-path="url(#opx-pc1)"><rect width="92" height="118" fill="#1d2550"/>
  <rect width="92" height="118" fill="url(#opx-postersky)"/>
  <g fill="#fff" opacity=".8"><circle cx="12" cy="14" r="1"/><circle cx="74" cy="22" r="1.3"/><circle cx="30" cy="40" r=".8"/><circle cx="80" cy="60" r="1"/><circle cx="16" cy="78" r="1.2"/><circle cx="58" cy="10" r=".9"/></g>
  <circle cx="80" cy="104" r="26" fill="#e07a4f"/><path d="M58 96q22 -6 44 6" stroke="#b9553a" stroke-width="3" fill="none"/>
  <g transform="rotate(28 46 58)">
    <path d="M46 18c11 10 15 26 13 46H33c-2 -20 2 -36 13 -46Z" fill="#f3efe6"/>
    <path d="M46 18c6 6 9 12 11 20H35c2 -8 5 -14 11 -20Z" fill="#d94a3d"/>
    <circle cx="46" cy="47" r="6.5" fill="#7cc6e8" stroke="#d94a3d" stroke-width="2.5"/>
    <path d="M33 56l-9 14 10 -2ZM59 56l9 14 -10 -2Z" fill="#d94a3d"/>
    <path d="M38 64h16l-3 6h-10Z" fill="#9a9aa8"/>
    <path d="M40 70q6 26 6 26q0 0 6 -26Z" fill="#ffb648"/><path d="M43 70q3 14 3 14q0 0 3 -14Z" fill="#fff2b0"/>
  </g>
  <rect x="2" y="2" width="88" height="114" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35"/></g>`
}
function dinoPoster(): string {
  return `<g clip-path="url(#opx-pc2)"><rect width="90" height="112" fill="#f0b45a"/>
  <rect width="90" height="112" fill="url(#opx-dinosky)"/>
  <circle cx="62" cy="44" r="18" fill="#ffe08a"/>
  <path d="M0 84l18 -26 10 10 16 -22 20 26 26 -14V112H0Z" fill="#c4683c"/>
  <path d="M58 62l4 -10 5 9" fill="#c4683c"/><path d="M60 50q-2 -8 4 -14" stroke="#8a4a3a" stroke-width="2.5" fill="none" opacity=".7"/>
  <path d="M10 98c6 -12 18 -16 26 -14c4 -18 8 -34 18 -40c6 -3 10 0 8 4c-5 -1 -8 2 -10 8c-3 12 -2 26 2 32c10 2 22 6 30 12H10Z" fill="#2f5d3a"/>
  <circle cx="58" cy="46" r="1.1" fill="#f0e6c8"/>
  <path d="M14 98v8h5v-8M28 98v8h5v-8M44 98v8h5v-8M58 98v8h5v-8" fill="#2f5d3a"/>
  <path d="M74 112V76q2 -6 4 0V112Z" fill="#5a3a22"/><path d="M76 76c-8 -6 -16 -4 -20 2c6 -2 12 -2 20 -2c-6 -6 -4 -14 4 -16c-2 6 -2 10 -4 16c8 -6 14 -4 16 2c-6 -2 -10 -2 -16 -2Z" fill="#3c6a3a"/>
  <rect x="2" y="2" width="86" height="108" fill="none" stroke="#fff6dc" stroke-width="1.2" opacity=".5"/></g>`
}
function spacePoster(): string {
  return `<g clip-path="url(#opx-pc3)"><rect width="90" height="106" fill="#140f2e"/>
  <g fill="#fff" opacity=".7"><circle cx="10" cy="10" r=".9"/><circle cx="70" cy="16" r="1.2"/><circle cx="40" cy="28" r=".7"/><circle cx="82" cy="70" r=".9"/><circle cx="8" cy="88" r="1.1"/><circle cx="50" cy="96" r=".8"/></g>
  <circle cx="16" cy="54" r="11" fill="#ffcc4d"/><circle cx="16" cy="54" r="16" fill="#ffcc4d" opacity=".2"/>
  <circle cx="36" cy="54" r="3" fill="#b8a99a"/><circle cx="46" cy="54" r="4" fill="#e8b46a"/><circle cx="58" cy="54" r="4.4" fill="#4a90d9"/>
  <circle cx="58.6" cy="53" r="1.8" fill="#5cb85c"/><circle cx="68" cy="54" r="3.2" fill="#d9603b"/>
  <circle cx="74" cy="30" r="7" fill="#e3c27a"/><ellipse cx="74" cy="30" rx="13" ry="3.4" fill="none" stroke="#c9a65e" stroke-width="1.6" transform="rotate(-18 74 30)"/>
  <path d="M60 82l22 -12" stroke="#9fd8ff" stroke-width="1.6" opacity=".8"/><circle cx="60" cy="82" r="2.2" fill="#e8f6ff"/>
  <path d="M8 54q42 -10 80 0" stroke="#fff" stroke-width=".5" fill="none" opacity=".25"/>
  <rect x="2" y="2" width="86" height="102" fill="none" stroke="#fff" stroke-width="1" opacity=".3"/></g>`
}
function crayonDrawing(): string {
  return `<rect width="48" height="38" fill="#f4efe2"/>
  <circle cx="40" cy="8" r="5" fill="none" stroke="#f2b51d" stroke-width="1.6"/><path d="M40 0v-2M47 8h2M45 2l2 -2M33 2l-1 -2" stroke="#f2b51d" stroke-width="1.2"/>
  <path d="M8 30V18l9 -8 9 8v12Z" fill="none" stroke="#d9433a" stroke-width="1.6"/><rect x="14" y="22" width="5" height="8" fill="#3a6fd9"/>
  <path d="M30 31v-7M30 24l-2 -3h4ZM36 31v-6M36 25l-2 -3h4Z" stroke="#2b8a3e" stroke-width="1.3"/>
  <circle cx="33" cy="17" r="2" fill="none" stroke="#333" stroke-width="1"/><path d="M33 19v6m-3 -4h6m-6 7l3 -3 3 3" stroke="#333" stroke-width="1" fill="none"/>
  <path d="M0 34q24 -3 48 0" stroke="#2b8a3e" stroke-width="2" fill="none"/>`
}
const tape = (x: number, y: number, rot: number) =>
  `<rect x="${x - 6}" y="${y - 2.5}" width="12" height="5" fill="#f3ead2" opacity=".75" transform="rotate(${rot} ${x} ${y})"/>`

export function backSvg(): string {
  const r = rng(52)
  let stars = ''
  for (let i = 0; i < 46; i++) {
    const y = -292 - Math.pow(r(), 1.6) * 560
    stars += star5(-900 + r() * 1800, y, 3.5 + r() * 4, r())
  }
  let planks = ''
  for (let xb = -7000; xb <= 7000; xb += 230) planks += `M${f(xb * 0.13)} 0L${xb} 1000`
  let seams = ''
  for (const [y, step] of [
    [26, 0.9],
    [70, 1.1],
    [140, 1.3],
    [260, 1.6],
  ] as const)
    for (let x = -1400 + r() * 200; x < 1400; x += 260 * step) seams += `M${f(x)} ${y}h${f(30 * step)}`
  // shelf contents (stand on y = -176)
  const books = ['#c0503e', '#2f6aa8', '#e0b04a', '#4c8a54', '#8a4fa0', '#d9733a', '#2f4e7a', '#b8443a']
  let bk = ''
  let bx = -604
  books.forEach((c, i) => {
    const w = 6 + (i % 3) * 2
    const h = 26 + ((i * 7) % 11)
    bk += `<rect x="${bx}" y="${-176 - h}" width="${w}" height="${h}" fill="${c}"/><rect x="${bx}" y="${-176 - h + 5}" width="${w}" height="2" fill="#f4e7c8" opacity=".5"/>`
    bx += w + 0.8
  })
  bk += `<rect x="${bx + 2}" y="-203" width="8" height="27" fill="#5a6f8a" transform="rotate(14 ${bx + 6} -176)"/>`
  return `
  <rect x="-1500" y="-1100" width="3000" height="830" fill="url(#opx-ceil)"/>
  <path d="${stars}" fill="#d8ffb0" opacity=".5"/>
  <path d="M40 -420a22 22 0 1 0 19 34a17 17 0 1 1 -19 -34Z" fill="#d8ffb0" opacity=".5"/>
  <rect x="-1500" y="-280" width="3000" height="280" fill="#36505c"/>
  <rect x="-1500" y="-280" width="3000" height="280" fill="url(#opx-paper)"/>
  <rect x="-1500" y="-288" width="3000" height="10" fill="#26333f"/>
  <rect x="-1500" y="-262" width="3000" height="12" fill="#56736c"/>
  <path d="${Array.from({ length: 150 }, (_, i) => `M${-1500 + i * 20 + 10} -259l4 3 -4 3 -4 -3Z`).join('')}" fill="#e7c47a" opacity=".55"/>
  <rect x="-1500" y="0" width="3000" height="1100" fill="url(#opx-floor)"/>
  <path d="${planks}" stroke="#2a190f" stroke-width="1.6" opacity=".7"/>
  <path d="${seams}" stroke="#2a190f" stroke-width="1.6" opacity=".6"/>
  <rect x="-1500" y="-13" width="3000" height="13" fill="#a8977a"/><rect x="-1500" y="-13" width="3000" height="2" fill="#cfc0a0"/>

  <!-- posters: rocket over the TV, a dinosaur, the solar system -->
  <g transform="translate(-36 -250) rotate(-2)">${rocketPoster()}${tape(4, 2, -20)}${tape(88, 2, 25)}</g>
  <g transform="translate(116 -240) rotate(3)">${dinoPoster()}${tape(45, 0, 5)}</g>
  <g transform="translate(268 -236) rotate(-1.5)">${spacePoster()}${tape(4, 2, -30)}${tape(86, 2, 30)}</g>
  <g transform="translate(-236 -210) rotate(-4)">${crayonDrawing()}${tape(24, 0, 0)}</g>
  <rect x="-150" y="-204" width="34" height="42" fill="#7a5a3a"/><rect x="-146" y="-200" width="26" height="34" fill="#e9c98a"/>
  <path d="M-146 -172l8 -12 6 7 5 -5 7 10v6h-26Z" fill="#6a8a5a"/><circle cx="-126" cy="-192" r="3" fill="#fff4c8"/>
  <!-- pennant + clock -->
  <path d="M-580 -246h-4v52h4ZM-580 -244l90 12 -90 12Z" fill="#c2453a"/><path d="M-580 -236l58 4 -58 4Z" fill="#f2c14e"/>
  <circle cx="430" cy="-206" r="19" fill="#e9e1cf" stroke="#c2453a" stroke-width="4"/>
  <path d="M430 -206l-9 -5M430 -206l3 -13" stroke="#2a2a2a" stroke-width="2.2" stroke-linecap="round"/><circle cx="430" cy="-206" r="1.6" fill="#2a2a2a"/>

  <!-- shelf above the bed: books, robot, a small trophy, globe, cube, piggy bank -->
  <rect x="-612" y="-177" width="320" height="7" fill="#7a5236"/><rect x="-612" y="-177" width="320" height="1.5" fill="#a87a50"/>
  <rect x="-612" y="-170" width="320" height="5" fill="#000" opacity=".25"/>
  <path d="M-590 -170v14l10 -14ZM-320 -170v14l-10 -14Z" fill="#5a3b26"/>
  ${bk}
  <g transform="translate(-512 -176)"><rect x="0" y="-22" width="18" height="16" rx="2" fill="#9aa3ad"/><rect x="3" y="-36" width="12" height="12" rx="2" fill="#b7bfc8"/>
    <circle cx="6.5" cy="-30" r="1.6" fill="#e34b4b"/><circle cx="11.5" cy="-30" r="1.6" fill="#e34b4b"/><path d="M9 -36v-5" stroke="#9aa3ad" stroke-width="1.2"/><circle cx="9" cy="-42" r="1.6" fill="#f2c14e"/>
    <rect x="3" y="-6" width="5" height="6" fill="#7d8690"/><rect x="10" y="-6" width="5" height="6" fill="#7d8690"/><rect x="5" y="-18" width="8" height="5" fill="#5c6670"/></g>
  <g transform="translate(-468 -176)"><rect x="-1" y="-5" width="18" height="5" fill="#5a3b26"/><rect x="5" y="-12" width="6" height="7" fill="#e3b33c"/>
    <path d="M1 -28h14c0 9 -3 15 -7 16c-4 -1 -7 -7 -7 -16Z" fill="#f2c94c"/><path d="M1 -26c-6 0 -6 7 1 8M15 -26c6 0 6 7 -1 8" stroke="#e3b33c" stroke-width="1.6" fill="none"/>
    <path d="M4 -26c0 6 1 9 3 11" stroke="#fff4c0" stroke-width="1.2" fill="none" opacity=".8"/></g>
  <g transform="translate(-424 -176)"><path d="M6 0h12l-2 -3h-8Z" fill="#5a3b26"/><path d="M12 -3v-4" stroke="#5a3b26" stroke-width="1.6"/>
    <circle cx="12" cy="-17" r="11" fill="#3b7fc4"/><path d="M5 -22c4 -2 6 2 9 0s4 4 1 6c-3 1 -6 -1 -8 1c-2 -2 -4 -4 -2 -7ZM15 -10c2 -2 5 -1 6 1c-2 2 -4 3 -6 1Z" fill="#5fae5a"/>
    <path d="M12 -30a13 13 0 0 1 0 26" stroke="#c9a65e" stroke-width="1.4" fill="none"/></g>
  <g transform="translate(-388 -176)"><rect x="0" y="-13" width="13" height="13" fill="#2a2a2a"/>
    <rect x="1" y="-12" width="3.4" height="3.4" fill="#e34b4b"/><rect x="4.8" y="-12" width="3.4" height="3.4" fill="#f2f2f2"/><rect x="8.6" y="-12" width="3.4" height="3.4" fill="#3b7fc4"/>
    <rect x="1" y="-8.2" width="3.4" height="3.4" fill="#f2c94c"/><rect x="4.8" y="-8.2" width="3.4" height="3.4" fill="#5fae5a"/><rect x="8.6" y="-8.2" width="3.4" height="3.4" fill="#f08a3a"/>
    <rect x="1" y="-4.4" width="3.4" height="3.4" fill="#3b7fc4"/><rect x="4.8" y="-4.4" width="3.4" height="3.4" fill="#e34b4b"/><rect x="8.6" y="-4.4" width="3.4" height="3.4" fill="#f2f2f2"/></g>
  <g transform="translate(-360 -176)"><ellipse cx="14" cy="-9" rx="14" ry="9" fill="#e99aa8"/><circle cx="26" cy="-10" r="4" fill="#e99aa8"/><ellipse cx="28" cy="-10" rx="1.8" ry="1.4" fill="#c9707f"/>
    <path d="M6 -16l2 -5 3 4" fill="#e99aa8"/><rect x="11" y="-18.5" width="6" height="1.4" fill="#8a4a55"/><rect x="4" y="-2" width="3" height="2" fill="#c9707f"/><rect x="20" y="-2" width="3" height="2" fill="#c9707f"/></g>

  <!-- light: lamp (warm, left), CRT (cool, centre), dark corners -->
  <circle data-k="lampwall" cx="-160" cy="-110" r="460" fill="url(#opx-lampglow)"/>
  <circle data-k="tvwall" cx="30" cy="-90" r="320" fill="url(#opx-tvglow)"/>
  <rect x="-1500" y="-1100" width="3000" height="2200" fill="url(#opx-roomdark)"/>`
}

// ───────────────────────── CRT on a low cabinet (Z = 495) ─────────────────────────
export function tvSvg(): string {
  return `
  <rect x="-74" y="-52" width="208" height="52" fill="#4e3424"/>
  <rect x="-78" y="-56" width="216" height="6" fill="#6e4a32"/><rect x="-78" y="-56" width="216" height="1.6" fill="#9a6c48"/>
  <rect x="-64" y="-42" width="188" height="32" fill="#1f140d"/>
  <rect x="-58" y="-28" width="82" height="16" rx="1.5" fill="#1d1d24"/><rect x="-54" y="-24" width="30" height="5" fill="#0c0c10"/>
  <path d="M-50 -22.5h3M-45 -22.5h2M-41 -22.5h3M-36 -22.5h3" stroke="#5aff7a" stroke-width="1.6"/>
  <rect x="34" y="-27" width="58" height="15" rx="2" fill="#8c8a95"/><rect x="34" y="-27" width="58" height="2" fill="#b0aebb"/>
  <rect x="40" y="-20" width="9" height="4" fill="#3a3a44"/><rect x="54" y="-20" width="9" height="4" fill="#3a3a44"/><circle cx="84" cy="-19" r="2" fill="#e34b4b"/>
  <g fill="#2a2a30"><rect x="100" y="-38" width="14" height="5"/><rect x="101" y="-33" width="14" height="5"/><rect x="100" y="-28" width="14" height="5"/></g>
  <path d="M44 -16c-2 14 -18 10 -26 18c-8 8 6 14 -10 20" stroke="#2a2a30" stroke-width="1.6" fill="none"/>
  <rect x="-70" y="0" width="8" height="2" fill="#3a271b"/><rect x="122" y="0" width="8" height="2" fill="#3a271b"/>

  <circle data-k="tvhalo" cx="30" cy="-88" r="90" fill="url(#opx-tvhalo)"/>
  <path d="M33 -122l-24 -48M33 -122l28 -52" stroke="#2a2a30" stroke-width="1.6"/><circle cx="9" cy="-170" r="2" fill="#4a4a54"/><circle cx="61" cy="-174" r="2" fill="#4a4a54"/>
  <path d="M24 -122a9 6 0 0 1 18 0Z" fill="#2a2a30"/>
  <rect x="-14" y="-124" width="94" height="72" rx="7" fill="url(#opx-tvbody)"/>
  <rect x="-14" y="-124" width="94" height="3" rx="1.5" fill="#55525e"/>
  <rect x="-8" y="-118" width="70" height="58" rx="6" fill="#141317"/>
  <g clip-path="url(#opx-tvclip)">
    <rect data-k="tvsky" x="-4" y="-114" width="62" height="50" fill="#5aa0e8"/>
    <circle data-k="tvsun" cx="38" cy="-100" r="7" fill="#ffe680"/>
    <path data-k="tvhill" d="M-4 -78q16 -14 32 -4t30 -6V-64H-4Z" fill="#4fbf5a"/>
    <rect x="-4" y="-114" width="62" height="50" fill="url(#opx-scan)"/>
    <rect data-k="tvflash" x="-4" y="-114" width="62" height="50" fill="#fff" opacity="0"/>
    <path d="M-2 -110q20 -6 40 -2" stroke="#fff" stroke-width="3" opacity=".18" fill="none"/>
  </g>
  <rect x="-4" y="-114" width="62" height="50" rx="5" fill="none" stroke="#000" stroke-width="2" opacity=".5"/>
  <circle cx="71" cy="-104" r="3.4" fill="#3a3842"/><circle cx="71" cy="-92" r="3.4" fill="#3a3842"/>
  <path d="M66 -82h10M66 -78h10M66 -74h10M66 -70h10" stroke="#18171c" stroke-width="1.4"/><circle cx="71" cy="-60" r="1.3" fill="#ff5050"/>`
}

// ───────────────────────── bedside table + lamp (Z = 478) ─────────────────────────
export function tableSvg(): string {
  return `
  <path d="M-160 -122L-232 40H-88Z" fill="url(#opx-lampcone)" opacity=".35"/>
  <rect x="-196" y="-62" width="88" height="62" fill="#5e3e2a"/>
  <rect x="-200" y="-66" width="96" height="6" fill="#80583a"/><rect x="-200" y="-66" width="96" height="1.6" fill="#ffd9a0" opacity=".8"/>
  <rect x="-190" y="-52" width="76" height="20" fill="#6a4630"/><circle cx="-152" cy="-42" r="2.2" fill="#d8b070"/>
  <rect x="-190" y="-28" width="76" height="22" fill="#6a4630"/><circle cx="-152" cy="-17" r="2.2" fill="#d8b070"/>
  <rect x="-196" y="-62" width="88" height="62" fill="url(#opx-tableshade)"/>
  <ellipse cx="-160" cy="-67" rx="11" ry="2.6" fill="#c9a060"/><path d="M-161 -67v-26h2v26Z" fill="#b8904f"/>
  <circle data-k="lamphalo" cx="-160" cy="-104" r="95" fill="url(#opx-bulbhalo)"/>
  <path d="M-184 -92L-136 -92L-145 -124L-175 -124Z" fill="url(#opx-shade)"/>
  <path d="M-184 -92L-136 -92" stroke="#fff4d0" stroke-width="1.6"/>
  <ellipse cx="-160" cy="-92" rx="17" ry="3" fill="#fff7d8"/>
  <rect x="-136" y="-78" width="22" height="12" rx="2" fill="#1d1c22"/><rect x="-133" y="-76" width="16" height="7" fill="#200"/>
  <text x="-125" y="-70.6" font-size="6" font-family="monospace" text-anchor="middle" fill="#ff3b30">9:41</text>
  <path d="M-196 -80h8l-1 14h-6Z" fill="#cfe6ff" opacity=".4"/><path d="M-195.5 -74h7" stroke="#cfe6ff" opacity=".6"/>`
}

// ───────────────────────── bed with a patchwork quilt + the cat (Z = 445) ─────────────────────────
export function bedSvg(): string {
  return `
  <ellipse cx="-370" cy="1" rx="200" ry="7" fill="#000" opacity=".35"/>
  <rect x="-536" y="-18" width="8" height="18" fill="#4a2f20"/><rect x="-214" y="-18" width="8" height="18" fill="#4a2f20"/>
  <rect x="-544" y="-80" width="16" height="80" rx="3" fill="#6b4631"/><path d="M-544 -76q8 -10 16 0" fill="#7d5539"/>
  <rect x="-210" y="-112" width="20" height="112" rx="4" fill="#6b4631"/><rect x="-210" y="-112" width="4" height="112" fill="#e8a868" opacity=".5"/>
  <rect x="-530" y="-34" width="322" height="16" fill="#6b4631"/><rect x="-530" y="-34" width="322" height="2" fill="#8d6444"/>
  <rect x="-528" y="-54" width="318" height="22" fill="#d8d0c0"/>
  <path d="M-268 -78c-4 -10 2 -14 30 -14c26 0 32 4 30 14c2 12 -4 20 -30 20c-26 0 -34 -8 -30 -20Z" fill="#f0e7d4"/>
  <path d="M-260 -66c10 6 36 6 48 0" stroke="#c9bea8" stroke-width="1.6" fill="none"/>
  <g transform="translate(-240 -86)">
    <circle cx="0" cy="8" r="10" fill="#9a6a3e"/><circle cx="-1" cy="-6" r="8" fill="#a8774a"/><circle cx="-7" cy="-12" r="3" fill="#a8774a"/><circle cx="5" cy="-12" r="3" fill="#a8774a"/>
    <ellipse cx="-1" cy="-3" rx="3.4" ry="2.6" fill="#d8b48a"/><circle cx="-1" cy="-4" r=".9" fill="#2a1a10"/><circle cx="-4" cy="-8" r=".9" fill="#2a1a10"/><circle cx="2" cy="-8" r=".9" fill="#2a1a10"/>
    <circle cx="-9" cy="6" r="3.6" fill="#a8774a"/><circle cx="9" cy="6" r="3.6" fill="#a8774a"/>
  </g>
  <path d="M-528 -58q30 -4 60 0t60 -2t60 2t60 -2t40 0L-270 -60V-50q-8 4 -10 30H-528Z" fill="url(#opx-quilt)"/>
  <path d="M-528 -58q30 -4 60 0t60 -2t60 2t60 -2t40 0L-270 -60V-50q-8 4 -10 30H-528Z" fill="url(#opx-quiltshade)"/>
  <path d="M-528 -24q40 6 80 0t80 2t80 -2t60 2" stroke="#2a1a14" stroke-width="2" fill="none" opacity=".4"/>
  <path d="M-284 -60c6 2 10 6 10 12" stroke="#f3ead8" stroke-width="5" fill="none"/>
  <!-- the cat, curled up asleep at the foot of the bed -->
  <g transform="translate(-440 -62)">
    <ellipse cx="0" cy="0" rx="28" ry="13" fill="#d98a3a"/>
    <path d="M-20 -6q4 8 0 14M-10 -11q5 10 0 22M2 -12q5 10 0 22M13 -10q4 8 0 18" stroke="#b0661f" stroke-width="2.6" fill="none"/>
    <g data-k="tail"><path d="M-26 4c-6 10 6 16 24 14c10 -1 18 -4 22 -8" stroke="#d98a3a" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M14 13c4 -1 6 -3 6 -3" stroke="#b0661f" stroke-width="6" stroke-linecap="round" fill="none"/></g>
    <circle cx="22" cy="-3" r="10" fill="#e09442"/>
    <path d="M14 -9l2 -10 7 6ZM26 -11l6 -8 2 10Z" fill="#e09442"/><path d="M16 -10l1.4 -6 4 3.4Z" fill="#f2b9a6"/>
    <path d="M18 -2q2 2 4 0M25 -2q2 2 4 0" stroke="#5a3010" stroke-width="1.1" fill="none"/>
    <ellipse cx="25" cy="2" rx="1.2" ry=".8" fill="#c96a6a"/>
    <path d="M-26 -6q20 -12 48 -6" stroke="#ffd9a0" stroke-width="1.6" fill="none" opacity=".55"/>
  </g>
  <path d="M-300 -2c0 -5 12 -6 16 -3l1 5h-17Z M-280 -2c0 -5 12 -6 16 -3l1 5h-17Z" fill="#3b6fb8"/>
`
}

// ───────────────────────── desk, chair, backpack (Z = 430) ─────────────────────────
export function deskSvg(): string {
  return `
  <rect x="196" y="-68" width="176" height="68" fill="#140d09" opacity=".6"/>
  <rect x="182" y="-78" width="284" height="10" fill="#7a5236"/><rect x="182" y="-78" width="284" height="2" fill="#a07250"/>
  <rect x="186" y="-68" width="12" height="68" fill="#5a3b26"/>
  <rect x="372" y="-68" width="88" height="68" fill="#654230"/>
  <path d="M376 -46h80M376 -24h80" stroke="#3e2819" stroke-width="2"/>
  <rect x="408" y="-60" width="16" height="3" rx="1.5" fill="#c8a06a"/><rect x="408" y="-38" width="16" height="3" rx="1.5" fill="#c8a06a"/><rect x="408" y="-16" width="16" height="3" rx="1.5" fill="#c8a06a"/>
  <rect x="200" y="-86" width="52" height="8" fill="#2f6aa8"/><rect x="204" y="-94" width="46" height="8" fill="#e0b04a"/><rect x="198" y="-101" width="50" height="7" fill="#c0503e"/>
  <path d="M200 -86h52M204 -94h46" stroke="#f4e7c8" stroke-width=".8" opacity=".6"/>
  <path d="M264 -78v-14h12v14Z" fill="#3a6fd9"/><path d="M266 -92l-2 -12M270 -92v-14M274 -92l3 -10" stroke-width="2" stroke="#e34b4b"/><path d="M270 -92v-14" stroke="#f2c94c" stroke-width="2"/>
  <g transform="translate(306 -78)"><path d="M0 0c2 -6 8 -8 14 -8c4 -6 8 -10 12 -8c3 2 2 4 -1 4c-3 2 -4 6 -4 10c3 2 5 2 7 2H0Z" fill="#5fae5a"/><circle cx="23" cy="-14" r=".9" fill="#1a1a1a"/></g>
  <path d="M436 -78h20l-4 -4h-12Z" fill="#2f4e3a"/><path d="M446 -82l-12 -30 18 -14" stroke="#2f4e3a" stroke-width="3" fill="none"/>
  <path d="M446 -128l12 4 -2 12 -16 -4Z" fill="#3a6a4a"/>
  <!-- backpack against the drawers -->
  <path d="M322 0v-34c0 -12 8 -16 22 -16s22 4 22 16V0Z" fill="#e0a63a"/>
  <path d="M328 0v-18c0 -6 4 -8 16 -8s16 2 16 8V0Z" fill="#c58a2a"/><path d="M332 -14h24" stroke="#8a5a1a" stroke-width="1.6"/>
  <path d="M336 -50c0 -8 16 -8 16 0" stroke="#8a5a1a" stroke-width="3" fill="none"/>
  <!-- the desk chair, from behind -->
  <g transform="translate(260 0)">
    <rect x="4" y="-58" width="64" height="7" fill="#7a5236"/>
    <rect x="6" y="-51" width="5" height="51" fill="#5a3b26"/><rect x="61" y="-51" width="5" height="51" fill="#5a3b26"/>
    <rect x="8" y="-118" width="6" height="64" fill="#7a5236"/><rect x="58" y="-118" width="6" height="64" fill="#7a5236"/>
    <rect x="8" y="-120" width="56" height="12" rx="3" fill="#8a5e3e"/><rect x="14" y="-100" width="44" height="6" fill="#7a5236"/>
    <rect x="18" y="-104" width="4" height="40" fill="#6a4630"/><rect x="34" y="-104" width="4" height="40" fill="#6a4630"/><rect x="50" y="-104" width="4" height="40" fill="#6a4630"/>
    <path d="M8 -120h56" stroke="#b08058" stroke-width="1.6"/>
  </g>
`
}

// ───────────────────────── solar-system mobile hanging from the ceiling (Z = 150) ─────────────────────────
export function mobileSvg(): string {
  return `<g stroke="#2a2a30" stroke-width=".6"><path d="M-104 -420V-214M-140 -214V-186M-68 -214V-178M-122 -214V-196M-86 -214V-168"/></g>
  <path d="M-146 -214h84" stroke="#6a4a2e" stroke-width="2"/>
  <circle cx="-140" cy="-182" r="5" fill="#ffcc4d"/><circle cx="-122" cy="-193" r="3" fill="#4a90d9"/>
  <circle cx="-86" cy="-164" r="4" fill="#e3c27a"/><ellipse cx="-86" cy="-164" rx="8" ry="2" fill="none" stroke="#c9a65e" stroke-width="1.2"/>
  <circle cx="-68" cy="-174" r="3.4" fill="#d9603b"/>`
}

// ───────────────────────── curtains just inside the window (Z = 26) ─────────────────────────
export function curtainsSvg(): string {
  const side = (s: number) => {
    const X = (x: number) => f(x * s)
    return `<path d="M${X(176)} -246H${X(52)}C${X(58)} -206 ${X(72)} -166 ${X(68)} -142C${X(66)} -120 ${X(56)} -96 ${X(46)} -62H${X(176)}Z" fill="url(#opx-curtain${s < 0 ? 'L' : 'R'})"/>
    <path d="M${X(66)} -236C${X(70)} -200 ${X(80)} -170 ${X(76)} -146M${X(84)} -238C${X(88)} -200 ${X(94)} -170 ${X(88)} -146M${X(64)} -136C${X(62)} -110 ${X(58)} -90 ${X(54)} -64M${X(80)} -136C${X(80)} -110 ${X(78)} -90 ${X(74)} -64" stroke="#5a1f18" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M${X(52)} -246C${X(58)} -206 ${X(72)} -166 ${X(68)} -142C${X(66)} -120 ${X(56)} -96 ${X(46)} -62" stroke="#ffcf8a" stroke-width="2.4" fill="none" opacity=".85"/>
    <path d="M${X(62)} -141q${s * 16} 4 ${s * 32} -1" stroke="#d9a646" stroke-width="3" stroke-linecap="round" fill="none"/>`
  }
  return `${side(-1)}${side(1)}
  <rect x="-186" y="-250" width="372" height="5" rx="2.5" fill="#b8904f"/><circle cx="-188" cy="-247.5" r="5" fill="#c9a060"/><circle cx="188" cy="-247.5" r="5" fill="#c9a060"/>`
}

// ───────────────────────── inside face of the wall around the window (Z = 22) ─────────────────────────
export function jambSvg(): string {
  const { x0, x1, y0, y1 } = HOLE
  return `<path fill-rule="evenodd" d="M-1500 -1100H1500V1100H-1500Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="#b07a52"/>
  <path fill-rule="evenodd" d="M-1500 -1100H1500V1100H-1500Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="url(#opx-jamblight)"/>`
}

export const ROOM_DEFS = `
  <clipPath id="opx-pc1"><rect width="92" height="118"/></clipPath>
  <clipPath id="opx-pc2"><rect width="90" height="112"/></clipPath>
  <clipPath id="opx-pc3"><rect width="90" height="106"/></clipPath>
  <linearGradient id="opx-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121826"/><stop offset="1" stop-color="#202a38"/></linearGradient>
  <pattern id="opx-paper" width="24" height="280" patternUnits="userSpaceOnUse"><rect width="10" height="280" fill="#3f5b66"/><rect x="11" width="1.4" height="280" fill="#2f4651"/></pattern>
  <linearGradient id="opx-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c3b28"/><stop offset=".3" stop-color="#4a2f20"/><stop offset="1" stop-color="#2a1a12"/></linearGradient>
  <radialGradient id="opx-lampglow"><stop offset="0" stop-color="#ffbf6a" stop-opacity=".7"/><stop offset=".3" stop-color="#ff9f50" stop-opacity=".32"/><stop offset="1" stop-color="#ff9f50" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-tvglow"><stop offset="0" stop-color="#7fb4ff" stop-opacity=".5"/><stop offset=".4" stop-color="#5f8fe0" stop-opacity=".18"/><stop offset="1" stop-color="#5f8fe0" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-tvhalo"><stop offset="0" stop-color="#bcd8ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fb4ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-roomdark" cx=".46" cy=".46" r=".5"><stop offset=".3" stop-color="#05040c" stop-opacity="0"/><stop offset="1" stop-color="#05040c" stop-opacity=".75"/></radialGradient>
  <linearGradient id="opx-postersky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a44"/><stop offset="1" stop-color="#3a2a6a"/></linearGradient>
  <linearGradient id="opx-dinosky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c76a"/><stop offset="1" stop-color="#e8794a"/></linearGradient>
  <linearGradient id="opx-tvbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3842"/><stop offset="1" stop-color="#1f1e24"/></linearGradient>
  <pattern id="opx-scan" width="4" height="1.6" patternUnits="userSpaceOnUse"><rect width="4" height=".7" fill="#000" opacity=".28"/></pattern>
  <clipPath id="opx-tvclip"><rect x="-4" y="-114" width="62" height="50" rx="5"/></clipPath>
  <linearGradient id="opx-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd890"/><stop offset="1" stop-color="#ffb35a"/></linearGradient>
  <radialGradient id="opx-bulbhalo"><stop offset="0" stop-color="#fff2c8" stop-opacity=".9"/><stop offset=".25" stop-color="#ffcf7a" stop-opacity=".4"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient>
  <linearGradient id="opx-lampcone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd890" stop-opacity=".8"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></linearGradient>
  <linearGradient id="opx-tableshade" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
  <pattern id="opx-quilt" width="36" height="36" patternUnits="userSpaceOnUse" x="-528" y="-60">
    <rect width="18" height="18" fill="#b9563a"/><rect x="18" width="18" height="18" fill="#2f5f8a"/><rect y="18" width="18" height="18" fill="#d9a646"/><rect x="18" y="18" width="18" height="18" fill="#5c8a5a"/>
    <path d="M9 3l1.6 3.4 3.6.4-2.7 2.4.8 3.6L9 11l-3.3 1.8.8-3.6L3.8 6.8l3.6-.4Z" fill="#f2d39a" opacity=".55"/>
    <path d="M0 .5H36M0 18.5H36M.5 0V36M18.5 0V36" stroke="#f4e3c0" stroke-width=".8" stroke-dasharray="2 2" opacity=".6"/>
  </pattern>
  <linearGradient id="opx-quiltshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".2"/><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
  <linearGradient id="opx-curtainL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a221a"/><stop offset=".75" stop-color="#9a3f2a"/><stop offset="1" stop-color="#d9774a"/></linearGradient>
  <linearGradient id="opx-curtainR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#5a221a"/><stop offset=".75" stop-color="#9a3f2a"/><stop offset="1" stop-color="#d9774a"/></linearGradient>
  <radialGradient id="opx-jamblight" cx=".5" cy=".43" r=".1"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".5"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>`
