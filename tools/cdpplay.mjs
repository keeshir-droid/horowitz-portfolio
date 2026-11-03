// Usage: node cdpplay.mjs <outDir> <url> <w> <h> [mobile] -- step step ...
// Steps: wait:ms | click[:x,y] | tap | key:ArrowRight | wheel:dy | shot:name | eval:js | cue (print the cue/dock state)
// Plays the story like a person: click, wait, screenshot. Prints console errors at the end.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const dash = argv.indexOf('--')
const [outDir, url, w, h, mob] = argv.slice(0, dash)
const steps = argv.slice(dash + 1)
mkdirSync(outDir, { recursive: true })
const port = 9300 + Math.floor(Math.random() * 500)
const prof = mkdtempSync(join(tmpdir(), 'cdp-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--hide-scrollbars',
  '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let wsUrl
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200)
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl
  } catch { /* not up yet */ }
}
if (!wsUrl) { console.error('no chrome'); chrome.kill(); process.exit(1) }
const ws = new WebSocket(wsUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
const logs = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('error ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300))
})
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: mob === 'mobile' })
if (mob === 'mobile') await send('Emulation.setTouchEmulationEnabled', { enabled: true })
await send('Page.navigate', { url })
await sleep(2500)
const W = Number(w), H = Number(h)
const stateJs = `(() => { const c=document.querySelector('.cue-card'); const d=document.querySelector('.story-dock'); const seg=document.querySelector('.story-seg[aria-current=step]'); return JSON.stringify({cue: c?.innerText?.replace(/\\n/g,' | ')||null, hash: location.hash, seg: seg?.innerText?.replace(/\\n/g,' ')||null, ready: !!document.querySelector('.story-next.is-ready')}) })()`
for (const st of steps) {
  const [cmd, ...rest] = st.split(':')
  const arg = rest.join(':')
  if (cmd === 'wait') await sleep(Number(arg))
  else if (cmd === 'click' || cmd === 'tap') {
    const [x, y] = arg ? arg.split(',').map(Number) : [W / 2, H / 2 - 40]
    if (cmd === 'tap') {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
    }
  } else if (cmd === 'key') {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: arg, code: arg, windowsVirtualKeyCode: { ArrowRight: 39, ArrowDown: 40, ArrowLeft: 37, ArrowUp: 38, Enter: 13 }[arg] ?? 0 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: arg, code: arg })
  } else if (cmd === 'down' || cmd === 'move' || cmd === 'up') {
    // press / drag / release the left button: down:x,y  move:x,y  up:x,y  (or an element: down:sel=.mt-hit)
    let [x, y] = [0, 0]
    if (arg.startsWith('sel=')) {
      const ev = await send('Runtime.evaluate', { expression: `(() => { const r = document.querySelector(${JSON.stringify(arg.slice(4))}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] })()`, returnByValue: true })
      ;[x, y] = ev.result.result.value
    } else [x, y] = arg.split(',').map(Number)
    const type = cmd === 'down' ? 'mousePressed' : cmd === 'up' ? 'mouseReleased' : 'mouseMoved'
    await send('Input.dispatchMouseEvent', { type, x, y, button: cmd === 'move' ? 'none' : 'left', buttons: cmd === 'up' ? 0 : 1, clickCount: 1 })
  } else if (cmd === 'wheel') {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: Number(arg) })
  } else if (cmd === 'eval') {
    const ev = await send('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true })
    console.log('eval:', JSON.stringify(ev.result?.result?.value ?? ev.result?.exceptionDetails?.text ?? ''))
  } else if (cmd === 'ready') {
    // like rest, but does not click afterwards
    let ok = false
    for (let i = 0; i < 160 && !ok; i++) {
      const ev = await send('Runtime.evaluate', { expression: "!!document.querySelector('.story-next.is-ready')", returnByValue: true })
      ok = ev.result?.result?.value === true
      if (!ok) await sleep(250)
    }
    await sleep(1300)
    const r = await send('Page.captureScreenshot', { format: 'png' })
    if (r.result?.data) writeFileSync(join(outDir, `${arg}.png`), Buffer.from(r.result.data, 'base64'))
    console.log('ready', arg, ok ? 'ready' : 'TIMEOUT')
  } else if (cmd === 'rest') {
    // wait until the story rests (NEXT is ready), screenshot it as <arg>, then click to continue
    let ok = false
    for (let i = 0; i < 160 && !ok; i++) {
      const ev = await send('Runtime.evaluate', { expression: "!!document.querySelector('.story-next.is-ready')", returnByValue: true })
      ok = ev.result?.result?.value === true
      if (!ok) await sleep(250)
    }
    await sleep(1300)
    const r = await send('Page.captureScreenshot', { format: 'png' })
    if (r.result?.data) writeFileSync(join(outDir, `${arg}.png`), Buffer.from(r.result.data, 'base64'))
    console.log('rest', arg, ok ? 'ready' : 'TIMEOUT')
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W - 14, y: H / 2 })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: W - 14, y: H / 2, button: 'left', buttons: 1, clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: W - 14, y: H / 2, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(300)
  } else if (cmd === 'cue') {
    const ev = await send('Runtime.evaluate', { expression: stateJs, returnByValue: true })
    console.log('state:', ev.result?.result?.value)
  } else if (cmd === 'shot') {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    if (r.result?.data) writeFileSync(join(outDir, `${arg}.png`), Buffer.from(r.result.data, 'base64'))
    console.log('shot', arg, r.result?.data ? 'ok' : JSON.stringify(r.error))
  }
}
if (logs.length) console.log(logs.slice(0, 20).join('\n'))
ws.close()
chrome.kill()
process.exit(0)
