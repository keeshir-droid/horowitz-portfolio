// Local dev server for the /api handlers. Node built-ins only.
//   node api/_dev/server.mjs            (PORT env overrides 8787)
// Node strips TypeScript types natively; the hook below lets './x.js' imports resolve to './x.ts'.
import http from 'node:http'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && specifier.endsWith('.js')) {
        return nextResolve(specifier.slice(0, -3) + '.ts', context)
      }
      throw err
    }
  },
})

const here = path.dirname(fileURLToPath(import.meta.url))
const apiDir = path.resolve(here, '..')
const routes = {}
for (const name of ['contact', 'hit', 'stats']) {
  routes['/api/' + name] = (await import(pathToFileURL(path.join(apiDir, name + '.ts')).href)).default
}

const port = Number(process.env.PORT || 8787)
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  const handler = routes[pathname]
  if (!handler) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end('{"ok":false,"code":"not_found","message":"Not found."}')
    return
  }
  if (process.env.PRELOAD_BODY === '1' && req.method === 'POST') {
    // Simulates Vercel's helpers: body already consumed and exposed as req.body (parsed JSON or string).
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      try {
        req.body = (req.headers['content-type'] || '').includes('json') ? JSON.parse(text) : text
      } catch {
        req.body = text
      }
      Promise.resolve(handler(req, res)).catch(() => res.end())
    })
    return
  }
  Promise.resolve(handler(req, res)).catch(() => {
    if (!res.headersSent) res.statusCode = 500
    res.end()
  })
})
server.listen(port, '127.0.0.1', () => console.log(`api dev server on http://127.0.0.1:${port}`))
