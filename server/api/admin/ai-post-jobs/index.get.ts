import { desc } from 'drizzle-orm'
import { aiPostJobs } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

export default defineEventHandler(async () => {
  const rows = await useDatabase().select().from(aiPostJobs).orderBy(desc(aiPostJobs.createdAt)).limit(500)
  return { data: rows.map(row => ({ ...row, id: String(row.id), postId: row.generatedPostId ?? undefined, scheduledAt: row.scheduledAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() })) }
})
