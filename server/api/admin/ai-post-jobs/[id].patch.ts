import { eq } from 'drizzle-orm'
import { aiPostJobs } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

const allowedStatuses = ['queued', 'generating', 'generated', 'scheduled', 'published', 'error'] as const

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Bài trong hàng chờ không hợp lệ.' })
  const body = await readBody<Record<string, unknown>>(event)
  const values: Record<string, unknown> = {}
  for (const key of ['title', 'category', 'keyword', 'cluster', 'articleType', 'wordRange', 'targetAction', 'error'] as const) {
    if (key in body) values[key] = body[key] == null ? null : String(body[key]).trim()
  }
  if ('imageSource' in body) values.imageSource = body.imageSource || null
  if ('keepTitle' in body) values.keepTitle = body.keepTitle !== false
  if ('afterCreate' in body && ['draft', 'published'].includes(String(body.afterCreate))) values.afterCreate = body.afterCreate
  if ('status' in body && allowedStatuses.includes(body.status as typeof allowedStatuses[number])) values.status = body.status
  if ('postId' in body) values.generatedPostId = body.postId ? Number(body.postId) : null
  if ('scheduledAt' in body) {
    const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw createError({ statusCode: 422, statusMessage: 'Thời gian lên lịch không hợp lệ.' })
    values.scheduledAt = scheduledAt
  }
  if (!Object.keys(values).length) throw createError({ statusCode: 422, statusMessage: 'Chưa có thay đổi.' })
  await useDatabase().update(aiPostJobs).set(values).where(eq(aiPostJobs.id, id))
  return { ok: true }
})
