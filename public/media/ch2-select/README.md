# Chapter 2 photo slots

The "choose your fighter" scene draws illustrated busts by default. To use a real photo instead, drop a file in this
folder and set its URL in `src/story/scenes/ch2-select/config.ts`:

```ts
export const PHOTOS = { karate: '/media/ch2-select/karate.jpg', stage: '', council: '', robotics: '' }
```

Specs
- Portrait orientation, head and shoulders, roughly 3:4 (min 900 x 1200 px). JPG/PNG/WebP, under 400 KB.
- Plain, uncluttered background preferred; face in the upper-middle, not cropped at the chin.
- The scene cover-fits it into the diagonal panel, boosts contrast (posterize look), adds a rim-light gradient and a
  slight skew. An empty string, a 404 or a failed load falls back to the illustrated bust.
- Only photos of Risheek himself; nothing invented.
