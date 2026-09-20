import { and, eq, gt } from 'drizzle-orm'
import { appointmentEvents, appointmentServices, appointments, customerNotifications, employees, services } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { assertEmployeeAvailable, bookingDateTime, getAvailability, parseBookingDate } from '../../../services/customer-bookings'
import { getCustomerSession } from '../../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  const customer = await getCustomerSession(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ action?: 'cancel' | 'reschedule'; date?: string; time?: string; employeeId?: number; reason?: string }>(event)
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Lịch hẹn không hợp lệ.' })
  const db = useDatabase()
  const [row] = await db.select({ appointment: appointments, line: appointmentServices, bufferMinutes: services.bufferMinutes }).from(appointments)
    .innerJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
    .innerJoin(services, eq(appointmentServices.serviceId, services.id))
    .where(and(eq(appointments.id, id), eq(appointments.customerId, customer!.id))).limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy lịch hẹn.' })
  if (!['pending', 'confirmed'].includes(row.appointment.status) || row.appointment.startsAt.getTime() <= Date.now() + 2 * 60 * 60_000) throw createError({ statusCode: 409, statusMessage: 'Lịch chỉ có thể thay đổi trước giờ hẹn ít nhất 2 tiếng.' })

  if (body.action === 'cancel') {
    const reason = String(body.reason ?? '').trim().slice(0, 500)
    await db.transaction(async (tx) => {
      await tx.update(appointments).set({ status: 'cancelled', cancellationReason: reason || 'Khách hủy từ trang lịch cá nhân' }).where(eq(appointments.id, id))
      await tx.update(appointmentServices).set({ status: 'cancelled' }).where(eq(appointmentServices.appointmentId, id))
      await tx.delete(customerNotifications).where(and(eq(customerNotifications.appointmentId, id), eq(customerNotifications.type, 'reminder'), gt(customerNotifications.scheduledAt, new Date())))
      await tx.insert(appointmentEvents).values({ appointmentId: id, customerId: customer!.id, actor: 'customer', action: 'cancelled', oldValues: { status: row.appointment.status }, newValues: { status: 'cancelled', reason } })
      await tx.insert(customerNotifications).values({ customerId: customer!.id, appointmentId: id, type: 'booking_cancelled', channel: 'in_app', title: 'Đã hủy lịch hẹn', message: `Lịch ${row.line.serviceName} mã ${row.appointment.reference} đã được hủy.`, scheduledAt: new Date(), sentAt: new Date() })
    })
    return { ok: true }
  }

  if (body.action !== 'reschedule') throw createError({ statusCode: 422, statusMessage: 'Thao tác không hợp lệ.' })
  const { date } = parseBookingDate(body.date)
  const time = String(body.time ?? '')
  const employeeId = Number(body.employeeId)
  if (!Number.isInteger(employeeId)) throw createError({ statusCode: 422, statusMessage: 'Vui lòng chọn kỹ thuật viên hoặc khung giờ khác.' })
  const availability = await getAvailability({ branchId: row.appointment.branchId, serviceId: row.line.serviceId, date, employeeId })
  if (!availability.slots.some(slot => slot.time === time && slot.employeeId === employeeId)) throw createError({ statusCode: 409, statusMessage: 'Khung giờ này không còn trống.' })
  const [employee] = await db.select({ id: employees.id }).from(employees).where(and(eq(employees.id, employeeId), eq(employees.branchId, row.appointment.branchId), eq(employees.status, 'active'))).limit(1)
  if (!employee) throw createError({ statusCode: 422, statusMessage: 'Kỹ thuật viên không còn nhận lịch.' })
  const startsAt = bookingDateTime(date, time)
  const endsAt = new Date(startsAt.getTime() + row.line.durationMinutes * 60_000)
  await db.transaction(async (tx) => {
    await assertEmployeeAvailable(tx, { employeeId, start: startsAt, end: new Date(endsAt.getTime() + row.bufferMinutes * 60_000), excludeAppointmentId: id })
    await tx.update(appointments).set({ startsAt, endsAt, status: 'pending' }).where(eq(appointments.id, id))
    await tx.update(appointmentServices).set({ employeeId }).where(eq(appointmentServices.id, row.line.id))
    await tx.delete(customerNotifications).where(and(eq(customerNotifications.appointmentId, id), eq(customerNotifications.type, 'reminder'), gt(customerNotifications.scheduledAt, new Date())))
    await tx.insert(appointmentEvents).values({ appointmentId: id, customerId: customer!.id, actor: 'customer', action: 'rescheduled', oldValues: { startsAt: row.appointment.startsAt.toISOString(), employeeId: row.line.employeeId }, newValues: { startsAt: startsAt.toISOString(), employeeId } })
    await tx.insert(customerNotifications).values({ customerId: customer!.id, appointmentId: id, type: 'booking_updated', channel: 'in_app', title: 'Đã gửi yêu cầu đổi lịch', message: `Thời gian mới: ${time}, ngày ${date}. MIÊN sẽ xác nhận lại sớm nhất.`, scheduledAt: new Date(), sentAt: new Date() })
    const reminders: Array<typeof customerNotifications.$inferInsert> = []
    if (startsAt.getTime() - Date.now() > 24 * 60 * 60_000) reminders.push({ customerId: customer!.id, appointmentId: id, type: 'reminder', channel: 'in_app', title: 'Lịch hẹn vào ngày mai', message: `MIÊN hẹn gặp bạn lúc ${time} cho liệu trình ${row.line.serviceName}.`, scheduledAt: new Date(startsAt.getTime() - 24 * 60 * 60_000) })
    if (startsAt.getTime() - Date.now() > 2 * 60 * 60_000) reminders.push({ customerId: customer!.id, appointmentId: id, type: 'reminder', channel: 'in_app', title: 'Sắp đến giờ thư giãn', message: `Lịch ${row.line.serviceName} của bạn bắt đầu lúc ${time}.`, scheduledAt: new Date(startsAt.getTime() - 2 * 60 * 60_000) })
    if (reminders.length) await tx.insert(customerNotifications).values(reminders)
  })
  return { ok: true }
})
