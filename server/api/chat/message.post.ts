import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { branches, chatLeads, chatMessages, chatSessions, posts, products, services } from '../../database/schema'
import { useDatabase } from '../../database/client'

type ChatBody = { token?: string; message?: string; pageUrl?: string }
type AiResponse = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } }
type ChatResult = { answer: string; lead: { name: string | null; phone: string | null; service: string | null; preferredAt: string | null; note: string | null }; wantsBooking: boolean }

const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string) {
  const now = Date.now()
  const item = attempts.get(key)
  if (!item || item.resetAt < now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return }
  if (item.count >= 20) throw createError({ statusCode: 429, statusMessage: 'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ một phút.' })
  item.count += 1
}

function outputText(result: AiResponse) {
  return result.output_text ?? result.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text
}

export default defineEventHandler(async (event) => {
  checkRateLimit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')
  const body = await readBody<ChatBody>(event)
  const message = String(body.message ?? '').trim()
  if (!message || message.length > 1500) throw createError({ statusCode: 422, statusMessage: 'Tin nhắn cần có từ 1 đến 1.500 ký tự.' })
  const db = useDatabase()
  let [session] = body.token ? await db.select().from(chatSessions).where(eq(chatSessions.publicToken, String(body.token))).limit(1) : []
  if (!session) {
    const token = randomUUID()
    const [created] = await db.insert(chatSessions).values({ publicToken: token, pageUrl: String(body.pageUrl ?? '').slice(0, 500) || null }).$returningId()
    ;[session] = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(created!.id))).limit(1)
  }
  if (!session || session.status !== 'active') throw createError({ statusCode: 409, statusMessage: 'Cuộc trò chuyện đã kết thúc.' })
  await db.insert(chatMessages).values({ sessionId: session.id, role: 'user', content: message })
  await db.update(chatSessions).set({ lastMessageAt: new Date() }).where(eq(chatSessions.id, session.id))

  const [serviceRows, productRows, postRows, branchRows, historyRows] = await Promise.all([
    db.select({ name: services.name, description: services.description, duration: services.durationMinutes, price: services.price }).from(services).where(and(eq(services.isActive, true), isNull(services.deletedAt))).limit(30),
    db.select({ name: products.name, slug: products.slug, description: products.shortDescription, price: products.salePrice, status: products.status }).from(products).where(and(eq(products.status, 'active'), isNull(products.deletedAt))).limit(30),
    db.select({ title: posts.title, slug: posts.slug, excerpt: posts.excerpt }).from(posts).where(and(eq(posts.status, 'published'), isNull(posts.deletedAt))).orderBy(desc(posts.publishedAt)).limit(12),
    db.select({ name: branches.name, phone: branches.phone, address: branches.addressLine, ward: branches.ward, district: branches.district, province: branches.province }).from(branches).where(eq(branches.isActive, true)).limit(10),
    db.select({ role: chatMessages.role, content: chatMessages.content }).from(chatMessages).where(eq(chatMessages.sessionId, session.id)).orderBy(desc(chatMessages.createdAt), desc(chatMessages.id)).limit(12),
  ])
  const sources = [
    ...serviceRows.map(item => ({ label: item.name })),
    ...productRows.map(item => ({ label: item.name, url: `/san-pham/${item.slug}` })),
    ...postRows.map(item => ({ label: item.title, url: `/bai-viet/${item.slug}` })),
  ]
  const config = useRuntimeConfig()
  const apiKey = String(config.openaiApiKey ?? '').trim()
  let result: ChatResult
  if (!apiKey) {
    const serviceList = serviceRows.slice(0, 4).map(item => `${item.name} (${item.duration} phút, ${Number(item.price).toLocaleString('vi-VN')}đ)`).join('; ')
    result = { answer: `MIÊN hiện có ${serviceList || 'các liệu trình chăm sóc theo lịch hẹn'}. Bạn muốn tìm hiểu liệu trình nào, hay muốn để lại tên, số điện thoại và thời gian mong muốn để MIÊN liên hệ?`, lead: { name: null, phone: null, service: null, preferredAt: null, note: null }, wantsBooking: /đặt|hẹn|book/i.test(message) }
  } else {
    const factualContext = JSON.stringify({ services: serviceRows, products: productRows, articles: postRows, branches: branchRows })
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: String(config.openaiModel || 'gpt-5-mini'), store: false, max_output_tokens: 1200,
        instructions: 'Bạn là trợ lý tư vấn MIÊN Spa. Chỉ khẳng định giá, thời lượng, sản phẩm, địa chỉ và chính sách có trong DỮ LIỆU THỰC TẾ. Nếu dữ liệu thiếu, nói rõ cần nhân viên xác nhận; tuyệt đối không tự suy đoán. Không chẩn đoán hoặc hứa chữa bệnh. Trả lời tiếng Việt, ngắn gọn, ấm áp. Khi khách muốn đặt lịch, xin đủ tên, số điện thoại Việt Nam, dịch vụ và ngày giờ; luôn yêu cầu khách xác nhận trước khi tạo lịch. Trích xuất thông tin chỉ khi khách đã nói rõ.',
        input: `DỮ LIỆU THỰC TẾ:\n${factualContext}\n\nHỘI THOẠI:\n${historyRows.reverse().map(item => `${item.role}: ${item.content}`).join('\n')}`,
        text: { format: { type: 'json_schema', name: 'mien_chat_reply', strict: true, schema: { type: 'object', additionalProperties: false, properties: {
          answer: { type: 'string' }, wantsBooking: { type: 'boolean' }, lead: { type: 'object', additionalProperties: false, properties: {
            name: { type: ['string', 'null'] }, phone: { type: ['string', 'null'] }, service: { type: ['string', 'null'] }, preferredAt: { type: ['string', 'null'], description: 'ISO 8601 có múi giờ +07:00 nếu khách nêu đủ ngày giờ' }, note: { type: ['string', 'null'] },
          }, required: ['name', 'phone', 'service', 'preferredAt', 'note'] },
        }, required: ['answer', 'wantsBooking', 'lead'] } } },
      }), signal: AbortSignal.timeout(60_000),
    })
    const json = await response.json() as AiResponse
    if (!response.ok) throw createError({ statusCode: 502, statusMessage: json.error?.message || 'Trợ lý AI đang tạm thời gián đoạn.' })
    try { result = JSON.parse(outputText(json) || '') as ChatResult }
    catch { throw createError({ statusCode: 502, statusMessage: 'Trợ lý AI trả về dữ liệu không hợp lệ.' }) }
  }
  result.answer = String(result.answer || '').slice(0, 4000)
  const phone = String(result.lead?.phone ?? '').replace(/[\s.-]/g, '')
  const cleanPhone = /^(?:\+84|0)\d{9}$/.test(phone) ? phone : null
  const preferredAt = result.lead?.preferredAt ? new Date(result.lead.preferredAt) : null
  const leadValues = { customerName: result.lead?.name?.slice(0, 150) || null, phone: cleanPhone, serviceName: result.lead?.service?.slice(0, 150) || null, preferredAt: preferredAt && !Number.isNaN(preferredAt.getTime()) ? preferredAt : null, note: result.lead?.note?.slice(0, 2000) || null }
  const [existingLead] = await db.select().from(chatLeads).where(eq(chatLeads.sessionId, session.id)).limit(1)
  const merged = { customerName: leadValues.customerName ?? existingLead?.customerName ?? null, phone: leadValues.phone ?? existingLead?.phone ?? null, serviceName: leadValues.serviceName ?? existingLead?.serviceName ?? null, preferredAt: leadValues.preferredAt ?? existingLead?.preferredAt ?? null, note: leadValues.note ?? existingLead?.note ?? null }
  const status = merged.customerName && merged.phone && merged.serviceName && merged.preferredAt ? 'complete' as const : 'incomplete' as const
  if (existingLead) await db.update(chatLeads).set({ ...merged, status: existingLead.status === 'booked' ? 'booked' : status }).where(eq(chatLeads.id, existingLead.id))
  else if (Object.values(merged).some(Boolean) || result.wantsBooking) await db.insert(chatLeads).values({ sessionId: session.id, ...merged, status })
  await db.insert(chatMessages).values({ sessionId: session.id, role: 'assistant', content: result.answer, sources })
  await db.update(chatSessions).set({ lastMessageAt: new Date() }).where(eq(chatSessions.id, session.id))
  return { data: { token: session.publicToken, answer: result.answer, sources: sources.slice(0, 8), wantsBooking: result.wantsBooking, lead: { ...merged, preferredAt: merged.preferredAt?.toISOString() ?? null, complete: status === 'complete' } } }
})
