/**
 * The kid, Pokemon Red/Blue overworld style: big head, small body, 10x13 art + 1px black outline (12x15 sprite).
 * 3 directions (front/back/side, side is mirrored for left) x walk cycle + idle + blink.
 * Short dark hair, round glasses, light-brown skin, black jacket, white tee collar, jeans, white sneakers. No uniform.
 * Maps: K hair, J jacket, H jacket highlight, S skin, s skin shade, D glasses frame, L lens, W white, B jeans.
 */
const COL: Record<string, string> = {
  K: '#14141e', J: '#2a2a36', H: '#454558', S: '#d9a066', s: '#b57a45', D: '#14141e', L: '#e8f6ff', W: '#ffffff', B: '#3f64b0',
}
const OUTLINE = '#07070c'

const FRONT_TOP = [
  '..KKKKKK..', '.KKKKKKKK.', '.KKSSSSKK.', '.SDLSSLDS.', '.SSSSSSSS.', '..ssssss..',
  '.JJWWWWJJ.', 'JJJJWWJJJJ', 'SJJJJJJJJS', '.JJJJJJJJ.',
]
const BACK_TOP = [
  '..KKKKKK..', '.KKKKKKKK.', '.KKKKKKKK.', '.KKKKKKKK.', '.KKKKKKKK.', '..KssssK..',
  '.JJJJJJJJ.', 'JJJJHHJJJJ', 'SJJJJJJJJS', '.JJJJJJJJ.',
]
const SIDE_TOP = [
  '..KKKKK...', '.KKKKKKK..', '.KKKKSSK..', '.KKKSDLS..', '.KKSSSSS..', '..KsssS...',
  '..JJJJJJ..', '.JJJJWJJ..', '.JJJJJJS..', '..JJJJJ...',
]
// legs (3 rows) per frame: 0 step A, 1 stand, 2 step B, 3 stand, 4 idle
const FRONT_LEGS = [
  ['..BBBBBB..', '..BB..BB..', '..WW......'],
  ['..BBBBBB..', '..BB..BB..', '..WW..WW..'],
  ['..BBBBBB..', '..BB..BB..', '......WW..'],
  ['..BBBBBB..', '..BB..BB..', '..WW..WW..'],
  ['..BBBBBB..', '..BB..BB..', '..WW..WW..'],
]
const SIDE_LEGS = [
  ['..BBBBB...', '.BB...BB..', '.WW...WW..'],
  ['..BBBBB...', '...BBB....', '...WWW....'],
  ['..BBBBB...', '..BB.BB...', '..WW.WW...'],
  ['..BBBBB...', '...BBB....', '...WWW....'],
  ['..BBBBB...', '..BB.BB...', '..WW.WW...'],
]

/** Frame index: 0..3 walk (0 and 2 are the foot-contact frames), 4 idle, 5 blink. */
export const F_IDLE = 4
export const F_BLINK = 5
export const D_FRONT = 0
export const D_BACK = 1
export const D_SIDE = 2

export interface KidSprite {
  c: HTMLCanvasElement
  w: number
  h: number
}

function bake(rows: string[]): KidSprite {
  const h = rows.length
  const w = rows[0].length
  const c = document.createElement('canvas')
  c.width = w + 2
  c.height = h + 2
  const g = c.getContext('2d')!
  const at = (x: number, y: number): string => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x])
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y)
      if (ch !== '.') g.fillStyle = COL[ch] ?? '#f0f'
      else if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') g.fillStyle = OUTLINE
      else continue
      g.fillRect(x + 1, y + 1, 1, 1)
    }
  }
  return { c, w: w + 2, h: h + 2 }
}

/** sprites[dir][frame]; each canvas includes the 1px black outline. */
export function bakeKid(): KidSprite[][] {
  const mk = (top: string[], legs: string[][], blink?: [number, string]): KidSprite[] =>
    [...legs, legs[4]].map((l, f) => {
      const t = top.slice()
      if (f === F_BLINK && blink) t[blink[0]] = blink[1]
      return bake([...t, ...l])
    })
  return [mk(FRONT_TOP, FRONT_LEGS, [3, '.SDDSSDDS.']), mk(BACK_TOP, FRONT_LEGS), mk(SIDE_TOP, SIDE_LEGS, [3, '.KKKSDDS..'])]
}
