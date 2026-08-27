import { createAdminSession, ensureBootstrapAdmin, findLoginUser, getAdminUserById, verifyPassword } from '../../utils/admin-auth'
import { users } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ identifier?: string; password?: string; remember?: boolean }>(event)
  const identifier = String(body.identifier ?? '').trim()
  const password = String(body.password ?? '')
  if (!identifier || !password) throw createError({ statusCode: 422, statusMessage: 'Vui lòng nhập tài khoản và mật khẩu.' })

  await ensureBootstrapAdmin()
  const account = await findLoginUser(identifier)
  if (account?.lockedUntil && account.lockedUntil > new Date()) throw createError({ statusCode: 423, statusMessage: 'Tài khoản đang tạm khóa. Vui lòng thử lại sau.' })
  if (!account || account.status !== 'active' || !await verifyPassword(password, account.passwordHash)) {
    if (account) {
      const attempts = account.failedLoginAttempts + 1
      await useDatabase().update(users).set({ failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(users.id, account.id))
    }
    throw createError({ statusCode: 401, statusMessage: 'Tài khoản hoặc mật khẩu không đúng.' })
  }

  await useDatabase().update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, account.id))
  await createAdminSession(event, account.id)
  return { data: await getAdminUserById(account.id) }
})
