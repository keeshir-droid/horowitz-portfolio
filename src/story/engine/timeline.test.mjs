// Run: node src/story/engine/timeline.test.mjs   (Node 22.18+ / 24 strips TS types natively)
import assert from 'node:assert/strict'
import { buildTimeline, locate } from './timeline.ts'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)
const scenes = [
  { id: 'a', chapter: 1, duration: 10, entryIds: [] },
  { id: 'b', chapter: 1, duration: 30, entryIds: [] },
  { id: 'c', chapter: 2, duration: 5, entryIds: [] },
]
const weights = { 1: 25, 2: 75 }
const tl = buildTimeline(scenes, weights)

near(tl.slots[0].start, 0)
near(tl.slots[0].end, 0.0625) // 0.25 * 10/40
near(tl.slots[1].end, 0.25)
near(tl.slots[2].start, 0.25)
near(tl.slots[2].end, 1)

assert.deepEqual(locate(tl, 0), { sceneIndex: 0, sceneProgress: 0 })
assert.equal(locate(tl, 0.1).sceneIndex, 1)
assert.equal(locate(tl, 0.0625).sceneIndex, 1) // a boundary belongs to the next scene
near(locate(tl, 0.0625).sceneProgress, 0)
near(locate(tl, 0.625).sceneProgress, 0.5)
assert.deepEqual(locate(tl, 1), { sceneIndex: 2, sceneProgress: 1 })
assert.deepEqual(locate(tl, 5), { sceneIndex: 2, sceneProgress: 1 }) // clamp high
assert.deepEqual(locate(tl, -3), { sceneIndex: 0, sceneProgress: 0 }) // clamp low
assert.equal(locate(tl, NaN).sceneIndex, 0)

// Only chapters present share the weight: ch1 alone fills 0..1.
near(buildTimeline(scenes.slice(0, 2), weights).slots[1].end, 1)
// Empty list is safe.
assert.deepEqual(locate(buildTimeline([], weights), 0.5), { sceneIndex: 0, sceneProgress: 0 })
// A zero-duration scene gets a zero-length slot and is never located.
const z = buildTimeline(
  [
    { id: 'z', chapter: 1, duration: 0, entryIds: [] },
    { id: 'y', chapter: 1, duration: 4, entryIds: [] },
  ],
  { 1: 1 },
)
assert.equal(locate(z, 0.3).sceneIndex, 1)
// Slots are contiguous and cover 0..1.
for (let i = 1; i < tl.slots.length; i++) near(tl.slots[i].start, tl.slots[i - 1].end)

console.log('timeline.test.mjs: all assertions passed')
