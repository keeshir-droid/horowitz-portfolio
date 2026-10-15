/**
 * Chapter 4: the HTML inside the CRT (a 2000s-style desktop, evoked only: no real OS name, logo or wallpaper photo).
 * Built once; stage.ts paints it. Sizes: boxes in container units of the 4:3 screen (cqw/cqh), all text in em of the
 * `.c4-in` base (2.9 % of the screen height on desktop, x PHONE_TEXT on phone), so nothing drops below ~2.6 % of the
 * screen height. Window texts are illustrative UI; the achievement claims themselves come from src/content (unlock
 * cards) and the numbers from config.ts (DECOR mirrors entries.ts).
 */
import { projects, projectsLive, TOTAL_PROJECTS } from '../../../content/projects'
import { CUSTOMERS } from './config'

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export const HUES = ['#3f78e0', '#d9487a', '#e07b2a', '#c9a40e', '#1f9bd6', '#8a5ad8', '#2f9e4a'] as const

const btns = (n: 1 | 3): string => (n === 3 ? '<b></b><b></b><b class="x"></b>' : '<b class="x"></b>')

function win(cls: string, title: string, body: string, opts: { tb?: string; n?: 1 | 3; pre?: string } = {}): string {
  return `<div class="c4-win ${cls}" data-w="${cls}"><div class="c4-tb ${opts.tb ?? ''}"><span class="t">${title}</span>${btns(opts.n ?? 3)}</div>${opts.pre ?? ''}<div class="c4-wb">${body}</div></div>`
}

const addr = (path: string): string => `<div class="c4-addr"><span class="c4-addr-l">Address</span><span class="c4-addr-box">${path}</span></div>`

// ── wallpaper: original rolling hills under a blue sky ──
const WALLPAPER = `<svg class="c4-wallpaper" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="c4dSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f76d6"/><stop offset=".65" stop-color="#8cc1f0"/><stop offset="1" stop-color="#cfe6fa"/></linearGradient>
<linearGradient id="c4dHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78c242"/><stop offset="1" stop-color="#2f7d1f"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#c4dSky)"/>
<g fill="#fff" opacity=".85"><ellipse cx="90" cy="70" rx="46" ry="12"/><ellipse cx="120" cy="62" rx="30" ry="12"/><ellipse cx="300" cy="96" rx="52" ry="10"/><ellipse cx="270" cy="88" rx="26" ry="10"/></g>
<path d="M0 214 Q110 160 230 190 T400 176 V300 H0Z" fill="#5aa835"/><path d="M0 236 Q150 196 280 222 T400 210 V300 H0Z" fill="url(#c4dHill)"/></svg>`

const ICON_SVG = {
  inbox: '<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="22" rx="2" fill="#fff" stroke="#3d5f9e" stroke-width="2"/><path d="M5 10 L20 22 L35 10" stroke="#3d5f9e" stroke-width="2" fill="none"/></svg>',
  folder: '<svg viewBox="0 0 40 40"><path d="M3 10 h13 l3 4 h18 v20 h-34z" fill="#f6d36b" stroke="#a07a10" stroke-width="1.5"/></svg>',
  shop: '<svg viewBox="0 0 40 40"><path d="M6 20 L20 7 L34 20 V35 H6Z" fill="#f2a65a" stroke="#8b4a10" stroke-width="1.5"/><rect x="16" y="24" width="8" height="11" fill="#7a3d2c"/></svg>',
  test: '<svg viewBox="0 0 40 40"><rect x="6" y="6" width="28" height="28" rx="4" fill="#fff" stroke="#2f8a2f" stroke-width="2"/><path d="M12 22 l6 6 l11 -14" stroke="#2f8a2f" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
}

const ICONS = `<div class="c4-icons">
<div class="c4-icon" data-k="iconInbox">${ICON_SVG.inbox}<span>Inbox</span><em data-k="mailBadge">1</em></div>
<div class="c4-icon">${ICON_SVG.folder}<span>21 in 21</span></div>
<div class="c4-icon">${ICON_SVG.shop}<span>Décor Tycoon</span></div>
<div class="c4-icon">${ICON_SVG.test}<span>Idea Tester</span></div></div>`

// ── windows ──
const MAIL = win(
  'w-mail',
  'Inbox · 1 new message',
  `<div class="mail-head"><div><b>From:</b> Office of Undergraduate Admissions</div><div><b>Subject:</b> Your admission decision</div></div>
<div class="mail-body"><p>Dear Risheek,</p><p><b>Congratulations!</b> We are delighted to offer you admission.</p><p class="mail-uni">A top-30 US university · Film + Computer Science</p></div>`,
)

const ERR = win(
  'w-err',
  'Visa application',
  `<div class="err-row"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#e0402a" stroke="#9b1d0e" stroke-width="2"/><path d="M13 13 L27 27 M27 13 L13 27" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg><div>Your student visa did not come through.</div></div><div class="err-ok"><span class="c4-btn">OK</span></div>`,
  { n: 1 },
)

const SETUP = win(
  'w-setup',
  'Setup · Startup accelerator (India)',
  `<div class="setup-side">Builder<br/>mode</div>
<div class="setup-main"><div class="setup-h">Plan B, installing</div>
<div class="setup-line" data-k="setupLine">Joining a startup accelerator in India…</div>
<div class="setup-bar"><i data-k="setupBar"></i></div>
<div class="setup-btns"><span class="c4-btn dim">&lt; Back</span><span class="c4-btn" data-k="setupNext">Next &gt;</span></div></div>`,
  { n: 1 },
)

const PET = win(
  'w-pet',
  '[brand name] · product sheet.doc',
  `<div class="pet-h" data-step="0">A prebiotic for dogs</div>
<div class="pet-sub" data-step="0">Helps dogs digest their food better.</div>
<div class="pet-flow">
  <div class="pet-step" data-step="1"><svg viewBox="0 0 80 64" aria-hidden="true"><ellipse cx="40" cy="30" rx="30" ry="9" fill="#9a6a3a"/><circle cx="28" cy="27" r="5" fill="#7a4a22"/><circle cx="40" cy="24" r="5" fill="#8a5a2a"/><circle cx="52" cy="27" r="5" fill="#7a4a22"/><path d="M8 32 h64 l-8 20 h-48z" fill="#c95a3a"/><path d="M14 40 h52" stroke="#a8432a" stroke-width="3"/></svg><b>Food</b></div>
  <div class="pet-arrow" data-step="2">→</div>
  <div class="pet-step" data-step="2"><svg viewBox="0 0 80 64" aria-hidden="true"><rect x="22" y="4" width="36" height="9" rx="3" fill="#2f7a3c"/><rect x="18" y="12" width="44" height="50" rx="8" fill="#e8f4ea" stroke="#2f7a3c" stroke-width="3"/><rect x="18" y="28" width="44" height="16" fill="#2f7a3c"/><circle cx="32" cy="52" r="3" fill="#7bbf86"/><circle cx="44" cy="55" r="3" fill="#7bbf86"/><circle cx="50" cy="50" r="2.5" fill="#7bbf86"/></svg><b>Prebiotic</b><span>[brand name]</span></div>
  <div class="pet-arrow" data-step="3">→</div>
  <div class="pet-step" data-step="3"><svg viewBox="0 0 80 64" aria-hidden="true"><path d="M18 14 q-12 4 -10 26 q8 2 14 -10z" fill="#8a5a2a"/><path d="M62 14 q12 4 10 26 q-8 2 -14 -10z" fill="#8a5a2a"/><ellipse cx="40" cy="34" rx="24" ry="24" fill="#d9a066"/><ellipse cx="40" cy="44" rx="13" ry="10" fill="#f1d3ad"/><circle cx="31" cy="28" r="3.4" fill="#222"/><circle cx="49" cy="28" r="3.4" fill="#222"/><ellipse cx="40" cy="38" rx="5" ry="3.6" fill="#222"/><path d="M33 46 q7 6 14 0" stroke="#222" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M40 50 q0 8 5 8 q4 0 4 -7" fill="#e86a7a"/></svg><b>Digests better</b></div>
</div>
<div class="pet-note" data-step="4">Prebiotic formulation · for dogs</div>`,
)

/** Shop shelves: item positions (shop SVG units) and kinds. */
export const SHOP_ITEMS: readonly (readonly [number, number, string])[] = [
  [42, 80, 'lamp'],
  [88, 80, 'vase'],
  [134, 80, 'frame'],
  [42, 142, 'plant'],
  [88, 142, 'cushion'],
  [134, 142, 'clock'],
]
const ITEM_SVG: Record<string, string> = {
  lamp: '<path d="M-14 -8 L14 -8 L9 -28 L-9 -28Z" fill="#f2d94a" stroke="#b39a1a" stroke-width="1.2"/><rect x="-2" y="-8" width="4" height="8" fill="#7a5a3a"/>',
  vase: '<path d="M-8 0 Q-15 -14 -5 -28 L5 -28 Q15 -14 8 0Z" fill="#3f78e0"/>',
  frame: '<rect x="-14" y="-30" width="28" height="30" fill="#c9a24a"/><rect x="-9" y="-25" width="18" height="20" fill="#8fd0e8"/>',
  plant: '<path d="M-9 0 L-7 -12 L7 -12 L9 0Z" fill="#c95a3a"/><circle cx="-5" cy="-19" r="8" fill="#3f9e45"/><circle cx="5" cy="-22" r="8" fill="#5bb562"/>',
  cushion: '<rect x="-16" y="-20" width="32" height="20" rx="7" fill="#d9487a"/>',
  clock: '<circle cy="-14" r="13" fill="#fff" stroke="#333" stroke-width="2.4"/><path d="M0 -14 V-22 M0 -14 H7" stroke="#333" stroke-width="2.4"/>',
}

const SHOP = `<svg class="tyc-shop" viewBox="0 0 240 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
<rect width="240" height="200" fill="#f6e7cf"/>
<g stroke="#ead6b4" stroke-width="1">${Array.from({ length: 13 }, (_, i) => `<path d="M${i * 22 - 40} 200 L${i * 22 + 60} 0"/>`).join('')}</g>
<rect width="240" height="34" fill="#e9b97f"/><rect y="30" width="240" height="5" fill="#c98f4f"/>
<text x="120" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="17" font-weight="bold" fill="#4a240c">[ brand name ]</text>
<rect x="16" y="80" width="146" height="8" rx="2" fill="#8a5a30"/><rect x="16" y="142" width="146" height="8" rx="2" fill="#8a5a30"/>
${SHOP_ITEMS.map(([x, y, k], i) => `<g data-item="${i}" transform="translate(${x} ${y})">${ITEM_SVG[k]}</g>`).join('')}
<rect x="178" y="150" width="56" height="34" rx="3" fill="#6a4526"/><text x="206" y="172" text-anchor="middle" font-family="Tahoma,Verdana,sans-serif" font-size="12" font-weight="bold" fill="#ffe7a8">TILL</text>
<rect x="0" y="150" width="9" height="50" fill="#5a3a22"/>
${Array.from({ length: CUSTOMERS }, (_, i) => `<g data-cust="${i}" style="display:none"><circle cy="-26" r="7.5" fill="#f1c9a5"/><rect x="-8" y="-18" width="16" height="20" rx="5" fill="${HUES[(i * 3) % HUES.length]}"/></g>`).join('')}
${Array.from({ length: 3 }, (_, i) => `<text data-plus="${i}" x="206" y="140" text-anchor="middle" font-family="Tahoma,Verdana,sans-serif" font-size="16" font-weight="bold" fill="#1f7a2c" style="display:none">+$</text>`).join('')}
</svg>`

const TYC = win(
  'w-tyc',
  'Décor Tycoon',
  `<div class="tyc-top">
  <div class="tyc-cash"><span class="lbl">REVENUE</span><span class="val" data-k="cash">$0</span></div>
  <span class="tyc-chip">STARTED WITH $60</span>
  <div class="tyc-time"><span class="lbl">TIME</span><span class="tyc-bar"><i data-k="timebar"></i></span><span class="lbl">6 MONTHS</span></div>
</div>
<div class="tyc-main">
  <div class="tyc-floor">${SHOP}</div>
  <div class="tyc-side" data-k="tycSide">
    <div class="tyc-graphbox"><div class="tyc-h">SALES</div>
    <svg class="tyc-graph" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 H100" stroke="#8a6a4a"/><path data-k="gline" d="M0 60" fill="none" stroke="#f2c14e" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg></div>
    <div class="tyc-done" data-k="tycDone">Close to <b>$16,000</b> in revenue, in under six months.</div>
    <div class="tyc-int"><span>INVESTOR INTEREST</span><span class="tyc-bar"><i data-k="interest"></i></span></div>
    <div class="tyc-msg" data-k="tycMsg"><b>✉ New message</b><br/>An investor would like to talk.</div>
  </div>
</div>`,
)

const POSTS = [
  'Building a décor brand from $60.',
  'Selling décor like fashion: what I learned.',
  'Notes from the accelerator.',
  'Prototyping is a habit, not a phase.',
  'Shipped: a tool that tests ideas with AI.',
]
const FEED = win(
  'w-feed',
  'Feed · Browser',
  `<div class="feed-prof"><span class="feed-av">RN</span><span class="feed-name">Risheek Nawka</span><span class="feed-fol">followers <svg viewBox="0 0 40 20" aria-hidden="true">${[0, 1, 2, 3, 4]
    .map((i) => `<rect data-fb="${i}" x="${i * 8 + 1}" y="0" width="6" height="20" fill="#1f5fd0"/>`)
    .join('')}</svg></span></div>
<div class="feed-posts" data-k="posts">${POSTS.map(
    (p, i) =>
      `<div class="feed-post"><b>${esc(p)}</b><div class="feed-img" style="background:linear-gradient(135deg,${HUES[(i * 2) % 7]},${HUES[(i * 2 + 3) % 7]})"></div><div class="feed-act">♥ Like · Comment · Share</div></div>`,
  ).join('')}</div>`,
  { pre: addr('feed.example/risheek') },
)

const CHAT = win(
  'w-chat',
  'Chat · Accelerator team',
  `<div class="chat-l"><b class="tm">team:</b> one of India's biggest investors is visiting. She saw your posts.</div>
<div class="chat-l" data-k="chat2"><b class="tm">team:</b> want to pitch?</div>
<div class="chat-typing" data-k="chatTyping">Risheek is typing…</div>
<div class="chat-l" data-k="chatYes"><b class="me">risheek:</b> yes.</div>`,
  { tb: 'tb-green', n: 1 },
)

const PITCH = `<div class="c4-full c4-pitch" data-k="pitch">
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><radialGradient id="c4Spot" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#fff6d8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="300" fill="#0a0806"/>
<rect x="150" y="34" width="226" height="134" fill="#f6efe2"/>
<text x="263" y="84" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="#2a1a10">The pitch</text>
<rect x="185" y="104" width="156" height="7" fill="#c9b48f"/><rect x="185" y="120" width="120" height="7" fill="#c9b48f"/><rect x="185" y="136" width="140" height="7" fill="#c9b48f"/>
<path data-k="spot" d="M70 0 L20 300 L150 300 L110 0Z" fill="url(#c4Spot)"/>
<g data-k="presenter" fill="#120d09"><circle cx="85" cy="186" r="15"/><path d="M60 300 Q62 210 85 206 Q108 210 110 300Z"/><g fill="none" stroke="#5a5a5a" stroke-width="1.6"><circle cx="80" cy="185" r="3.6"/><circle cx="90" cy="185" r="3.6"/><path d="M83.6 185h2.8"/></g></g>
<ellipse cx="85" cy="296" rx="60" ry="8" fill="#fff6d8" opacity=".18"/>
<g fill="#000"><circle cx="210" cy="292" r="14"/><circle cx="250" cy="296" r="14"/><circle cx="290" cy="292" r="14"/><circle cx="330" cy="296" r="14"/><circle cx="370" cy="292" r="14"/></g>
</svg>
<div class="pitch-cap" data-k="pitchCap">Pitching to one of India's biggest investors</div>
</div>`

function tile(i: number): string {
  const p = projects[i]
  const shipped = !!(p.url || p.kind === 'skill')
  if (!shipped) return `<div class="fold-lock" data-tile="${i}"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="1.5" fill="#6b6b6b"/><path d="M6.5 9 V6.5 a3.5 3.5 0 0 1 7 0 V9" stroke="#6b6b6b" stroke-width="2" fill="none"/></svg><span>${p.day}</span></div>`
  const inner = `<span class="fold-ic" style="background:${HUES[i % HUES.length]}">${p.day}</span><span class="fold-name">${esc(p.title)}</span>`
  return p.url
    ? `<a class="fold-tile" data-tile="${i}" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" title="${esc(p.blurb)}" aria-label="Day ${p.day}: ${esc(p.title)} (opens in a new tab)">${inner}</a>`
    : `<div class="fold-tile" data-tile="${i}" title="${esc(p.blurb)}">${inner}</div>`
}

const shippedIdx = projects.map((p, i) => (p.url || p.kind === 'skill' ? i : -1)).filter((i) => i >= 0)
const lockedIdx = projects.map((p, i) => (p.url || p.kind === 'skill' ? -1 : i)).filter((i) => i >= 0)
/** Shipped tiles in pop-in order, then locked ones. */
export const TILE_ORDER: readonly number[] = [...shippedIdx, ...lockedIdx]
export const SHIPPED_COUNT = shippedIdx.length

const FOLD = win(
  'w-fold',
  `${TOTAL_PROJECTS} in ${TOTAL_PROJECTS}`,
  `<div class="fold-intro"><b>${TOTAL_PROJECTS} projects in ${TOTAL_PROJECTS} days.</b><span class="fold-more"> Small, free, phone-first creative tools, each shipped with a reel.</span></div>
<div class="fold-lbl">SHIPPED</div>
<div class="fold-grid">${shippedIdx.map(tile).join('')}</div>
<div class="fold-lbl fold-next">COMING NEXT</div>
<div class="fold-locks">${lockedIdx.map(tile).join('')}</div>
<div class="fold-detail" data-k="foldDetail"><b></b> <span></span></div>
<div class="fold-status" data-k="foldStatus">${projectsLive} of ${TOTAL_PROJECTS} shipped · click one to open it</div>`,
  { pre: addr(`C:\\Projects\\${TOTAL_PROJECTS} in ${TOTAL_PROJECTS}`) },
)

const LAMP = (c: string, i: number): string =>
  `<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="${14 + i * 2}" rx="${10 + i * 3}" ry="${6 + (i % 2) * 2}" fill="${c}" stroke="#6a8a9a" stroke-width=".8"/><ellipse cx="${13 - i}" cy="${12 + i * 2}" rx="6" ry="5" fill="${c}" stroke="#6a8a9a" stroke-width=".8"/><rect x="18.8" y="${20 + i * 2}" width="2.4" height="${12 - i * 2}" fill="#7a5a3a"/><rect x="14" y="32" width="12" height="2.4" fill="#7a5a3a"/></svg>`
export const VOTES = [21, 62, 17] as const
const TEST = win(
  'w-test',
  'Idea Tester',
  `<div class="test-sub">Test a design with AI customers before you spend on it.</div>
<div class="test-input"><span data-k="typed"></span><span class="caret" data-k="caret">|</span></div>
<div class="test-vars">${['#9ec5ff', '#ffffff', '#ffd27a']
    .map(
      (c, i) =>
        `<div class="test-var" data-var="${i}"><div class="test-img">${LAMP(c, i)}</div><b>Variant ${'ABC'[i]}</b><div class="test-bar"><i class="${i === 1 ? 'win' : ''}"></i></div><div class="test-pct">0% would buy</div>${i === 1 ? '<div class="test-winner">★ winner</div>' : ''}</div>`,
    )
    .join('')}</div>
<div class="test-lbl" data-k="voteLbl">AI customers voting…</div>`,
)

const AD = win(
  'w-ad',
  'Ad Maker',
  `<div class="ad-row"><div class="ad-photo">product photo</div><div class="ad-arrow">→</div>
<div class="ad-out" data-k="adOut"><svg viewBox="0 0 40 50" aria-hidden="true"><ellipse cx="20" cy="20" rx="11" ry="7" fill="#fff"/><ellipse cx="14" cy="18" rx="6" ry="5" fill="#fff"/><rect x="18.5" y="26" width="3" height="11" fill="#7a3d2c"/><rect x="14" y="37" width="12" height="2.5" fill="#7a3d2c"/></svg><span>Bring the sky home.</span></div></div>
<div class="ad-prog"><div class="ad-bar"><i data-k="adBar"></i></div><span data-k="adLbl">Rendering…</span></div>`,
  { n: 1 },
)

const BADGE = `<div class="c4-badge" data-k="badge">
<svg class="badge-strap" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M30 0 L44 56 M70 0 L56 56" stroke="#d6342c" stroke-width="9"/><rect x="40" y="48" width="20" height="12" rx="3" fill="#999"/></svg>
<div class="badge-card"><div class="badge-top"><b>PRODUCT FOLKS</b><span>UNCONFERENCE 2025</span></div>
<div class="badge-name">RISHEEK<br/>NAWKA</div><div class="badge-pill">YOUNGEST ATTENDEE</div></div></div>`

const CLASS = win(
  'w-class',
  'Prototyping class.ppt',
  `<div class="cls-h">A prototyping class I designed and taught</div>
<div class="cls-flow"><span data-fw="0">Sketch</span><i data-fw="1">→</i><span data-fw="1">Build</span><i data-fw="2">→</i><span data-fw="2">Test</span></div>
<div class="cls-sub">Run with my accelerator. People from outside came too.</div>
<div class="cls-seats">${Array.from({ length: 16 }, () => '<svg viewBox="0 0 20 22" aria-hidden="true"><circle cx="10" cy="7" r="5"/><path d="M1 22 q1 -10 9 -10 q8 0 9 10z"/></svg>').join('')}</div>`,
  { tb: 'tb-orange' },
)

const CURSOR = `<svg class="c4-cursor" data-k="cursor" viewBox="0 0 12 19" aria-hidden="true"><path d="M1 1 L1 16 L4.6 12.6 L7.2 18 L9.4 17 L6.9 11.7 L11.4 11.7Z" fill="#fff" stroke="#000" stroke-width="1.1" stroke-linejoin="round"/></svg>`

const CONT = `<div class="c4-full c4-cont" data-k="cont"><div class="cont-q" data-k="contQ">CONTINUE?</div><div class="cont-n" data-k="contN">9</div><div class="cont-s" data-k="contS">PRESS START</div></div>`
const BOOT = `<div class="c4-full c4-boot" data-k="boot"><div class="boot-logo">R<span>N</span></div><div class="boot-sub">Risheek's PC</div><div class="boot-bar"><i></i><i></i><i></i></div></div>`

export const SCREEN_HTML = `<div class="c4-in">
<div class="c4-desk" data-k="desk">${WALLPAPER}${ICONS}
${MAIL}${SETUP}${PET}${TYC}${FEED}${CHAT}${FOLD}${TEST}${AD}${CLASS}${BADGE}${ERR}
<div class="c4-taskbar"><div class="c4-start"><i></i>start</div><div class="c4-tasks" data-k="tasks"></div><div class="c4-tray">11:47 PM</div></div>
${CURSOR}</div>
${PITCH}${CONT}${BOOT}
<div class="c4-full c4-black" data-k="black"><div class="c4-line" data-k="line"></div></div>
</div>
<div class="c4-crt"></div><div class="c4-glare"></div>`
