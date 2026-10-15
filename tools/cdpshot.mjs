// Usage: node cdpshot.mjs <outDir> <wait_ms> "name|url|w|h[|mobile]" ...
// Launches headless Chrome with remote debugging, captures each URL via Page.captureScreenshot (viewport only).
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [outDir, waitStr, ...shots] = process.argv.slice(2)
const wait = Number(waitStr) || 3000
mkdirSync(outDir, { recursive: true })
const port = 9300 + Math.floor(Math.random() * 500)
const prof = mkdtempSync(join(tmpdir(), 'cdp-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--hide-scrollbars',
  '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
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
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push(m.params.type + ' ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300))
})
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Runtime.enable')
await send('Page.enable')
for (const s of shots) {
  const [name, url, w, h, mob, js] = s.split('|')
  await send('Emulation.setDeviceMetricsOverride', { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: mob === 'mobile' })
  if (mob === 'reduced') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  else await send('Emulation.setEmulatedMedia', { features: [] })
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(100)
  await send('Page.navigate', { url })
  await sleep(wait)
  if (js && js.startsWith('drag:')) {
    const sel = js.slice(5)
    const ev = await send('Runtime.evaluate', { expression: `(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + r.height / 2, r.width / 2] : null })()`, returnByValue: true })
    const v = ev.result?.result?.value
    console.log(name, 'drag target', JSON.stringify(v))
    if (v) {
      const [cx, cy, rr] = v
      const R = rr * 0.7
      const pt = (a) => ({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R })
      let p0 = pt(0)
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p0.x, y: p0.y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p0.x, y: p0.y, button: 'left', buttons: 1, clickCount: 1 })
      for (let i = 1; i <= 24; i++) { const q = pt((i / 24) * Math.PI * 1.5); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x, y: q.y, button: 'left', buttons: 1 }); await sleep(16) }
      const q = pt(Math.PI * 1.5)
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: q.x, y: q.y, button: 'left', buttons: 0, clickCount: 1 })
      await sleep(500)
    }
  } else if (js) { const ev = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }); console.log(name, 'eval:', JSON.stringify(ev.result?.result?.value ?? ev.result?.exceptionDetails?.text ?? '')); await sleep(1500) }
  const r = await send('Page.captureScreenshot', { format: 'png' })
  if (r.result?.data) writeFileSync(join(outDir, `${name}.png`), Buffer.from(r.result.data, 'base64'))
  console.log(name, r.result?.data ? 'ok' : JSON.stringify(r.error))
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'))
ws.close()
chrome.kill()
process.exit(0)
