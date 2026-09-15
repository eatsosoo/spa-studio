import { eq } from 'drizzle-orm'
import { chatLeads, chatSessions } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ status?: string; hidden?: boolean }>(event)
  const db = useDatabase()
  const [lead] = await db.select({ sessionId: chatLeads.sessionId }).from(chatLeads).where(eq(chatLeads.id, id)).limit(1)
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy khách từ chatbot.' })
  if (body.status && ['incomplete', 'complete', 'booked', 'contacted', 'closed'].includes(body.status)) await db.update(chatLeads).set({ status: body.status as 'incomplete' | 'complete' | 'booked' | 'contacted' | 'closed' }).where(eq(chatLeads.id, id))
  if (typeof body.hidden === 'boolean') await db.update(chatSessions).set({ status: body.hidden ? 'hidden' : 'active' }).where(eq(chatSessions.id, lead.sessionId))
  return { ok: true }
})
