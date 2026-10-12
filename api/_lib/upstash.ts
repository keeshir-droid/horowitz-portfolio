export type RedisCmd = ReadonlyArray<string | number>
export type RedisReply = { result?: unknown; error?: string }

export function upstashConfigured(): boolean {
  return Boolean(process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN'])
}

/**
 * Run commands through the Upstash REST pipeline endpoint using plain fetch.
 * Returns null when not configured or on any failure (callers must degrade silently).
 */
export async function pipeline(cmds: readonly RedisCmd[]): Promise<RedisReply[] | null> {
  const base = process.env['UPSTASH_REDIS_REST_URL']
  const token = process.env['UPSTASH_REDIS_REST_TOKEN']
  if (!base || !token) return null
  try {
    const r = await fetch(`${base.replace(/\/+$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) return null
    const data: unknown = await r.json()
    return Array.isArray(data) ? (data as RedisReply[]) : null
  } catch {
    return null
  }
}
