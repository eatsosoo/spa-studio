import { and, asc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, notLike, or, sql } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { appointmentServices, appointments, attendanceRecords, branches, employees, promotions, services, systemSettings } from '../database/schema'

export type AvailabilitySlot = { time: string; employeeId: number; employeeName: string }

const serviceProvider = () => or(isNull(employees.jobTitle), and(notLike(employees.jobTitle, '%Lễ tân%'), notLike(employees.jobTitle, '%Quản trị%'), notLike(employees.jobTitle, '%Quản lý%')))

export function parseBookingDate(value: unknown) {
  const date = String(value ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 422, statusMessage: 'Ngày hẹn không hợp lệ.' })
  const start = new Date(`${date}T00:00:00+07:00`)
  if (Number.isNaN(start.getTime())) throw createError({ statusCode: 422, statusMessage: 'Ngày hẹn không hợp lệ.' })
  return { date, start, end: new Date(start.getTime() + 24 * 60 * 60_000) }
}

export function bookingDateTime(date: string, time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw createError({ statusCode: 422, statusMessage: 'Giờ hẹn không hợp lệ.' })
  const value = new Date(`${date}T${time}:00+07:00`)
  if (Number.isNaN(value.getTime())) throw createError({ statusCode: 422, statusMessage: 'Giờ hẹn không hợp lệ.' })
  return value
}

const minutes = (value: string) => {
  const [hour = 0, minute = 0] = value.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}
const timeLabel = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

async function bookingRules(db: ReturnType<typeof useDatabase>, branchId: number) {
  const rows = await db.select({ branchId: systemSettings.branchId, key: systemSettings.key, value: systemSettings.value }).from(systemSettings)
    .where(and(or(eq(systemSettings.branchId, branchId), isNull(systemSettings.branchId)), inArray(systemSettings.key, ['booking.open_time', 'booking.close_time', 'booking.slot_interval_minutes', 'booking.advance_days'])))
  const map = new Map(rows.sort((left, right) => Number(left.branchId !== null) - Number(right.branchId !== null)).map(row => [row.key, row.value]))
  return {
    open: String(map.get('booking.open_time') ?? '09:00'),
    close: String(map.get('booking.close_time') ?? '21:00'),
    interval: Math.max(15, Number(map.get('booking.slot_interval_minutes') ?? 30)),
    advanceDays: Math.max(1, Number(map.get('booking.advance_days') ?? 30)),
  }
}

export async function getPublicBookingOptions() {
  const db = useDatabase()
  const now = new Date()
  const [branchRows, serviceRows, employeeRows, promotionRows] = await Promise.all([
    db.select({ id: branches.id, name: branches.name, address: branches.addressLine }).from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.id)),
    db.select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes, bufferMinutes: services.bufferMinutes, price: services.price }).from(services).where(and(eq(services.isActive, true), isNull(services.deletedAt))).orderBy(asc(services.name)),
    db.select({ id: employees.id, branchId: employees.branchId, name: employees.fullName, role: employees.jobTitle }).from(employees).where(and(eq(employees.status, 'active'), isNull(employees.deletedAt), serviceProvider())).orderBy(asc(employees.fullName)),
    db.select({ id: promotions.id, name: promotions.name, description: promotions.description, discountType: promotions.discountType, discountValue: promotions.discountValue, endsAt: promotions.endsAt }).from(promotions).where(and(eq(promotions.isActive, true), lte(promotions.startsAt, now), gt(promotions.endsAt, now))).orderBy(asc(promotions.endsAt)),
  ])
  return {
    branches: branchRows,
    services: serviceRows.map(row => ({ ...row, price: Number(row.price) })),
    employees: employeeRows,
    promotions: promotionRows.map(row => ({ ...row, discountValue: Number(row.discountValue), endsAt: row.endsAt.toISOString() })),
  }
}

export async function getAvailability(input: { branchId: number; serviceId: number; date: string; employeeId?: number }) {
  const db = useDatabase()
  const day = parseBookingDate(input.date)
  const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.isActive, true), isNull(services.deletedAt))).limit(1)
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Liệu trình không còn nhận lịch.' })
  const rules = await bookingRules(db, input.branchId)
  const latest = new Date(); latest.setDate(latest.getDate() + rules.advanceDays)
  if (day.start.getTime() < Date.now() - 24 * 60 * 60_000 || day.start > latest) throw createError({ statusCode: 422, statusMessage: `Chỉ có thể đặt lịch trong ${rules.advanceDays} ngày tới.` })
  const staff = await db.select({ id: employees.id, name: employees.fullName }).from(employees).where(and(eq(employees.branchId, input.branchId), eq(employees.status, 'active'), isNull(employees.deletedAt), serviceProvider(), input.employeeId ? eq(employees.id, input.employeeId) : undefined)).orderBy(asc(employees.fullName))
  const [busy, attendance] = await Promise.all([
    db.select({ employeeId: appointmentServices.employeeId, startsAt: appointments.startsAt, endsAt: appointments.endsAt, bufferMinutes: services.bufferMinutes }).from(appointmentServices)
      .innerJoin(appointments, eq(appointmentServices.appointmentId, appointments.id))
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(and(gte(appointments.startsAt, day.start), lt(appointments.startsAt, day.end), ne(appointments.status, 'cancelled'), isNotNull(appointmentServices.employeeId))),
    db.select({ employeeId: attendanceRecords.employeeId, shiftStart: attendanceRecords.shiftStart, shiftEnd: attendanceRecords.shiftEnd, status: attendanceRecords.status }).from(attendanceRecords).where(and(eq(attendanceRecords.branchId, input.branchId), eq(attendanceRecords.workDate, input.date))),
  ])
  const attendanceMap = new Map(attendance.map(row => [row.employeeId, row]))
  const duration = service.durationMinutes + service.bufferMinutes
  const slots: AvailabilitySlot[] = []
  for (let minute = minutes(rules.open); minute + duration <= minutes(rules.close); minute += rules.interval) {
    const start = bookingDateTime(input.date, timeLabel(minute))
    if (start.getTime() < Date.now() + 30 * 60_000) continue
    const end = new Date(start.getTime() + duration * 60_000)
    const available = staff.filter(person => {
      const shift = attendanceMap.get(person.id)
      if (shift && ['absent', 'leave'].includes(shift.status)) return false
      if (shift?.shiftStart && minute < minutes(shift.shiftStart)) return false
      if (shift?.shiftEnd && minute + duration > minutes(shift.shiftEnd)) return false
      return !busy.some(item => item.employeeId === person.id && item.startsAt < end && new Date(item.endsAt.getTime() + item.bufferMinutes * 60_000) > start)
    })
    const selected = available[0]
    if (selected) slots.push({ time: timeLabel(minute), employeeId: selected.id, employeeName: selected.name })
  }
  return { date: input.date, durationMinutes: service.durationMinutes, bufferMinutes: service.bufferMinutes, slots }
}

type BookingTransaction = Parameters<Parameters<ReturnType<typeof useDatabase>['transaction']>[0]>[0]

export async function assertEmployeeAvailable(tx: BookingTransaction, input: { employeeId: number; start: Date; end: Date; excludeAppointmentId?: number }) {
  const conditions = [eq(appointmentServices.employeeId, input.employeeId), ne(appointments.status, 'cancelled'), lt(appointments.startsAt, input.end), sql<boolean>`DATE_ADD(${appointments.endsAt}, INTERVAL ${services.bufferMinutes} MINUTE) > ${input.start}`]
  if (input.excludeAppointmentId) conditions.push(ne(appointments.id, input.excludeAppointmentId))
  const [conflict] = await tx.select({ id: appointments.id }).from(appointmentServices).innerJoin(appointments, eq(appointmentServices.appointmentId, appointments.id)).innerJoin(services, eq(appointmentServices.serviceId, services.id)).where(and(...conditions)).limit(1).for('update')
  if (conflict) throw createError({ statusCode: 409, statusMessage: 'Khung giờ này vừa có người đặt. Vui lòng chọn giờ khác.' })
}
