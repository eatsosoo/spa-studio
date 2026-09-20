import { eq, sql } from 'drizzle-orm'
import { appointments, customers } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { getCustomerSession } from '../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  const session = await getCustomerSession(event)
  const db = useDatabase()
  const [[profile], [stats]] = await Promise.all([
    db.select({ id: customers.id, name: customers.fullName, phone: customers.phone, email: customers.email, gender: customers.gender, dateOfBirth: customers.dateOfBirth, address: customers.address, marketingConsent: customers.marketingConsent, loyaltyPoints: customers.loyaltyPoints, totalSpent: customers.totalSpent, passwordHash: customers.passwordHash, createdAt: customers.createdAt }).from(customers).where(eq(customers.id, session!.id)).limit(1),
    db.select({ completedAppointments: sql<number>`sum(case when ${appointments.status} = 'completed' then 1 else 0 end)`.mapWith(Number), upcomingAppointments: sql<number>`sum(case when ${appointments.startsAt} >= ${new Date()} and ${appointments.status} not in ('cancelled','completed','no_show') then 1 else 0 end)`.mapWith(Number) }).from(appointments).where(eq(appointments.customerId, session!.id)),
  ])
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy hồ sơ khách hàng.' })
  const { passwordHash, ...publicProfile } = profile
  return { data: { ...publicProfile, hasPassword: Boolean(passwordHash), email: profile.email ?? '', address: profile.address ?? '', totalSpent: Number(profile.totalSpent), createdAt: profile.createdAt.toISOString(), stats: { completedAppointments: stats?.completedAppointments ?? 0, upcomingAppointments: stats?.upcomingAppointments ?? 0 } } }
})
