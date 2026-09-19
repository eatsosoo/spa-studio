import { createAdminSession, ensureBootstrapAdmin, findLoginUser, getAdminUserById, verifyPassword } from '../../utils/admin-auth'
import { users } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { eq } from 'drizzle-orm'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'admin-login', 15, 15 * 60_000)
  const body = await readBody<{ identifier?: string; password?: string; remember?: boolean }>(event)
  const identifier = String(body.identifier ?? '').trim()
  const password = String(body.password ?? '')
  if (!identifier || !password) throw createError({ statusCode: 422, statusMessage: 'Vui lòng nhập tài khoản và mật khẩu.' })

  await ensureBootstrapAdmin()
  const account = await findLoginUser(identifier)
  if (!account || account.status !== 'active' || !await verifyPassword(password, account.passwordHash)) {
    throw createError({ statusCode: 401, statusMessage: 'Tài khoản hoặc mật khẩu không đúng.' })
  }

  await useDatabase().update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, account.id))
  await createAdminSession(event, account.id)
  return { data: await getAdminUserById(account.id) }
})
