import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { appointmentEvents, appointmentServices, appointments, branches, customerNotifications, customers, employees, services } from '../database/schema'
import { useDatabase } from '../database/client'
import { assertEmployeeAvailable, bookingDateTime, getAvailability, parseBookingDate } from '../services/customer-bookings'
import { createCustomerSession, getCustomerSession, normalizeCustomerPhone, validCustomerPhone } from '../utils/customer-auth'
import { checkPublicRateLimit } from '../utils/public-rate-limit'

interface BookingPayload {
  name?: string
  phone?: string
  branchId?: number
  serviceId?: number
  employeeId?: number
  date?: string
  time?: string
  note?: string
}

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'booking', 10, 60 * 60_000)
  const body = await readBody<BookingPayload>(event)
  const session = await getCustomerSession(event, false)
  const name = String(body.name ?? session?.name ?? '').trim().slice(0, 150)
  const phone = normalizeCustomerPhone(body.phone ?? session?.phone)
  const branchId = Number(body.branchId)
  const serviceId = Number(body.serviceId)
  const employeeId = Number(body.employeeId)
  const { date } = parseBookingDate(body.date)
  const time = String(body.time ?? '')
  if (!name || !validCustomerPhone(phone) || !Number.isInteger(branchId) || !Number.isInteger(serviceId) || !Number.isInteger(employeeId)) throw createError({ statusCode: 422, statusMessage: 'Thông tin đặt lịch chưa hợp lệ.' })

  const availability = await getAvailability({ branchId, serviceId, date, employeeId })
  if (!availability.slots.some(item => item.time === time && item.employeeId === employeeId)) throw createError({ statusCode: 409, statusMessage: 'Khung giờ này không còn trống. Vui lòng chọn giờ khác.' })

  const db = useDatabase()
  const [[branch], [service], [employee], [knownCustomer]] = await Promise.all([
    db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.isActive, true))).limit(1),
    db.select().from(services).where(and(eq(services.id, serviceId), eq(services.isActive, true), isNull(services.deletedAt))).limit(1),
    db.select({ id: employees.id, name: employees.fullName }).from(employees).where(and(eq(employees.id, employeeId), eq(employees.branchId, branchId), eq(employees.status, 'active'), isNull(employees.deletedAt))).limit(1),
    db.select({ id: customers.id }).from(customers).where(and(eq(customers.phone, phone), isNull(customers.deletedAt))).limit(1),
  ])
  if (!branch || !service || !employee) throw createError({ statusCode: 422, statusMessage: 'Chi nhánh, liệu trình hoặc kỹ thuật viên không hợp lệ.' })
  if (session && knownCustomer && session.id !== knownCustomer.id) throw createError({ statusCode: 403, statusMessage: 'Số điện thoại không khớp với tài khoản đang đăng nhập.' })
  const startsAt = bookingDateTime(date, time)
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000)
  const blockedUntil = new Date(endsAt.getTime() + service.bufferMinutes * 60_000)
  const reference = `LH-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
  let customerId = knownCustomer?.id
  let createdNewCustomer = false

  await db.transaction(async (tx) => {
    await assertEmployeeAvailable(tx, { employeeId: employee.id, start: startsAt, end: blockedUntil })
    if (!customerId) {
      const [createdCustomer] = await tx.insert(customers).values({ code: `KH-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`.toUpperCase(), fullName: name, phone, source: 'website' }).$returningId()
      if (!createdCustomer) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo hồ sơ khách hàng.' })
      customerId = createdCustomer.id
      createdNewCustomer = true
    } else await tx.update(customers).set({ fullName: name }).where(eq(customers.id, customerId))
    const [created] = await tx.insert(appointments).values({ reference, branchId, customerId, customerName: name, customerPhone: phone, startsAt, endsAt, status: 'pending', source: 'website', subtotal: service.price, totalAmount: service.price, notes: String(body.note ?? '').trim().slice(0, 2000) || null }).$returningId()
    if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo lịch hẹn.' })
    await tx.insert(appointmentServices).values({ appointmentId: created.id, serviceId: service.id, employeeId: employee.id, serviceName: service.name, durationMinutes: service.durationMinutes, unitPrice: service.price, finalPrice: service.price, status: 'scheduled' })
    await tx.insert(appointmentEvents).values({ appointmentId: created.id, customerId, actor: 'customer', action: 'created', newValues: { startsAt: startsAt.toISOString(), serviceId, employeeId: employee.id } })
    const notificationRows: Array<typeof customerNotifications.$inferInsert> = [{ customerId: customerId!, appointmentId: created.id, type: 'booking_created', channel: 'in_app', title: 'MIÊN đã nhận lịch hẹn', message: `${service.name} lúc ${time}, ngày ${date}. Mã lịch ${reference}.`, scheduledAt: new Date(), sentAt: new Date() }]
    if (startsAt.getTime() - Date.now() > 24 * 60 * 60_000) notificationRows.push({ customerId: customerId!, appointmentId: created.id, type: 'reminder', channel: 'in_app', title: 'Lịch hẹn vào ngày mai', message: `MIÊN hẹn gặp bạn lúc ${time} cho liệu trình ${service.name}.`, scheduledAt: new Date(startsAt.getTime() - 24 * 60 * 60_000) })
    if (startsAt.getTime() - Date.now() > 2 * 60 * 60_000) notificationRows.push({ customerId: customerId!, appointmentId: created.id, type: 'reminder', channel: 'in_app', title: 'Sắp đến giờ thư giãn', message: `Lịch ${service.name} của bạn bắt đầu lúc ${time}.`, scheduledAt: new Date(startsAt.getTime() - 2 * 60 * 60_000) })
    await tx.insert(customerNotifications).values(notificationRows)
  })

  if (createdNewCustomer && customerId && !session) await createCustomerSession(event, customerId)

  return { ok: true, reference, message: 'MIÊN đã giữ khung giờ bạn chọn và sẽ xác nhận lịch hẹn sớm nhất.' }
})
