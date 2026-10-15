/**
 * Chapter 4 room art (SVG strings, room units 1600 × 900): a bedroom desk at night with a beige CRT, the Game Boy
 * (Ch1), the blue diary and the medal on the shelf (Ch2/Ch3), and a wide picture window that turns into San Francisco
 * at sunset for the hand-over to Chapter 5. Dynamic parts carry data-k attributes (stage.ts paints them).
 */
import { PANE, SCREEN, SKY, SKYLINE, SUN, WATER, WATER_Y } from './config'

/** Height of the skyline band as a fraction of the frame (the band's bottom sits on the water line). */
export const SKYLINE_H = 0.3

/** The skyline silhouette, in a 1600 × 300 box whose bottom edge is the water line. Shared by the window and the full frame. */
export const SKYLINE_INNER = `
<path d="M0 232 Q200 176 420 218 T860 204 T1300 218 T1600 198 V300 H0Z" fill="#b9707a" opacity=".45"/>
<g fill="${SKYLINE}">
  <rect x="146" y="64" width="18" height="236"/><rect x="418" y="64" width="18" height="236"/>
  <rect x="140" y="104" width="30" height="8"/><rect x="140" y="160" width="30" height="8"/>
  <rect x="412" y="104" width="30" height="8"/><rect x="412" y="160" width="30" height="8"/>
  <rect x="-20" y="236" width="640" height="11"/>
  <rect x="560" y="226" width="50" height="74"/><rect x="620" y="190" width="66" height="110"/>
  <rect x="700" y="140" width="58" height="160"/><rect x="770" y="100" width="70" height="200"/>
  <path d="M862 300 V112 L887 8 L912 112 V300Z"/><rect x="930" y="122" width="64" height="178"/>
  <path d="M1010 300 V92 Q1046 60 1082 92 V300Z"/><rect x="1100" y="150" width="56" height="150"/>
  <rect x="1170" y="176" width="80" height="124"/><rect x="1270" y="200" width="60" height="100"/>
  <rect x="1340" y="222" width="90" height="78"/><rect x="1440" y="246" width="80" height="54"/>
</g>
<g fill="none" stroke="${SKYLINE}" stroke-width="5">
  <path d="M-20 168 Q70 120 155 66 Q290 218 427 66 Q520 130 620 176"/>
</g>
<g fill="#ffe2a0" opacity=".6"><rect x="784" y="124" width="7" height="9"/><rect x="806" y="160" width="7" height="9"/><rect x="944" y="150" width="7" height="9"/><rect x="1032" y="120" width="7" height="9"/><rect x="1052" y="168" width="7" height="9"/><rect x="1186" y="200" width="7" height="9"/><rect x="716" y="170" width="7" height="9"/><rect x="1288" y="226" width="7" height="9"/></g>`

const f = (n: number): string => n.toFixed(1)
const stops = SKY.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')

/** The golden-hour view inside the window pane (same composition as the full-frame sky, in pane coordinates). */
function paneGold(): string {
  const P = PANE
  const waterY = P.y + WATER_Y * P.h
  const sbH = SKYLINE_H * P.h
  const sx = P.x + SUN.x * P.w
  const sy = P.y + SUN.y * P.h
  const sr = 0.19 * P.h
  return `
  <rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" fill="url(#c4PaneSky)"/>
  <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 2)}" fill="url(#c4SunGlow)"/>
  <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 0.42)}" fill="${SUN.color}"/>
  <svg x="${P.x}" y="${f(waterY - sbH)}" width="${P.w}" height="${f(sbH)}" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">${SKYLINE_INNER}</svg>
  <rect x="${P.x}" y="${f(waterY)}" width="${P.w}" height="${f(P.y + P.h - waterY)}" fill="url(#c4PaneWater)"/>
  <g stroke="#fff3c8" stroke-width="2.5" opacity=".7"><path d="M${f(sx - 26)} ${f(waterY + 8)} h52 M${f(sx - 18)} ${f(waterY + 20)} h36 M${f(sx - 10)} ${f(waterY + 34)} h20"/></g>`
}

function paneNight(): string {
  const P = PANE
  const stars = [
    [130, 120, 2],
    [220, 160, 1.5],
    [300, 104, 1.8],
    [410, 142, 1.3],
    [520, 112, 2],
    [590, 180, 1.4],
    [170, 210, 1.2],
    [470, 220, 1.5],
  ]
  return `
  <rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" fill="url(#c4Night)"/>
  <g fill="#fff">${stars.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <circle cx="540" cy="150" r="26" fill="#f4efd8"/><circle cx="552" cy="142" r="24" fill="#18224a"/>
  <path d="M70 414 V352 h40 v-22 h34 v30 h46 v-40 h30 v52 h52 v-26 h44 v34 h60 v-48 h36 v40 h54 v-18 h44 v28 h50 V414Z" fill="#0d1430"/>
  <g fill="#ffd27a" opacity=".55"><rect x="152" y="342" width="5" height="6"/><rect x="226" y="332" width="5" height="6"/><rect x="300" y="350" width="5" height="6"/><rect x="420" y="338" width="5" height="6"/><rect x="520" y="356" width="5" height="6"/></g>`
}

export const ROOM_SVG = `
<svg class="c4-roomsvg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="c4Wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2436"/><stop offset="1" stop-color="#1b1622"/></linearGradient>
    <linearGradient id="c4WallGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9674a"/><stop offset=".6" stop-color="#6e3a3a"/><stop offset="1" stop-color="#3c2230"/></linearGradient>
    <linearGradient id="c4Desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5536"/><stop offset=".08" stop-color="#5e3f27"/><stop offset="1" stop-color="#3c2717"/></linearGradient>
    <linearGradient id="c4Night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1330"/><stop offset="1" stop-color="#26315c"/></linearGradient>
    <linearGradient id="c4PaneSky" gradientUnits="userSpaceOnUse" x1="0" y1="${PANE.y}" x2="0" y2="${PANE.y + PANE.h}">${stops}</linearGradient>
    <linearGradient id="c4PaneWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${WATER[0]}"/><stop offset="1" stop-color="${WATER[1]}"/></linearGradient>
    <radialGradient id="c4SunGlow"><stop offset="0" stop-color="${SUN.color}"/><stop offset=".22" stop-color="${SUN.color}"/><stop offset=".5" stop-color="#ffe9a8" stop-opacity=".7"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="c4Beige" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8e1cd"/><stop offset="1" stop-color="#c9bfa6"/></linearGradient>
    <radialGradient id="c4Glow" cx="58%" cy="44%" r="42%"><stop offset="0" stop-color="#8fbaff" stop-opacity=".42"/><stop offset="1" stop-color="#8fbaff" stop-opacity="0"/></radialGradient>
    <radialGradient id="c4Sunlight" cx="18%" cy="28%" r="85%"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset=".55" stop-color="#ff8a3c" stop-opacity=".18"/><stop offset="1" stop-color="#ff8a3c" stop-opacity="0"/></radialGradient>
    <clipPath id="c4PaneClip"><rect x="${PANE.x}" y="${PANE.y}" width="${PANE.w}" height="${PANE.h}"/></clipPath>
  </defs>
  <rect width="1600" height="900" fill="url(#c4Wall)"/>
  <rect data-k="wallGold" width="1600" height="900" fill="url(#c4WallGold)" opacity="0"/>

  <g clip-path="url(#c4PaneClip)">
    <g data-k="night">${paneNight()}</g>
    <g data-k="gold" opacity="0">${paneGold()}</g>
  </g>
  <rect x="${PANE.x - 9}" y="${PANE.y - 9}" width="${PANE.w + 18}" height="${PANE.h + 18}" fill="none" stroke="#e9e1d1" stroke-width="18"/>
  <rect x="${PANE.x - 26}" y="${PANE.y + PANE.h + 8}" width="${PANE.w + 52}" height="22" rx="4" fill="#d9cfbd"/>
  <rect x="${PANE.x - 26}" y="${PANE.y + PANE.h + 28}" width="${PANE.w + 52}" height="6" fill="#000" opacity=".25"/>

  <!-- shelf: the blue diary (Ch3), the medal (Ch2), a framed photo -->
  <rect x="1230" y="300" width="320" height="14" fill="#6b4a2f"/><rect x="1230" y="312" width="320" height="6" fill="#000" opacity=".3"/>
  <rect x="1252" y="206" width="66" height="94" rx="4" fill="#2f7fc0"/><rect x="1252" y="206" width="10" height="94" fill="#000" opacity=".18"/>
  <rect x="1266" y="222" width="44" height="22" fill="#fdfcf6" transform="rotate(-2 1288 233)"/>
  <path d="M1370 214 L1386 262 M1414 214 L1398 262" stroke="#d6342c" stroke-width="9"/>
  <circle cx="1392" cy="276" r="21" fill="#f2c14e" stroke="#b8860b" stroke-width="4"/><path d="M1392 264 l4 9 h9 l-7 6 3 9 -9 -5 -9 5 3 -9 -7 -6 h9z" fill="#b8860b"/>
  <rect x="1446" y="230" width="74" height="70" fill="#3a2e22"/><rect x="1452" y="236" width="62" height="58" fill="#c9a24a"/><rect x="1458" y="242" width="50" height="46" fill="#8b6b4a"/>

  <!-- desk -->
  <rect y="630" width="1600" height="270" fill="url(#c4Desk)"/>
  <rect y="626" width="1600" height="8" fill="#8c6644"/>

  <!-- Game Boy (Ch1) -->
  <g transform="translate(420 600) rotate(-12)"><rect width="78" height="122" rx="9" fill="#c8c4bc"/><rect x="10" y="10" width="58" height="44" rx="3" fill="#6b7353"/><rect x="16" y="16" width="46" height="32" fill="#9bbc0f"/><circle cx="58" cy="80" r="7" fill="#8c1d40"/><circle cx="44" cy="90" r="7" fill="#8c1d40"/><path d="M14 80h20M24 70v20" stroke="#333" stroke-width="7"/></g>

  <rect data-k="glow" width="1600" height="900" fill="url(#c4Glow)" opacity="0"/>
  <!-- the CRT -->
  <rect x="690" y="236" width="490" height="350" rx="26" fill="#000" opacity=".35" transform="translate(10 14)"/>
  <path d="M718 224 L764 178 L1092 178 L1138 224Z" fill="#d4cbb3"/><path d="M764 178 L1092 178 L1084 186 L772 186Z" fill="#e6dfcb"/>
  <rect x="696" y="220" width="464" height="352" rx="22" fill="url(#c4Beige)"/>
  <rect x="722" y="240" width="412" height="312" rx="16" fill="#8f8670"/>
  <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="12" fill="#050505"/>
  <g stroke="#b3aa92" stroke-width="3"><path d="M744 558 h50 M744 564 h50"/></g>
  <rect x="1098" y="552" width="24" height="10" rx="3" fill="#a8a08a"/>
  <circle data-k="led" cx="1078" cy="557" r="5" fill="#3a3a2c"/>
  <path d="M880 572 L976 572 L992 614 L864 614Z" fill="#c9bfa6"/>
  <path d="M820 614 L1036 614 L1050 640 L806 640Z" fill="#d8d0bc"/>

  <!-- keyboard, mouse, mug -->
  <path d="M752 664 L1104 664 L1124 716 L732 716Z" fill="#d8d0bc"/>
  <g fill="#bdb39b"><rect x="770" y="672" width="320" height="10" rx="2"/><rect x="764" y="686" width="332" height="10" rx="2"/><rect x="758" y="700" width="344" height="10" rx="2"/></g>
  <path d="M1200 660 q-30 -40 -60 -30" stroke="#bdb39b" stroke-width="3" fill="none"/>
  <ellipse cx="1204" cy="694" rx="26" ry="34" fill="#d8d0bc"/><path d="M1204 662 v22" stroke="#bdb39b" stroke-width="2"/>
  <rect x="1310" y="612" width="60" height="70" rx="8" fill="#b23a3a"/><path d="M1370 628 q26 6 0 36" stroke="#b23a3a" stroke-width="9" fill="none"/>

  <rect data-k="sunlight" width="1600" height="900" fill="url(#c4Sunlight)" opacity="0"/>
  <rect data-k="dark" width="1600" height="900" fill="#05040a" opacity=".5"/>
</svg>`

/** Full-frame golden sky (last frame of Ch4 = first frame of Ch5). Sizes are fractions of the frame (container units). */
export const SKY_HTML = `
<div class="c4-sky-grad"></div>
<div class="c4-sky-sun"></div><div class="c4-sky-disk"></div>
<svg class="c4-sky-line" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${SKYLINE_INNER}</svg>
<div class="c4-sky-water"></div>
<div class="c4-sky-glint"><i></i><i></i><i></i></div>`
