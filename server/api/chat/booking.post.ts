import { and, eq, isNull, ne } from 'drizzle-orm'
import { appointments, chatLeads, chatMessages, chatSessions, services } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { getAdminResource } from '../../services/admin-resources'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'chat-booking', 5, 60 * 60_000)
  const body = await readBody<{ token?: string; name?: string; phone?: string; service?: string; date?: string; time?: string; note?: string }>(event)
  const token = String(body.token ?? '')
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').replace(/[\s.-]/g, '')
  const serviceName = String(body.service ?? '').trim()
  const date = String(body.date ?? '')
  const time = String(body.time ?? '')
  if (!name || !/^(?:\+84|0)\d{9}$/.test(phone) || !serviceName || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw createError({ statusCode: 422, statusMessage: 'Thông tin đặt lịch chưa đầy đủ hoặc không hợp lệ.' })
  const startsAt = new Date(`${date}T${time}:00+07:00`)
  const hour = Number(time.slice(0, 2)); const minute = Number(time.slice(3, 5))
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() || startsAt.getTime() > Date.now() + 31 * 86400000 || hour < 9 || hour > 20 || minute % 30 !== 0) throw createError({ statusCode: 422, statusMessage: 'Khung giờ cần ở trong 31 ngày tới, từ 09:00 đến 20:30 và theo bước 30 phút.' })
  const db = useDatabase()
  let [[session], [service], [duplicate]] = await Promise.all([
    db.select({ id: chatSessions.id }).from(chatSessions).where(and(eq(chatSessions.publicToken, token), eq(chatSessions.status, 'active'))).limit(1),
    db.select({ id: services.id }).from(services).where(and(eq(services.name, serviceName), eq(services.isActive, true), isNull(services.deletedAt))).limit(1),
    db.select({ id: appointments.id, reference: appointments.reference }).from(appointments).where(and(eq(appointments.customerPhone, phone), eq(appointments.startsAt, startsAt), ne(appointments.status, 'cancelled'))).limit(1),
  ])
  if (!session) {
    const publicToken = randomUUID()
    const [created] = await db.insert(chatSessions).values({ publicToken }).$returningId()
    ;[session] = await db.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.id, Number(created!.id))).limit(1)
    body.token = publicToken
  }
  if (!session) throw createError({ statusCode: 500, statusMessage: 'Không thể khởi tạo cuộc trò chuyện.' })
  if (!service) throw createError({ statusCode: 422, statusMessage: 'Liệu trình này hiện không còn khả dụng.' })
  if (duplicate) throw createError({ statusCode: 409, statusMessage: `Yêu cầu này đã tồn tại với mã ${duplicate.reference}.` })
  const result = await getAdminResource('bookings').save(null, { customer: name, phone, service: serviceName, date, time, status: 'Chờ xác nhận', note: body.note, source: 'chatbot' }) as { reference: string }
  const [appointment] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.reference, result.reference)).limit(1)
  const [lead] = await db.select({ id: chatLeads.id }).from(chatLeads).where(eq(chatLeads.sessionId, session.id)).limit(1)
  const leadValues = { customerName: name, phone, serviceName, preferredAt: startsAt, note: String(body.note ?? '').slice(0, 2000) || null, status: 'booked' as const, appointmentId: appointment?.id }
  if (lead) await db.update(chatLeads).set(leadValues).where(eq(chatLeads.id, lead.id))
  else await db.insert(chatLeads).values({ sessionId: session.id, ...leadValues })
  await db.insert(chatMessages).values([
    { sessionId: session.id, role: 'user', content: `Yêu cầu đặt lịch: ${name}, ${phone}, ${serviceName}, ${date} ${time}${body.note ? `, ghi chú: ${String(body.note).slice(0, 500)}` : ''}` },
    { sessionId: session.id, role: 'assistant', content: `MIÊN đã nhận yêu cầu và sẽ liên hệ xác nhận. Mã yêu cầu: ${result.reference}.` },
  ])
  await db.update(chatSessions).set({ lastMessageAt: new Date() }).where(eq(chatSessions.id, session.id))
  return { ok: true, token: body.token, reference: result.reference, message: 'MIÊN đã nhận yêu cầu và sẽ liên hệ để xác nhận khung giờ.' }
})
import { randomUUID } from 'node:crypto'
