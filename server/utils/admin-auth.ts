import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { authSessions, branches, employees, roles, userRoles, users } from '../database/schema'
import { useDatabase } from '../database/client'

const scrypt = promisify(scryptCallback)
const sessionCookie = 'mien_admin_session'
const sessionMaxAge = 60 * 60 * 24 * 7

export type AdminUser = {
  id: number
  username: string
  email: string
  phone: string
  fullName: string
  jobTitle: string
  initials: string
  roles: Array<{ code: string; name: string; branch: string }>
}

const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex')
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toLocaleUpperCase('vi') ?? '').join('')

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, key] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'hex')
  const actual = await scrypt(password, salt, expected.length) as Buffer
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function ensureBootstrapAdmin() {
  const config = useRuntimeConfig()
  const username = String(config.adminBootstrapUsername ?? '').trim()
  const password = String(config.adminBootstrapPassword ?? '')
  const email = String(config.adminBootstrapEmail ?? '').trim() || null
  if (!username || password.length < 8) return

  const db = useDatabase()
  const [countRow] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(inArray(roles.code, ['owner', 'manager']))
  if (Number(countRow?.count ?? 0) > 0) return

  const [branch] = await db.select({ id: branches.id }).from(branches).where(eq(branches.code, 'MAIN')).limit(1)
  const [ownerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, 'owner')).limit(1)
  if (!branch || !ownerRole) throw createError({ statusCode: 409, statusMessage: 'Hãy chạy migration database trước khi đăng nhập.' })

  await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({ username, email, passwordHash: await hashPassword(password), status: 'active' }).$returningId()
    if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể khởi tạo tài khoản quản trị.' })
    await tx.insert(userRoles).values({ userId: created.id, roleId: ownerRole.id, branchId: branch.id })
    await tx.insert(employees).values({ userId: created.id, branchId: branch.id, code: `ADMIN-${created.id}`, fullName: username, email, hireDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }), jobTitle: 'Quản trị hệ thống', status: 'active' })
  })
}

export async function findLoginUser(identifier: string) {
  const db = useDatabase()
  const [user] = await db.select().from(users).where(and(or(eq(users.username, identifier), eq(users.email, identifier)), isNull(users.deletedAt))).limit(1)
  return user
}

export async function createAdminSession(event: H3Event, userId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionMaxAge * 1000)
  await useDatabase().insert(authSessions).values({
    userId,
    tokenHash: sessionHash(token),
    ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
    userAgent: getHeader(event, 'user-agent')?.slice(0, 500) ?? null,
    expiresAt,
  })
  setCookie(event, sessionCookie, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionMaxAge })
}

export async function revokeAdminSession(event: H3Event) {
  const token = getCookie(event, sessionCookie)
  if (token) await useDatabase().update(authSessions).set({ revokedAt: new Date(), revokeReason: 'logout' }).where(and(eq(authSessions.tokenHash, sessionHash(token)), isNull(authSessions.revokedAt)))
  deleteCookie(event, sessionCookie, { path: '/' })
}

export async function getAdminUserById(userId: number): Promise<AdminUser> {
  const db = useDatabase()
  const [account] = await db.select({ id: users.id, username: users.username, email: users.email, phone: users.phone, fullName: employees.fullName, jobTitle: employees.jobTitle }).from(users)
    .leftJoin(employees, and(eq(employees.userId, users.id), isNull(employees.deletedAt)))
    .where(and(eq(users.id, userId), eq(users.status, 'active'), isNull(users.deletedAt))).limit(1)
  if (!account) throw createError({ statusCode: 401, statusMessage: 'Tài khoản không còn hoạt động.' })

  const assignedRoles = await db.select({ code: roles.code, name: roles.name, branch: branches.name }).from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id)).innerJoin(branches, eq(userRoles.branchId, branches.id))
    .where(eq(userRoles.userId, account.id))
  if (!assignedRoles.some(role => role.code === 'owner' || role.code === 'manager')) throw createError({ statusCode: 403, statusMessage: 'Tài khoản không có quyền truy cập khu vực quản trị.' })

  const fullName = account.fullName?.trim() || account.username
  return { id: account.id, username: account.username, email: account.email ?? '', phone: account.phone ?? '', fullName, jobTitle: account.jobTitle ?? assignedRoles[0]?.name ?? 'Quản trị viên', initials: initials(fullName), roles: assignedRoles }
}

export async function getAdminUser(event: H3Event, required = true): Promise<AdminUser | null> {
  const token = getCookie(event, sessionCookie)
  if (!token) {
    if (required) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập không tồn tại.' })
    return null
  }

  const db = useDatabase()
  const [account] = await db.select({ sessionId: authSessions.id, userId: users.id }).from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .leftJoin(employees, and(eq(employees.userId, users.id), isNull(employees.deletedAt)))
    .where(and(eq(authSessions.tokenHash, sessionHash(token)), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, new Date()), eq(users.status, 'active'), isNull(users.deletedAt)))
    .limit(1)

  if (!account) {
    deleteCookie(event, sessionCookie, { path: '/' })
    if (required) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập đã hết hạn.' })
    return null
  }

  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, account.sessionId))
  return getAdminUserById(account.userId)
}
