/**
 * Chapter 3 cover and the arcade hand-over frame (static HTML strings). ENGINE-owned.
 * Cover (approved prototype): solid blue hardcover, a taped lined-paper panel with the hand-lettered title, the kid
 * holding a suitcase, the author's name. No facts beyond his name and the chapter number.
 */
import { INK, kid } from './kit'

export const COVER_COPY = {
  chapter: 'CHAPTER 3',
  kicker: 'Diary of a',
  title: ['BOARDING', 'SCHOOL KID'],
  author: 'Risheek Nawka',
}

export const ARCADE_COPY = { saving: 'SAVING', sub: 'DO NOT TURN OFF' }

const SUITCASE = `<rect x="10.5" y="-16" width="12" height="9" rx="1.4" fill="#fff"/><path d="M14.5,-16 Q16.5,-19 18.5,-16" fill="none"/><path d="M10.5,-11.5 L22.5,-11.5" stroke="${INK}" stroke-width=".5"/>`

export const COVER_HTML = `<div class="c3-cch">${COVER_COPY.chapter}</div>
<div class="c3-cpanel"><div class="c3-tape c3-t1"></div><div class="c3-tape c3-t2"></div>
  <div class="c3-cdiary">${COVER_COPY.kicker}</div><div class="c3-ctitle">${COVER_COPY.title.join('<br>')}</div></div>
<svg class="c3-ckid" viewBox="0 0 40 52" aria-hidden="true">${kid(20, 51, 0.98, { armL: 14, armR: 40, extra: SUITCASE })}</svg>
<div class="c3-cauth">${COVER_COPY.author}</div>`

/** 8-segment save bar + blinking dots; `fill` 0..1 and `dots` 0..3 are set per frame. */
export const ARCADE_HTML = `<div class="c3-arc-big">${ARCADE_COPY.saving}<span class="c3-arc-dots"></span></div>
<div class="c3-arc-bar">${'<i></i>'.repeat(8)}</div>
<div class="c3-arc-sub">${ARCADE_COPY.sub}</div>`
