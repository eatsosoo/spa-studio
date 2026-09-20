import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { customers } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { hashPassword } from '../../utils/admin-auth'
import { createCustomerSession, normalizeCustomerPhone, validCustomerPhone } from '../../utils/customer-auth'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'customer-register', 5, 60 * 60_000)
  const body = await readBody<{ name?: string; phone?: string; password?: string; email?: string }>(event)
  const name = String(body.name ?? '').trim().slice(0, 150)
  const phone = normalizeCustomerPhone(body.phone)
  const password = String(body.password ?? '')
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 190)
  if (name.length < 2 || !validCustomerPhone(phone)) throw createError({ statusCode: 422, statusMessage: 'Họ tên hoặc số điện thoại chưa hợp lệ.' })
  if (password.length < 8 || !/[A-Za-zÀ-ỹ]/.test(password) || !/\d/.test(password)) throw createError({ statusCode: 422, statusMessage: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.' })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 422, statusMessage: 'Email chưa đúng định dạng.' })
  const db = useDatabase()
  const [existing] = await db.select({ id: customers.id, passwordHash: customers.passwordHash, status: customers.status, email: customers.email, loyaltyPoints: customers.loyaltyPoints, totalSpent: customers.totalSpent }).from(customers).where(and(eq(customers.phone, phone), isNull(customers.deletedAt))).limit(1)
  if (existing?.passwordHash) throw createError({ statusCode: 409, statusMessage: 'Số điện thoại này đã có tài khoản. Vui lòng đăng nhập.' })
  if (existing) {
    if (existing.status !== 'active') throw createError({ statusCode: 403, statusMessage: 'Hồ sơ này đang bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ spa.' })
    // Temporary direct registration: reuse the existing customer and retain their history.
    // The conditional update prevents concurrent requests from replacing a newly set password.
    const registeredEmail = email || existing.email || null
    const [result] = await db.update(customers).set({ fullName: name, email: registeredEmail, passwordHash: await hashPassword(password), passwordChangedAt: new Date() }).where(and(eq(customers.id, existing.id), isNull(customers.passwordHash), eq(customers.status, 'active'), isNull(customers.deletedAt)))
    if (result.affectedRows !== 1) throw createError({ statusCode: 409, statusMessage: 'Hồ sơ đã thay đổi hoặc đã có tài khoản. Vui lòng thử đăng nhập.' })
    await createCustomerSession(event, existing.id)
    return { ok: true, data: { id: existing.id, name, phone, email: registeredEmail ?? '', loyaltyPoints: existing.loyaltyPoints, totalSpent: Number(existing.totalSpent) } }
  }
  const [created] = await db.insert(customers).values({ code: `KH-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`.toUpperCase(), fullName: name, phone, email: email || null, passwordHash: await hashPassword(password), passwordChangedAt: new Date(), source: 'website' }).$returningId()
  if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo tài khoản khách hàng.' })
  await createCustomerSession(event, created.id)
  return { ok: true, data: { id: created.id, name, phone, email, loyaltyPoints: 0, totalSpent: 0 } }
})
