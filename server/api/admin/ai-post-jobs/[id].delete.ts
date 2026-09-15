import { eq } from 'drizzle-orm'
import { aiPostJobs } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Bài trong hàng chờ không hợp lệ.' })
  await useDatabase().delete(aiPostJobs).where(eq(aiPostJobs.id, id))
  return { ok: true }
})
