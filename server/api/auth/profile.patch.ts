import { and, eq, isNull } from 'drizzle-orm'
import { employees, users } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { getAdminUser, hashPassword, verifyPassword } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const current = await getAdminUser(event)
  const body = await readBody<Record<string, unknown>>(event)
  const fullName = String(body.fullName ?? '').trim()
  const email = String(body.email ?? '').trim() || null
  const phone = String(body.phone ?? '').trim() || null
  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')
  if (!fullName) throw createError({ statusCode: 422, statusMessage: 'Họ và tên là bắt buộc.' })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 422, statusMessage: 'Email chưa đúng định dạng.' })
  if (newPassword && newPassword.length < 8) throw createError({ statusCode: 422, statusMessage: 'Mật khẩu mới cần ít nhất 8 ký tự.' })

  const db = useDatabase()
  const [account] = await db.select().from(users).where(eq(users.id, current!.id)).limit(1)
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy tài khoản.' })
  if (newPassword && (!currentPassword || !await verifyPassword(currentPassword, account.passwordHash))) throw createError({ statusCode: 422, statusMessage: 'Mật khẩu hiện tại không đúng.' })

  await db.transaction(async (tx) => {
    await tx.update(users).set({ email, phone, ...(newPassword ? { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() } : {}) }).where(eq(users.id, current!.id))
    const [employee] = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.userId, current!.id), isNull(employees.deletedAt))).limit(1)
    if (employee) await tx.update(employees).set({ fullName, email, phone }).where(eq(employees.id, employee.id))
  })
  return { data: await getAdminUser(event) }
})
