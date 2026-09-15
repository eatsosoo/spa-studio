import { eq } from 'drizzle-orm'
import { chatLeads, chatSessions } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDatabase()
  const [lead] = await db.select({ sessionId: chatLeads.sessionId }).from(chatLeads).where(eq(chatLeads.id, id)).limit(1)
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy khách từ chatbot.' })
  await db.update(chatSessions).set({ status: 'hidden' }).where(eq(chatSessions.id, lead.sessionId))
  return { ok: true }
})
