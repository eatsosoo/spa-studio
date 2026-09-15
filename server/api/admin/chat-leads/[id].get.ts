import { asc, eq } from 'drizzle-orm'
import { chatLeads, chatMessages } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDatabase()
  const [lead] = await db.select().from(chatLeads).where(eq(chatLeads.id, id)).limit(1)
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy khách từ chatbot.' })
  const messages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, lead.sessionId)).orderBy(asc(chatMessages.createdAt), asc(chatMessages.id)).limit(300)
  return { data: { lead, messages } }
})
