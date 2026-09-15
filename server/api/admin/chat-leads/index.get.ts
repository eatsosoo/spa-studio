import { desc, eq } from 'drizzle-orm'
import { chatLeads, chatSessions } from '../../../database/schema'
import { useDatabase } from '../../../database/client'

export default defineEventHandler(async () => {
  const rows = await useDatabase().select({
    id: chatLeads.id, sessionId: chatLeads.sessionId, customerName: chatLeads.customerName, phone: chatLeads.phone,
    serviceName: chatLeads.serviceName, preferredAt: chatLeads.preferredAt, note: chatLeads.note, leadStatus: chatLeads.status,
    appointmentId: chatLeads.appointmentId, sessionStatus: chatSessions.status, lastMessageAt: chatSessions.lastMessageAt,
  }).from(chatLeads).innerJoin(chatSessions, eq(chatLeads.sessionId, chatSessions.id)).orderBy(desc(chatSessions.lastMessageAt)).limit(500)
  return { data: rows.map(row => ({ ...row, preferredAt: row.preferredAt?.toISOString() ?? null, lastMessageAt: row.lastMessageAt.toISOString(), status: row.leadStatus, leadStatus: undefined })) }
})
