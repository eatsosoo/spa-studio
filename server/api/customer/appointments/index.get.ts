import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { appointmentServices, appointments, branches, customerNotifications, employees, promotions } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { getCustomerSession } from '../../../utils/customer-auth'

const statusLabels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đã đến', in_service: 'Đang phục vụ', completed: 'Đã hoàn tất', cancelled: 'Đã hủy', no_show: 'Không đến' } as const

export default defineEventHandler(async (event) => {
  const customer = await getCustomerSession(event)
  const db = useDatabase()
  const now = new Date()
  const [appointmentRows, notificationRows, promotionRows] = await Promise.all([
    db.select({
      id: appointments.id, reference: appointments.reference, startsAt: appointments.startsAt, endsAt: appointments.endsAt,
      status: appointments.status, totalAmount: appointments.totalAmount, notes: appointments.notes, cancellationReason: appointments.cancellationReason,
      branch: branches.name, branchAddress: branches.addressLine, serviceId: appointmentServices.serviceId, service: appointmentServices.serviceName,
      durationMinutes: appointmentServices.durationMinutes, employeeId: appointmentServices.employeeId, employee: employees.fullName,
    }).from(appointments)
      .innerJoin(branches, eq(appointments.branchId, branches.id))
      .innerJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
      .leftJoin(employees, eq(appointmentServices.employeeId, employees.id))
      .where(eq(appointments.customerId, customer!.id)).orderBy(desc(appointments.startsAt)),
    db.select({ id: customerNotifications.id, type: customerNotifications.type, title: customerNotifications.title, message: customerNotifications.message, scheduledAt: customerNotifications.scheduledAt, readAt: customerNotifications.readAt })
      .from(customerNotifications).where(and(eq(customerNotifications.customerId, customer!.id), lte(customerNotifications.scheduledAt, now))).orderBy(desc(customerNotifications.scheduledAt)).limit(20),
    db.select({ id: promotions.id, name: promotions.name, description: promotions.description, discountType: promotions.discountType, discountValue: promotions.discountValue, endsAt: promotions.endsAt })
      .from(promotions).where(and(eq(promotions.isActive, true), lte(promotions.startsAt, now), gte(promotions.endsAt, now))).orderBy(asc(promotions.endsAt)),
  ])
  return {
    data: {
      customer,
      appointments: appointmentRows.map(row => ({ ...row, totalAmount: Number(row.totalAmount), startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), statusLabel: statusLabels[row.status], canManage: ['pending', 'confirmed'].includes(row.status) && row.startsAt.getTime() > Date.now() + 2 * 60 * 60_000 })),
      notifications: notificationRows.map(row => ({ ...row, scheduledAt: row.scheduledAt.toISOString(), readAt: row.readAt?.toISOString() ?? null })),
      promotions: promotionRows.map(row => ({ ...row, discountValue: Number(row.discountValue), endsAt: row.endsAt.toISOString() })),
    },
  }
})
