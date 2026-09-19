import { createHash } from 'node:crypto'
import { eq, lt, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { apiRateLimits } from '../database/schema'
import { useDatabase } from '../database/client'

let requestsSinceCleanup = 0

export function clientAddress(event: H3Event) {
  // Only trust X-Forwarded-For when the reverse proxy replaces that header.
  return getRequestIP(event, { xForwardedFor: process.env.TRUST_PROXY === 'true' }) ?? 'unknown'
}

export async function checkPublicRateLimit(event: H3Event, scope: string, limit: number, windowMs: number) {
  const now = Date.now()
  const window = Math.floor(now / windowMs)
  const key = createHash('sha256').update(`${scope}:${window}:${clientAddress(event)}`).digest('hex')
  const db = useDatabase()
  await db.insert(apiRateLimits).values({ key, hits: 1, expiresAt: new Date((window + 1) * windowMs) })
    .onDuplicateKeyUpdate({ set: { hits: sql`${apiRateLimits.hits} + 1` } })
  const [counter] = await db.select({ hits: apiRateLimits.hits }).from(apiRateLimits).where(eq(apiRateLimits.key, key)).limit(1)
  if (++requestsSinceCleanup % 500 === 0) {
    await db.delete(apiRateLimits).where(lt(apiRateLimits.expiresAt, new Date(now))).catch(() => undefined)
  }
  if (counter && counter.hits > limit) {
    setResponseHeader(event, 'Retry-After', Math.ceil(((window + 1) * windowMs - now) / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau.' })
  }
}
