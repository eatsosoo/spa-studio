import { and, asc, desc, eq, gte, isNull, like, lt, ne } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import {
  appointmentServices,
  appointments,
  customers,
  employees,
  inventoryLocations,
  services,
  serviceProductUsages,
} from '../../../database/schema'
import { consumeInventoryFefo } from '../../../services/inventory'
import { defaultBranch } from '../default-branch'
import { dateInput, insertedId, reverseStatus, slugify, statusValue, textValue, timeInput, type AdminResource } from '../shared'

const bookingStatuses = { 'Chờ xác nhận': 'pending', 'Đã xác nhận': 'confirmed', 'Đã đến': 'checked_in', 'Đang phục vụ': 'in_service', 'Đã hoàn tất': 'completed', 'Đã hủy': 'cancelled' } as const
const employeeStatuses = { 'Đang làm việc': 'active', 'Nghỉ hôm nay': 'on_leave', 'Đã nghỉ việc': 'terminated' } as const

async function serviceByName(db: ReturnType<typeof useDatabase>, name: string) {
  const [found] = await db.select().from(services).where(and(eq(services.name, name), isNull(services.deletedAt))).limit(1)
  if (found) return found
  const suffix = Date.now().toString(36)
  const [created] = await db.insert(services).values({ code: `DV-${suffix}`.toUpperCase(), name, slug: `${slugify(name)}-${suffix}`, durationMinutes: 60, price: '0', isActive: true }).$returningId()
  const [result] = await db.select().from(services).where(eq(services.id, insertedId(created))).limit(1)
  return result!
}

async function listBookings() {
  const db = useDatabase()
  const rows = await db.select({
    id: appointments.id, customer: appointments.customerName, phone: appointments.customerPhone,
    startsAt: appointments.startsAt, bookingStatus: appointments.status, note: appointments.notes, total: appointments.totalAmount,
    service: appointmentServices.serviceName, staff: employees.fullName,
  }).from(appointments)
    .leftJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
    .leftJoin(employees, eq(appointmentServices.employeeId, employees.id))
    .orderBy(desc(appointments.startsAt))
  return rows.map(row => ({ id: row.id, customer: row.customer, phone: row.phone, date: dateInput(row.startsAt), time: timeInput(row.startsAt), service: row.service ?? 'Chưa chọn', staff: row.staff ?? 'Chưa phân công', room: 'Chưa xếp', note: row.note ?? '', total: Number(row.total), status: reverseStatus(bookingStatuses, row.bookingStatus) }))
}

export async function getDailyBookingSchedule(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw createError({ statusCode: 400, statusMessage: 'Ngày xem lịch không hợp lệ.' })
  const startsAt = new Date(`${value}T00:00:00+07:00`)
  if (Number.isNaN(startsAt.getTime()) || dateInput(startsAt) !== value) throw createError({ statusCode: 400, statusMessage: 'Ngày xem lịch không hợp lệ.' })
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000)
  const db = useDatabase()
  const [employeeRows, bookingRows] = await Promise.all([
    db.select({ id: employees.id, name: employees.fullName, role: employees.jobTitle, employeeStatus: employees.status })
      .from(employees)
      .where(and(isNull(employees.deletedAt), ne(employees.status, 'terminated')))
      .orderBy(asc(employees.fullName)),
    db.select({
      id: appointments.id, reference: appointments.reference, customer: appointments.customerName, phone: appointments.customerPhone,
      startsAt: appointments.startsAt, endsAt: appointments.endsAt, bookingStatus: appointments.status, note: appointments.notes,
      service: appointmentServices.serviceName, durationMinutes: appointmentServices.durationMinutes,
      staffId: appointmentServices.employeeId, staff: employees.fullName,
    }).from(appointments)
      .leftJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
      .leftJoin(employees, eq(appointmentServices.employeeId, employees.id))
      .where(and(gte(appointments.startsAt, startsAt), lt(appointments.startsAt, endsAt)))
      .orderBy(asc(appointments.startsAt)),
  ])
  return {
    date: value,
    employees: employeeRows.map(row => ({ id: row.id, name: row.name, role: row.role ?? 'Chưa phân vai trò', status: reverseStatus(employeeStatuses, row.employeeStatus) })),
    bookings: bookingRows.map(row => ({
      id: row.id, reference: row.reference, customer: row.customer, phone: row.phone,
      date: dateInput(row.startsAt), time: timeInput(row.startsAt), endTime: timeInput(row.endsAt),
      durationMinutes: row.durationMinutes ?? Math.max(30, Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000)),
      service: row.service ?? 'Chưa chọn', staffId: row.staffId ?? 0, staff: row.staff ?? 'Chưa phân công',
      note: row.note ?? '', status: reverseStatus(bookingStatuses, row.bookingStatus),
    })),
  }
}

async function saveBooking(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const customer = textValue(body, 'customer')!
  const phone = textValue(body, 'phone')!
  const service = await serviceByName(db, textValue(body, 'service')!)
  const staffName = textValue(body, 'staff', false)
  const [employee] = staffName ? await db.select({ id: employees.id }).from(employees).where(and(like(employees.fullName, `%${staffName}%`), isNull(employees.deletedAt))).limit(1) : []
  const start = new Date(`${textValue(body, 'date')}T${textValue(body, 'time')}:00+07:00`)
  if (Number.isNaN(start.getTime())) throw createError({ statusCode: 422, statusMessage: 'Ngày hoặc giờ hẹn không hợp lệ.' })
  const end = new Date(start.getTime() + service.durationMinutes * 60_000)
  const [knownCustomer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.phone, phone), isNull(customers.deletedAt))).limit(1)
  const appointmentValues = { branchId: await defaultBranch(db), customerId: knownCustomer?.id, customerName: customer, customerPhone: phone, startsAt: start, endsAt: end, status: statusValue(body, 'status', bookingStatuses, 'pending'), source: body.source === 'website' ? 'website' as const : 'admin' as const, subtotal: service.price, totalAmount: service.price, notes: textValue(body, 'note', false) }
  let reference = ''
  await db.transaction(async tx => {
    let appointmentId = id
    if (appointmentId) await tx.update(appointments).set(appointmentValues).where(eq(appointments.id, appointmentId))
    else {
      reference = `LH-${Date.now().toString(36)}`.toUpperCase()
      const [created] = await tx.insert(appointments).values({ ...appointmentValues, reference }).$returningId()
      appointmentId = insertedId(created)
    }
    const lineStatus = appointmentValues.status === 'completed' ? 'completed' : appointmentValues.status === 'cancelled' ? 'cancelled' : 'scheduled'
    const [existingLine] = await tx.select().from(appointmentServices).where(eq(appointmentServices.appointmentId, appointmentId!)).orderBy(appointmentServices.id).limit(1).for('update')
    if (existingLine?.inventoryDeductedAt && (existingLine.serviceId !== service.id || lineStatus !== 'completed')) throw createError({ statusCode: 409, statusMessage: 'Dịch vụ đã hoàn tất và đã xuất vật tư nên không thể đổi dịch vụ hoặc chuyển về trạng thái trước đó.' })
    let appointmentServiceId: number
    if (existingLine) {
      appointmentServiceId = existingLine.id
      await tx.update(appointmentServices).set({ serviceId: service.id, employeeId: employee?.id, serviceName: service.name, durationMinutes: service.durationMinutes, unitPrice: service.price, finalPrice: service.price, status: lineStatus, completedAt: lineStatus === 'completed' ? existingLine.completedAt ?? new Date() : null }).where(eq(appointmentServices.id, existingLine.id))
    } else {
      const [createdLine] = await tx.insert(appointmentServices).values({ appointmentId: appointmentId!, serviceId: service.id, employeeId: employee?.id, serviceName: service.name, durationMinutes: service.durationMinutes, unitPrice: service.price, finalPrice: service.price, status: lineStatus, completedAt: lineStatus === 'completed' ? new Date() : null }).$returningId()
      appointmentServiceId = insertedId(createdLine)
    }
    if (lineStatus === 'completed' && !existingLine?.inventoryDeductedAt) {
      const [location] = await tx.select({ id: inventoryLocations.id }).from(inventoryLocations).where(and(eq(inventoryLocations.branchId, appointmentValues.branchId), eq(inventoryLocations.isActive, true))).orderBy(inventoryLocations.id).limit(1)
      if (!location) throw createError({ statusCode: 409, statusMessage: 'Chi nhánh chưa có kho để trừ vật tư dịch vụ.' })
      const usages = await tx.select().from(serviceProductUsages).where(eq(serviceProductUsages.serviceId, service.id))
      let materialCost = 0
      for (const usage of usages) {
        const allocations = await consumeInventoryFefo(tx, { productId: usage.productId, locationId: location.id, quantity: Number(usage.quantity), type: 'service_usage', referenceType: 'appointment_service', referenceId: appointmentServiceId, note: `Vật tư cho lịch hẹn ${appointmentId}` })
        materialCost += allocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.unitCost, 0)
      }
      await tx.update(appointmentServices).set({ inventoryDeductedAt: new Date(), materialCost: materialCost.toFixed(2) }).where(eq(appointmentServices.id, appointmentServiceId))
    }
  })
  return { reference }
}

async function removeBooking(id: number) {
  return useDatabase().delete(appointments).where(eq(appointments.id, id))
}

export const bookingResource = { list: listBookings, save: saveBooking, remove: removeBooking } satisfies AdminResource
