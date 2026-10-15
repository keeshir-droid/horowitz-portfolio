/**
 * The kid (about 8) on a bean bag, back three-quarters to us, playing a grey brick handheld. World cm, floor y = 0.
 * Avatar rules: short black hair, round glasses (the arm and the rim edge show from behind), light-brown skin,
 * black hoodie. The handheld is drawn in its own millimetre units (90 × 148) inside the group data-k="gb", which
 * scene.ts places with its screen centre at GB_SCREEN (and straightens as the camera dives in).
 */

/** World position (cm) of the handheld's screen centre, on the kid plane. */
export const GB_SCREEN = { x: 30, y: -57 }
/** The LCD in the handheld's own units (mm). */
export const LCD = { x: 21, y: 15, w: 48, h: 43 }
export const LCD_C = { x: LCD.x + LCD.w / 2, y: LCD.y + LCD.h / 2 }

const SKIN = '#b47a52'
const SKIN_D = '#8a5838'
const SKIN_L = '#d39a6c'

function handheld(): string {
  const { x, y, w, h } = LCD
  return `
  <path d="M4 0H86Q90 0 90 4V126Q90 148 68 148H4Q0 148 0 144V4Q0 0 4 0Z" fill="url(#opx-gbbody)"/>
  <path d="M4 0H86Q90 0 90 4V126Q90 148 68 148H4Q0 148 0 144V4Q0 0 4 0Z" fill="none" stroke="#8d897e" stroke-width="1"/>
  <path d="M1 5H89" stroke="#a9a498" stroke-width=".8"/><path d="M12 1v4M78 1v4" stroke="#a9a498" stroke-width=".8"/>
  <path d="M7 9H83V60Q83 70 73 70H7Z" fill="#5c5e74"/>
  <path d="M11 12.4H32M58 12.4H79M11 13.8H32M58 13.8H79" stroke="#8a4a6a" stroke-width=".5"/>
  <path d="M11 12.4H32M58 12.4H79" stroke="#3a3c8a" stroke-width=".5" transform="translate(0 1.4)"/>
  <circle cx="13.5" cy="34" r="1.5" fill="#e3263a"/><circle data-k="led" cx="13.5" cy="34" r="3.2" fill="#ff5060" opacity=".35"/>
  <g clip-path="url(#opx-lcdclip)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#9bbc0f"/>
    <g data-k="logo"><text x="${LCD_C.x}" y="0" font-size="7.2" text-anchor="middle" fill="#0f380f" font-family="OpenPx, 'Press Start 2P', monospace">NAWKA</text></g>
    <text data-k="logosub" x="${LCD_C.x}" y="${y + 33}" font-size="2.15" text-anchor="middle" fill="#0f380f" font-family="OpenPx, 'Press Start 2P', monospace" opacity="0">(c) 2007 R.N. CORP</text>
    <rect data-k="lcdgrid" x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#opx-lcdgrid)" opacity="0"/>
    <path data-k="lcdsheen" d="M${x} ${y}h${w * 0.55}l-${w * 0.3} ${h}H${x}Z" fill="#fff" opacity=".08"/>
    <rect x="${x}" y="${y}" width="${w}" height="1.6" fill="#000" opacity=".12" data-k="lcdedge"/>
  </g>
  <g data-k="gbface">
  <circle cx="22" cy="96" r="12" fill="#b3ae9f" opacity=".6"/>
  <path d="M18 87h8v5h5v8h-5v5h-8v-5h-5v-8h5Z" fill="#26262e"/><path d="M18 87h8v1.4h-8ZM13 92h5v1.2h-5Z" fill="#4a4a56"/><circle cx="22" cy="96" r="1.6" fill="#1a1a20"/>
  <ellipse cx="65.5" cy="94" rx="15" ry="7.6" fill="#b3ae9f" opacity=".6" transform="rotate(-25 65.5 94)"/>
  <g data-k="btnA"><circle cx="72" cy="90" r="5.4" fill="#8a1f4a"/><circle cx="71" cy="88.6" r="2.4" fill="#b2416e" opacity=".8"/></g>
  <circle cx="59" cy="98" r="5.4" fill="#8a1f4a"/><circle cx="58" cy="96.6" r="2.4" fill="#b2416e" opacity=".8"/>
  <g transform="rotate(-25 43 124)"><rect x="31" y="122" width="10" height="3.4" rx="1.7" fill="#8e8a82"/><rect x="45" y="122" width="10" height="3.4" rx="1.7" fill="#8e8a82"/></g>
  <g stroke="#9c978a" stroke-width="2" stroke-linecap="round"><path d="M66 132l12 -12M70 136l12 -12M74 140l10 -10M62 128l12 -12M58 124l10 -10"/></g>
  </g>
  <!-- hands: palms wrap the sides (fingers behind), thumbs on the d-pad and the A button -->
  <path d="M87 64C95 63 100 68 100 76C102 82 101 90 99 95C102 101 101 110 97 115C99 121 96 128 90 130L87 130Z" fill="${SKIN_D}"/>
  <path d="M100 76c-3 1 -7 1 -11 0M99 95c-3 1 -6 1 -10 0M97 115c-3 1 -5 1 -8 0" stroke="#6e4228" stroke-width="1.1" fill="none"/>
  <path d="M95 64.6C98.6 66 100.4 70 100 76" stroke="#7f9fd8" stroke-width="1" fill="none" opacity=".5"/>
  <path d="M3 64C-5 63 -10 68 -10 76C-12 82 -11 90 -9 95C-12 101 -11 110 -7 115C-9 121 -6 128 0 130L3 130Z" fill="${SKIN_D}"/>
  <path d="M-10 76c3 1 7 1 11 0M-9 95c3 1 6 1 10 0M-7 115c3 1 5 1 8 0" stroke="#6e4228" stroke-width="1.1" fill="none"/>
  <g data-k="thumbL"><path d="M-8 104C0 98 9 93 15 90.6C20 88.6 24 93.8 20.4 98C16 103 6 110 -2 116Z" fill="${SKIN}"/>
  <path d="M18.6 92.4C16.6 91.2 13.8 91.8 13.2 94.2C15.2 95.2 17.6 94.8 18.6 92.4Z" fill="${SKIN_L}" opacity=".8"/>
  <path d="M10 97c-1.4 -1.2 -2.2 -2.8 -2.4 -4.4" stroke="${SKIN_D}" stroke-width=".9" fill="none"/></g>
  <g data-k="thumbR"><path d="M98 102C90 96 82 91 76.6 88.6C71.6 86.4 67.4 91.6 70.8 96C75 101 84 109 92 115Z" fill="${SKIN}"/>
  <path d="M72.6 90.6C74.6 89.4 77.4 90 78 92.4C76 93.4 73.6 93 72.6 90.6Z" fill="${SKIN_L}" opacity=".8"/>
  <path d="M80 96c1.4 -1.2 2.2 -2.8 2.4 -4.4" stroke="${SKIN_D}" stroke-width=".9" fill="none"/></g>`
}

export function kidSvg(): string {
  return `
  <!-- braided rug, toys -->
  <g transform="translate(6 10)">
    <ellipse rx="118" ry="27" fill="#7a3434"/><ellipse rx="104" ry="23" fill="#c9893c"/><ellipse rx="90" ry="19.5" fill="#35597a"/>
    <ellipse rx="76" ry="16" fill="#d7c08a"/><ellipse rx="61" ry="12.6" fill="#9a4040"/><ellipse rx="46" ry="9.4" fill="#c9893c"/><ellipse rx="30" ry="6" fill="#35597a"/>
    <g fill="none" stroke="#000" stroke-width="1.2" stroke-dasharray="3 3" opacity=".22"><ellipse rx="111" ry="25"/><ellipse rx="97" ry="21"/><ellipse rx="83" ry="17.8"/><ellipse rx="68" ry="14.2"/><ellipse rx="53" ry="11"/></g>
    <ellipse rx="118" ry="27" fill="url(#opx-rugshade)"/>
  </g>
  <g transform="translate(-78 8) rotate(-8)"><rect x="-9" y="-6" width="18" height="6" rx="2" fill="#d9433a"/><path d="M-5 -6l2 -4h7l3 4Z" fill="#d9433a"/><path d="M-3.6 -6.4l1.4 -2.6h2.6v2.6ZM1.6 -9h2l2 2.6h-4Z" fill="#9fd0ff"/>
    <circle cx="-5" cy="0" r="2.4" fill="#1a1a1a"/><circle cx="5" cy="0" r="2.4" fill="#1a1a1a"/></g>
  <g transform="translate(72 16) rotate(10)"><path d="M-12 -3l22 -4 4 8 -22 4Z" fill="#f2f0e6"/><path d="M-11 -2.6l20 -3.6 3 6 -20 3.6Z" fill="#3b7fc4"/><path d="M-6 -2l6 -1 1 3 -6 1Z" fill="#f2c94c"/></g>
  <g transform="translate(52 4) rotate(-14)"><rect x="-4" y="-5" width="8" height="9" rx="1" fill="#8d8a92"/><rect x="-3" y="-3" width="6" height="4" fill="#d6d0b8"/></g>

  <!-- bean bag (back of it faces us) -->
  <ellipse cx="2" cy="8" rx="54" ry="7" fill="#000" opacity=".4"/>

  <!-- torso: black hoodie -->
  <path d="M-18.6 -58C-18.8 -64.8 -12 -68.6 -4 -69.4L4.6 -69.4C13 -68.8 19.4 -65 19.8 -58L21 -32L-20.6 -32Z" fill="url(#opx-hoodie)"/>
  <path d="M-13 -50C-8 -46.5 -4.5 -42 -3.4 -36M13.4 -55C10.6 -50 9.6 -44 10.2 -38M6 -59.2C8.4 -57.6 11 -57.4 13.4 -58.2" stroke="#0f0e13" stroke-width=".55" fill="none" opacity=".85"/>
  <path d="M-12.2 -50.8C-7.4 -47.4 -4 -43 -2.8 -37M12.6 -55.4C10 -50.6 9 -45 9.4 -39" stroke="#3a3844" stroke-width=".4" fill="none" opacity=".7"/>
  <path data-k="rimL" d="M-18.6 -58C-18.8 -64.8 -12 -68.6 -4 -69.4" stroke="#f0a868" stroke-width=".8" fill="none" opacity=".6"/>
  <path d="M-10 -68.4C-4 -69.6 6 -69.6 13 -67.6C16 -66.6 18.4 -64.6 19.4 -61.6" stroke="#7f9fd8" stroke-width=".5" fill="none" opacity=".45"/>

  <!-- bean bag body covering the lower back -->
  <path d="M-46 6C-54 -6 -48 -26 -32 -34C-26 -38 -22 -42 -15 -40C-6 -36.6 6 -36.6 14 -40C21 -43 27 -40 33 -34C47 -26 53 -8 47 6C30 12 -29 12 -46 6Z" fill="url(#opx-beanbag)"/>
  <path d="M-30 -32C-20 -18 -18 -6 -20 8M30 -32C22 -18 20 -6 22 8M-44 -8C-20 -2 22 -2 46 -8" stroke="#4a1018" stroke-width="1.2" fill="none" opacity=".7"/>
  <path d="M-40 -22C-34 -32 -26 -38 -15 -40" stroke="#ff9a7a" stroke-width="1.6" fill="none" opacity=".45"/>

  <!-- the far forearm (behind the body), then the handheld held in front of him -->
  <path d="M19.5 -49C22 -50 24 -51 26.5 -52.5L27.5 -47.5C25 -46.5 22 -45 19.8 -44Z" fill="#17161c"/>
  <circle data-k="gbglow" cx="${GB_SCREEN.x}" cy="${GB_SCREEN.y}" r="16" fill="url(#opx-gbglow)"/>
  <g data-k="gb">${handheld()}</g>

  <!-- arms: the far one resting on the bean bag, the near one bent forward to the handheld -->
  <path d="M-18.4 -60C-21.8 -56 -23.4 -48 -22.6 -38L-16 -37C-16.4 -46 -16 -54 -14.8 -58Z" fill="#1c1b22"/>
  <path d="M-18.4 -60C-21.8 -56 -23.4 -48 -22.6 -38" stroke="#f0a868" stroke-width=".7" fill="none" opacity=".55"/>
  <path d="M15.2 -63.6C20.4 -62.4 23.8 -56.4 25 -49C25.6 -45.4 24.8 -42.4 22.6 -41.2L17.8 -41.6C18 -48.4 17.2 -55.4 14.6 -60Z" fill="#24232b"/>
  <path d="M16.6 -63.2C20.6 -61.6 23.4 -56.4 24.6 -50" stroke="#6f8fc8" stroke-width=".45" fill="none" opacity=".5"/>
  <path d="M20.6 -44.6C25.4 -47.6 30.6 -49.6 34.6 -50.2L39.2 -44C35.4 -42.6 30 -40 25 -37.6C22 -37.2 19.8 -40 20.6 -44.6Z" fill="#26252d"/>
  <path d="M21.4 -45.6C26 -48.4 30.8 -50 34.6 -50.2" stroke="#5a6a8c" stroke-width=".5" fill="none" opacity=".8"/>
  <path d="M26.2 -46.6C27.4 -44.8 28 -43 28.2 -41.2M30.4 -48C31.4 -46.6 32 -45 32.2 -43.4M21.8 -44.8C22.8 -43.6 23.4 -42.2 23.6 -40.6" stroke="#121117" stroke-width=".45" fill="none"/>
  <path d="M33 -49.9L34.6 -50.2L39.2 -44L37.6 -43.4Z" fill="#33323c"/>
  <path d="M33.8 -49.4L38.2 -43.8M34.6 -49.8L38.8 -44.2" stroke="#1d1c23" stroke-width=".25"/>

  <!-- hood down, bunched on the upper back; collar; neck -->
  <path d="M-3.8 -76.4L-4.4 -72L4.8 -72L4.2 -76.4Z" fill="${SKIN_D}"/>
  <path d="M-10.8 -71C-11.8 -66 -8 -61.2 0 -60.6C8 -60.8 11.8 -65.6 11 -71C7 -73.2 -6.8 -73.2 -10.8 -71Z" fill="#28272f"/>
  <path d="M-10.8 -71C-6.8 -73.2 7 -73.2 11 -71C7.2 -70.4 -7 -70.4 -10.8 -71Z" fill="#141319"/>
  <path d="M-10.8 -71C-6.8 -73.2 7 -73.2 11 -71" stroke="#45434f" stroke-width=".5" fill="none"/>
  <path d="M-6.6 -66.2C-2.4 -64.2 3 -64.2 7.2 -66.4" stroke="#141319" stroke-width=".6" fill="none"/>
  <path d="M-6 -66.9C-2 -65.1 2.8 -65.1 6.6 -67.1" stroke="#3a3844" stroke-width=".35" fill="none" opacity=".8"/>
  <path d="M-10.6 -69.6C-11.2 -66 -8.6 -62.4 -4 -61.2" stroke="#f0a868" stroke-width=".5" fill="none" opacity=".45"/>
  <path d="M-4.8 -73.4C-2 -74.8 2.6 -74.8 5.2 -73.2L5 -71.8C2.2 -73 -2 -73 -4.6 -72Z" fill="#34323d"/>

  <!-- head in lost profile: turned a little to his right, down at the handheld. Right ear, cheek, glasses rim -->
  <g data-k="head">
    <path d="M10.4 -88.6C12.6 -88.2 14 -85.6 13.8 -82.6C13.6 -79.6 12 -76.6 9.4 -75.2C8.4 -74.8 7.4 -74.8 6.8 -75.2C8.6 -77 9.6 -79.6 9.8 -82.8Z" fill="${SKIN}"/>
    <path d="M13.7 -81.6C13.4 -79.4 12.4 -77.4 10.8 -76" stroke="${SKIN_L}" stroke-width=".45" fill="none" opacity=".8"/>
    <path d="M13.2 -82.8C13.6 -82 13.6 -81.2 13.3 -80.6" stroke="${SKIN_D}" stroke-width=".35" fill="none"/>
    <path d="M-7.4 -77C-9.2 -79 -9.9 -82.5 -9.7 -86l-.8 -.5 .7 -.4C-9.2 -90.4 -7.8 -92.8 -5.6 -94.2l-.3 -1.1 1.2 .6C-2.8 -96 -.4 -96.4 1.6 -96.3l.5 -1.1 .8 1.3C5.6 -95.8 8 -94.2 9.4 -91.6l1 -.1 -.6 .9C10.6 -88.4 10.6 -86 10.2 -84C9.8 -82.4 9.4 -80.6 8.8 -79.2C8 -77.2 6.4 -75.8 4.4 -75.2l-.8 1.2 -1 -1.1 -1 1.3 -1 -1.2 -1 1.1 -.9 -1.2C-5 -75.4 -6.4 -76 -7.4 -77Z" fill="#18151d"/>
    <path d="M-7.6 -88.6C-6.4 -92.4 -2.6 -94.6 1.8 -94.6C-1.6 -93.2 -4.8 -91 -6.4 -87.6Z" fill="#4a3d48" opacity=".85"/>
    <path d="M-8.4 -84.4C-8.2 -82 -7.4 -80 -6.2 -78.6C-7.8 -79.4 -8.8 -81.6 -8.4 -84.4Z" fill="#4a3d48" opacity=".6"/>
    <path data-k="rimTop" d="M-3 -95.6C1 -96.8 6 -95.6 8.8 -92.4C6.4 -93.8 2.6 -95 -3 -95.6Z" fill="#8fb4f0" opacity=".6"/>
    <path d="M1.2 -92.6c1.6 .2 2.6 1.4 2 2.8M-2.6 -89.4c1.2 -1.6 3.4 -2.2 5.2 -1.6M4.6 -88.2c1.4 1 2 2.6 1.6 4M-4.6 -84.6c1 -1.4 2.6 -2 4 -1.8M2 -80.4c1.2 -.2 2.4 .2 3 1" stroke="#2a2433" stroke-width=".4" fill="none" opacity=".8"/>
    <path d="M-8.7 -80.8C-9.5 -82.6 -9.8 -84.4 -9.7 -86M-9.4 -88.2C-8.9 -90.6 -7.6 -92.6 -5.9 -93.9" stroke="#f0a868" stroke-width=".55" fill="none" opacity=".6"/>
    <path d="M13.2 -86.4L9.8 -87.1Q8.9 -86.7 9.1 -84.6" stroke="#15131a" stroke-width=".55" fill="none"/>
    <path d="M9.3 -86.8C11.2 -87.6 12.3 -85.6 12 -83.4C11.7 -81.4 10.8 -80.2 9.6 -80.6C9.2 -82.6 9.1 -84.8 9.3 -86.8Z" fill="${SKIN}"/>
    <path d="M10 -85.6C11 -85.6 11.3 -84 11 -82.8C10.6 -82 10.2 -82.4 10.1 -83.4Z" fill="${SKIN_D}"/>
    <path d="M11.9 -84.6c.3 -1 .2 -1.8 -.2 -2.4" stroke="${SKIN_L}" stroke-width=".4" fill="none"/>
    <path d="M9 -88.4C10.6 -88.8 11.8 -88 12.2 -86.8C11 -87.2 10 -87 9.2 -86.4Z" fill="#18151d"/>
    <path d="M9.8 -87L13.4 -86.6" stroke="#15131a" stroke-width=".6"/>
    <path d="M13 -87.6C14.3 -86.8 14.6 -84.2 13.6 -82.8" stroke="#141218" stroke-width=".55" fill="none"/>
    <path d="M13.6 -86.8c.4 .5 .5 1.2 .4 1.8" stroke="#e9f6c8" stroke-width=".3" fill="none" opacity=".85"/>
  </g>

  <!-- light on him: the CRT ahead (cool), the lamp to his left (warm), the handheld (green) -->
  <circle data-k="tvkid" cx="18" cy="-118" r="70" fill="url(#opx-tvkid)" style="mix-blend-mode:screen"/>
  <circle cx="-80" cy="-80" r="90" fill="url(#opx-lampkid)" style="mix-blend-mode:screen"/>`
}

export const KID_DEFS = `
  <linearGradient id="opx-hoodie" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c2a33"/><stop offset=".5" stop-color="#1e1d24"/><stop offset="1" stop-color="#141318"/></linearGradient>
  <radialGradient id="opx-beanbag" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#b6404a"/><stop offset=".6" stop-color="#7c2430"/><stop offset="1" stop-color="#4a1420"/></radialGradient>
  <radialGradient id="opx-rugshade" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".15"/><stop offset=".6" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
  <linearGradient id="opx-gbbody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcd8cc"/><stop offset=".6" stop-color="#c8c3b6"/><stop offset="1" stop-color="#a9a497"/></linearGradient>
  <clipPath id="opx-lcdclip"><rect x="${LCD.x}" y="${LCD.y}" width="${LCD.w}" height="${LCD.h}"/></clipPath>
  <pattern id="opx-lcdgrid" width=".3" height=".3" patternUnits="userSpaceOnUse"><path d="M0 .015H.3M.015 0V.3" stroke="#7e9c0c" stroke-width=".03" fill="none"/></pattern>
  <radialGradient id="opx-gbglow"><stop offset="0" stop-color="#d8ff8a" stop-opacity=".35"/><stop offset="1" stop-color="#d8ff8a" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-tvkid"><stop offset="0" stop-color="#6f9fe8" stop-opacity=".5"/><stop offset="1" stop-color="#6f9fe8" stop-opacity="0"/></radialGradient>
  <radialGradient id="opx-lampkid"><stop offset="0" stop-color="#ffb35a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient>`
