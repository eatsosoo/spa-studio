import { and, eq, isNull } from 'drizzle-orm'
import { customers } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { verifyPassword } from '../../utils/admin-auth'
import { createCustomerSession, normalizeCustomerPhone, validCustomerPhone } from '../../utils/customer-auth'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'customer-login', 10, 15 * 60_000)
  const body = await readBody<{ phone?: string; password?: string }>(event)
  const phone = normalizeCustomerPhone(body.phone)
  const password = String(body.password ?? '')
  if (!validCustomerPhone(phone) || !password) throw createError({ statusCode: 422, statusMessage: 'Vui lòng nhập số điện thoại và mật khẩu.' })
  const [customer] = await useDatabase().select().from(customers).where(and(eq(customers.phone, phone), eq(customers.status, 'active'), isNull(customers.deletedAt))).limit(1)
  if (!customer?.passwordHash || !(await verifyPassword(password, customer.passwordHash))) throw createError({ statusCode: 401, statusMessage: 'Số điện thoại hoặc mật khẩu chưa đúng.' })
  await createCustomerSession(event, customer.id)
  return { ok: true, data: { id: customer.id, name: customer.fullName, phone: customer.phone, email: customer.email ?? '', loyaltyPoints: customer.loyaltyPoints, totalSpent: Number(customer.totalSpent) } }
})
