import { inArray } from 'drizzle-orm'
import { aiPostJobs } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

type JobInput = { title?: string; category?: string; keyword?: string; cluster?: string; articleType?: string; wordRange?: string; targetAction?: string; imageSource?: Record<string, unknown> | null; scheduledAt?: string | null; afterCreate?: 'draft' | 'published'; keepTitle?: boolean }

export default defineEventHandler(async (event) => {
  const body = await readBody<{ items?: JobInput[] }>(event)
  const input = Array.isArray(body.items) ? body.items.slice(0, 200) : []
  const titles = [...new Set(input.map(item => String(item.title ?? '').trim()).filter(Boolean))]
  if (!titles.length) throw createError({ statusCode: 422, statusMessage: 'Cần ít nhất một tiêu đề.' })
  const db = useDatabase()
  const existing = await db.select({ title: aiPostJobs.title }).from(aiPostJobs).where(inArray(aiPostJobs.title, titles))
  const used = new Set(existing.map(item => item.title.toLocaleLowerCase('vi')))
  const rows = input.filter(item => {
    const title = String(item.title ?? '').trim()
    const key = title.toLocaleLowerCase('vi')
    if (!title || used.has(key)) return false
    used.add(key); return true
  }).map(item => {
    const scheduledAt = item.scheduledAt ? new Date(item.scheduledAt) : null
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw createError({ statusCode: 422, statusMessage: 'Thời gian lên lịch không hợp lệ.' })
    return {
      title: String(item.title).trim(), category: String(item.category || 'Chăm sóc tại nhà'), keyword: String(item.keyword || ''), cluster: String(item.cluster || ''),
      articleType: String(item.articleType || 'Hướng dẫn'), wordRange: String(item.wordRange || '900–1.200'), targetAction: String(item.targetAction || ''),
      imageSource: item.imageSource ?? null, scheduledAt, afterCreate: item.afterCreate === 'published' ? 'published' as const : 'draft' as const,
      keepTitle: item.keepTitle !== false, status: scheduledAt ? 'scheduled' as const : 'queued' as const, createdBy: event.context.adminUser?.id,
    }
  })
  if (rows.length) await db.insert(aiPostJobs).values(rows)
  return { data: { count: rows.length } }
})
