import { and, eq, isNull, ne } from 'drizzle-orm'
import { customerSessions, customers } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { hashPassword, verifyPassword } from '../../utils/admin-auth'
import { getCustomerSession, hashCustomerToken } from '../../utils/customer-auth'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'customer-change-password', 5, 15 * 60_000)
  const session = await getCustomerSession(event)
  const body = await readBody<{ currentPassword?: string; newPassword?: string }>(event)
  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')
  if (newPassword.length < 8 || !/[A-Za-zÀ-ỹ]/.test(newPassword) || !/\d/.test(newPassword)) throw createError({ statusCode: 422, statusMessage: 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.' })
  const db = useDatabase()
  const [customer] = await db.select({ passwordHash: customers.passwordHash }).from(customers).where(eq(customers.id, session!.id)).limit(1)
  if (!customer) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy tài khoản khách hàng.' })
  if (customer.passwordHash && !(await verifyPassword(currentPassword, customer.passwordHash))) throw createError({ statusCode: 401, statusMessage: 'Mật khẩu hiện tại chưa đúng.' })
  await db.update(customers).set({ passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() }).where(eq(customers.id, session!.id))
  const currentToken = getCookie(event, 'mien_customer_session')
  if (currentToken) await db.update(customerSessions).set({ revokedAt: new Date() }).where(and(eq(customerSessions.customerId, session!.id), isNull(customerSessions.revokedAt), ne(customerSessions.tokenHash, hashCustomerToken(currentToken))))
  return { ok: true }
})
