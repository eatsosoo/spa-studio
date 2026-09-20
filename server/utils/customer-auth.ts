import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { customerSessions, customers } from '../database/schema'
import { useDatabase } from '../database/client'

const customerCookie = 'mien_customer_session'
const sessionMaxAge = 60 * 60 * 24 * 30

export type CustomerSessionUser = {
  id: number
  name: string
  phone: string
  email: string
  loyaltyPoints: number
  totalSpent: number
}

export const normalizeCustomerPhone = (value: unknown) => String(value ?? '').replace(/[\s.-]/g, '').replace(/^\+84/, '0')
export const validCustomerPhone = (value: string) => /^0\d{9}$/.test(value)
export const hashCustomerToken = (value: string) => createHash('sha256').update(value).digest('hex')

export async function createCustomerSession(event: H3Event, customerId: number) {
  const token = randomBytes(32).toString('base64url')
  await useDatabase().insert(customerSessions).values({
    customerId,
    tokenHash: hashCustomerToken(token),
    ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
    userAgent: getHeader(event, 'user-agent')?.slice(0, 500) ?? null,
    expiresAt: new Date(Date.now() + sessionMaxAge * 1000),
  })
  setCookie(event, customerCookie, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionMaxAge })
}

export async function revokeCustomerSession(event: H3Event) {
  const token = getCookie(event, customerCookie)
  if (token) await useDatabase().update(customerSessions).set({ revokedAt: new Date() }).where(and(eq(customerSessions.tokenHash, hashCustomerToken(token)), isNull(customerSessions.revokedAt)))
  deleteCookie(event, customerCookie, { path: '/' })
}

export async function getCustomerSession(event: H3Event, required = true): Promise<CustomerSessionUser | null> {
  const token = getCookie(event, customerCookie)
  if (!token) {
    if (required) throw createError({ statusCode: 401, statusMessage: 'Bạn cần xác thực số điện thoại để xem lịch.' })
    return null
  }
  const db = useDatabase()
  const [row] = await db.select({
    sessionId: customerSessions.id,
    id: customers.id,
    name: customers.fullName,
    phone: customers.phone,
    email: customers.email,
    loyaltyPoints: customers.loyaltyPoints,
    totalSpent: customers.totalSpent,
  }).from(customerSessions)
    .innerJoin(customers, eq(customerSessions.customerId, customers.id))
    .where(and(eq(customerSessions.tokenHash, hashCustomerToken(token)), isNull(customerSessions.revokedAt), gt(customerSessions.expiresAt, new Date()), eq(customers.status, 'active'), isNull(customers.deletedAt)))
    .limit(1)
  if (!row) {
    deleteCookie(event, customerCookie, { path: '/' })
    if (required) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập đã hết hạn.' })
    return null
  }
  await db.update(customerSessions).set({ lastSeenAt: new Date() }).where(eq(customerSessions.id, row.sessionId))
  return { id: row.id, name: row.name, phone: row.phone, email: row.email ?? '', loyaltyPoints: row.loyaltyPoints, totalSpent: Number(row.totalSpent) }
}
