import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm'
import {
  appointmentServices,
  appointments,
  auditLogs,
  customers,
  feedbacks,
  products,
  salesOrderItems,
  salesOrders,
  services,
} from '../database/schema'
import { useDatabase } from '../database/client'

type FeedbackStatus = 'pending' | 'approved' | 'hidden'
type FeedbackType = 'product' | 'service'
type FeedbackPayload = Record<string, unknown>

const statusLabels: Record<FeedbackStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đang hiển thị',
  hidden: 'Đã ẩn',
}

const bad = (message: string, statusCode = 422) => createError({ statusCode, statusMessage: message })
const positiveId = (value: unknown, label: string) => {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw bad(`${label} không hợp lệ.`)
  return parsed
}

function validateFeedback(body: FeedbackPayload) {
  const type = String(body.type ?? '') as FeedbackType
  const rating = Number(body.rating)
  const content = String(body.content ?? '').trim()
  if (!['product', 'service'].includes(type)) throw bad('Loại đánh giá không hợp lệ.')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad('Số sao phải từ 1 đến 5.')
  if (content.length < 10 || content.length > 2000) throw bad('Nội dung đánh giá cần từ 10 đến 2.000 ký tự.')
  return { type, rating, content }
}

export async function getCustomerFeedbackOptions(customerId: number) {
  const db = useDatabase()
  const [serviceOptions, productOptions, submitted] = await Promise.all([
    db.select({
      appointmentId: appointments.id,
      reference: appointments.reference,
      completedAt: appointments.endsAt,
      serviceId: appointmentServices.serviceId,
      name: appointmentServices.serviceName,
      existingFeedbackId: feedbacks.id,
    }).from(appointments)
      .innerJoin(appointmentServices, eq(appointmentServices.appointmentId, appointments.id))
      .leftJoin(feedbacks, and(
        eq(feedbacks.customerId, customerId),
        eq(feedbacks.appointmentId, appointments.id),
        eq(feedbacks.serviceId, appointmentServices.serviceId),
        isNull(feedbacks.deletedAt),
      ))
      .where(and(
        eq(appointments.customerId, customerId),
        eq(appointments.status, 'completed'),
        eq(appointmentServices.status, 'completed'),
        isNull(feedbacks.id),
      )).orderBy(desc(appointments.endsAt)),
    db.select({
      orderId: salesOrders.id,
      reference: salesOrders.reference,
      completedAt: salesOrders.completedAt,
      createdAt: salesOrders.createdAt,
      productId: salesOrderItems.productId,
      name: salesOrderItems.productName,
      existingFeedbackId: feedbacks.id,
    }).from(salesOrders)
      .innerJoin(salesOrderItems, eq(salesOrderItems.orderId, salesOrders.id))
      .leftJoin(feedbacks, and(
        eq(feedbacks.customerId, customerId),
        eq(feedbacks.orderId, salesOrders.id),
        eq(feedbacks.productId, salesOrderItems.productId),
        isNull(feedbacks.deletedAt),
      ))
      .where(and(
        eq(salesOrders.customerId, customerId),
        eq(salesOrders.fulfillmentStatus, 'delivered'),
        isNull(feedbacks.id),
      )).orderBy(desc(salesOrders.createdAt)),
    db.select({
      id: feedbacks.id,
      type: feedbacks.subjectType,
      rating: feedbacks.rating,
      content: feedbacks.content,
      status: feedbacks.status,
      productName: products.name,
      serviceName: services.name,
      appointmentReference: appointments.reference,
      orderReference: salesOrders.reference,
      createdAt: feedbacks.createdAt,
    }).from(feedbacks)
      .leftJoin(products, eq(feedbacks.productId, products.id))
      .leftJoin(services, eq(feedbacks.serviceId, services.id))
      .leftJoin(appointments, eq(feedbacks.appointmentId, appointments.id))
      .leftJoin(salesOrders, eq(feedbacks.orderId, salesOrders.id))
      .where(and(eq(feedbacks.customerId, customerId), isNull(feedbacks.deletedAt)))
      .orderBy(desc(feedbacks.createdAt)),
  ])

  return {
    eligible: [
      ...serviceOptions.map(item => ({
        type: 'service' as const,
        appointmentId: item.appointmentId,
        serviceId: item.serviceId,
        reference: item.reference,
        name: item.name,
        completedAt: item.completedAt.toISOString(),
        existingFeedbackId: item.existingFeedbackId,
      })),
      ...productOptions.filter(item => item.productId).map(item => ({
        type: 'product' as const,
        orderId: item.orderId,
        productId: item.productId!,
        reference: item.reference,
        name: item.name,
        completedAt: (item.completedAt ?? item.createdAt).toISOString(),
        existingFeedbackId: item.existingFeedbackId,
      })),
    ],
    feedback: submitted.map(item => ({
      id: item.id,
      type: item.type,
      rating: item.rating,
      content: item.content,
      status: item.status,
      statusLabel: statusLabels[item.status],
      subjectName: item.productName ?? item.serviceName ?? 'Nội dung không còn hoạt động',
      reference: item.orderReference ?? item.appointmentReference ?? '',
      createdAt: item.createdAt.toISOString(),
    })),
  }
}

export async function createCustomerFeedback(customerId: number, body: FeedbackPayload) {
  const { type, rating, content } = validateFeedback(body)
  const db = useDatabase()
  let values: typeof feedbacks.$inferInsert

  if (type === 'service') {
    const appointmentId = positiveId(body.appointmentId, 'Lịch hẹn')
    const serviceId = positiveId(body.serviceId, 'Liệu trình')
    const [eligible] = await db.select({ appointmentId: appointments.id }).from(appointments)
      .innerJoin(appointmentServices, and(eq(appointmentServices.appointmentId, appointments.id), eq(appointmentServices.serviceId, serviceId)))
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.customerId, customerId),
        eq(appointments.status, 'completed'),
        eq(appointmentServices.status, 'completed'),
      )).limit(1)
    if (!eligible) throw bad('Bạn chỉ có thể đánh giá liệu trình đã hoàn tất thuộc tài khoản của mình.', 403)
    values = { customerId, appointmentId, serviceId, subjectType: type, rating, content }
  } else {
    const orderId = positiveId(body.orderId, 'Đơn hàng')
    const productId = positiveId(body.productId, 'Sản phẩm')
    const [eligible] = await db.select({ orderId: salesOrders.id }).from(salesOrders)
      .innerJoin(salesOrderItems, and(eq(salesOrderItems.orderId, salesOrders.id), eq(salesOrderItems.productId, productId)))
      .where(and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.customerId, customerId),
        eq(salesOrders.fulfillmentStatus, 'delivered'),
      )).limit(1)
    if (!eligible) throw bad('Bạn chỉ có thể đánh giá sản phẩm trong đơn đã hoàn tất thuộc tài khoản của mình.', 403)
    values = { customerId, orderId, productId, subjectType: type, rating, content }
  }

  const duplicateCondition = type === 'service'
    ? and(eq(feedbacks.customerId, customerId), eq(feedbacks.appointmentId, values.appointmentId!), eq(feedbacks.serviceId, values.serviceId!))
    : and(eq(feedbacks.customerId, customerId), eq(feedbacks.orderId, values.orderId!), eq(feedbacks.productId, values.productId!))
  const [existing] = await db.select({ id: feedbacks.id, deletedAt: feedbacks.deletedAt }).from(feedbacks).where(duplicateCondition).limit(1)
  if (existing && !existing.deletedAt) throw bad('Bạn đã gửi đánh giá cho nội dung này.', 409)
  if (existing) {
    await db.update(feedbacks).set({ ...values, status: 'pending', moderationNote: null, moderatedBy: null, moderatedAt: null, deletedAt: null }).where(eq(feedbacks.id, existing.id))
    return { id: existing.id, status: 'pending' as const }
  }
  try {
    const [created] = await db.insert(feedbacks).values(values).$returningId()
    if (!created) throw bad('Không thể lưu đánh giá.', 500)
    return { id: created.id, status: 'pending' as const }
  } catch (failure) {
    const databaseError = failure as { code?: string; cause?: { code?: string } }
    if ((databaseError.code ?? databaseError.cause?.code) === 'ER_DUP_ENTRY') throw bad('Bạn đã gửi đánh giá cho nội dung này.', 409)
    throw failure
  }
}

function adminFeedbackSelect() {
  return useDatabase().select({
    id: feedbacks.id,
    type: feedbacks.subjectType,
    rating: feedbacks.rating,
    content: feedbacks.content,
    status: feedbacks.status,
    customerId: customers.id,
    customerName: customers.fullName,
    customerPhone: customers.phone,
    customerEmail: customers.email,
    productId: feedbacks.productId,
    serviceId: feedbacks.serviceId,
    appointmentId: feedbacks.appointmentId,
    orderId: feedbacks.orderId,
    productName: products.name,
    serviceName: services.name,
    appointmentReference: appointments.reference,
    orderReference: salesOrders.reference,
    moderationNote: feedbacks.moderationNote,
    moderatedBy: feedbacks.moderatedBy,
    moderatedAt: feedbacks.moderatedAt,
    createdAt: feedbacks.createdAt,
    updatedAt: feedbacks.updatedAt,
  }).from(feedbacks)
    .innerJoin(customers, eq(feedbacks.customerId, customers.id))
    .leftJoin(products, eq(feedbacks.productId, products.id))
    .leftJoin(services, eq(feedbacks.serviceId, services.id))
    .leftJoin(appointments, eq(feedbacks.appointmentId, appointments.id))
    .leftJoin(salesOrders, eq(feedbacks.orderId, salesOrders.id))
}

function mapAdminFeedback(row: Awaited<ReturnType<ReturnType<typeof adminFeedbackSelect>['limit']>>[number]) {
  return {
    ...row,
    statusLabel: statusLabels[row.status],
    subjectName: row.productName ?? row.serviceName ?? 'Nội dung không còn hoạt động',
    reference: row.orderReference ?? row.appointmentReference ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    moderatedAt: row.moderatedAt?.toISOString() ?? null,
  }
}

export async function listAdminFeedback(query: Record<string, unknown>) {
  const pageValue = Number(query.page)
  const pageSizeValue = Number(query.pageSize)
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const pageSize = Math.min(100, Number.isInteger(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20)
  const search = String(query.search ?? query.q ?? '').trim().slice(0, 120)
  const status = String(query.status ?? '')
  const type = String(query.type ?? '')
  const ratingValue = Number(query.rating)
  if (status && !['pending', 'approved', 'hidden'].includes(status)) throw bad('Trạng thái lọc không hợp lệ.')
  if (type && !['product', 'service'].includes(type)) throw bad('Loại đánh giá lọc không hợp lệ.')
  if (query.rating && (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5)) throw bad('Số sao lọc không hợp lệ.')

  const conditions = [isNull(feedbacks.deletedAt)]
  if (status) conditions.push(eq(feedbacks.status, status as FeedbackStatus))
  if (type) conditions.push(eq(feedbacks.subjectType, type as FeedbackType))
  if (query.rating) conditions.push(eq(feedbacks.rating, ratingValue))
  if (search) {
    const term = `%${search}%`
    conditions.push(or(
      like(customers.fullName, term),
      like(customers.phone, term),
      like(feedbacks.content, term),
      like(products.name, term),
      like(services.name, term),
      like(appointments.reference, term),
      like(salesOrders.reference, term),
    )!)
  }

  const db = useDatabase()
  const where = and(...conditions)
  const [countRow] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(feedbacks)
    .innerJoin(customers, eq(feedbacks.customerId, customers.id))
    .leftJoin(products, eq(feedbacks.productId, products.id))
    .leftJoin(services, eq(feedbacks.serviceId, services.id))
    .leftJoin(appointments, eq(feedbacks.appointmentId, appointments.id))
    .leftJoin(salesOrders, eq(feedbacks.orderId, salesOrders.id))
    .where(where)
  const total = Number(countRow?.count ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const offset = (currentPage - 1) * pageSize
  const rows = await adminFeedbackSelect().where(where).orderBy(desc(feedbacks.createdAt)).limit(pageSize).offset(offset)
  return {
    data: rows.map(mapAdminFeedback),
    meta: { page: currentPage, pageSize, total, totalPages, from: total ? offset + 1 : 0, to: Math.min(offset + pageSize, total) },
  }
}

export async function getAdminFeedback(id: number) {
  const [row] = await adminFeedbackSelect().where(and(eq(feedbacks.id, id), isNull(feedbacks.deletedAt))).limit(1)
  if (!row) throw bad('Không tìm thấy đánh giá.', 404)
  return mapAdminFeedback(row)
}

export async function moderateFeedback(id: number, actorId: number, body: FeedbackPayload) {
  const status = String(body.status ?? '') as FeedbackStatus
  const moderationNote = String(body.moderationNote ?? '').trim()
  if (!['pending', 'approved', 'hidden'].includes(status)) throw bad('Trạng thái duyệt không hợp lệ.')
  if (moderationNote.length > 500) throw bad('Ghi chú duyệt tối đa 500 ký tự.')
  const db = useDatabase()
  const [feedback] = await db.select({ id: feedbacks.id, status: feedbacks.status }).from(feedbacks).where(and(eq(feedbacks.id, id), isNull(feedbacks.deletedAt))).limit(1)
  if (!feedback) throw bad('Không tìm thấy đánh giá.', 404)
  await db.transaction(async tx => {
    await tx.update(feedbacks).set({ status, moderationNote: moderationNote || null, moderatedBy: actorId, moderatedAt: new Date() }).where(eq(feedbacks.id, id))
    await tx.insert(auditLogs).values({ userId: actorId, action: 'feedback.update', entityType: 'feedback', entityId: String(id), oldValues: { status: feedback.status }, newValues: { status, moderationNote: moderationNote || null } })
  })
  return { id, status, statusLabel: statusLabels[status] }
}

export async function deleteFeedback(id: number, actorId: number) {
  const db = useDatabase()
  const [feedback] = await db.select({ id: feedbacks.id, status: feedbacks.status }).from(feedbacks).where(and(eq(feedbacks.id, id), isNull(feedbacks.deletedAt))).limit(1)
  if (!feedback) throw bad('Không tìm thấy đánh giá.', 404)
  await db.transaction(async tx => {
    await tx.update(feedbacks).set({ deletedAt: new Date(), status: 'hidden', moderatedBy: actorId, moderatedAt: new Date() }).where(eq(feedbacks.id, id))
    await tx.insert(auditLogs).values({ userId: actorId, action: 'feedback.delete', entityType: 'feedback', entityId: String(id), oldValues: { status: feedback.status } })
  })
}
