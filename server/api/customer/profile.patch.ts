import { eq } from 'drizzle-orm'
import { customers } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { getCustomerSession } from '../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  const session = await getCustomerSession(event)
  const body = await readBody<{ name?: string; email?: string; gender?: 'female' | 'male' | 'other' | ''; dateOfBirth?: string; address?: string; marketingConsent?: boolean }>(event)
  const name = String(body.name ?? '').trim().slice(0, 150)
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 190)
  const dateOfBirth = String(body.dateOfBirth ?? '')
  if (name.length < 2) throw createError({ statusCode: 422, statusMessage: 'Họ tên chưa hợp lệ.' })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 422, statusMessage: 'Email chưa đúng định dạng.' })
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw createError({ statusCode: 422, statusMessage: 'Ngày sinh chưa hợp lệ.' })
  const gender = ['female', 'male', 'other'].includes(String(body.gender)) ? body.gender as 'female' | 'male' | 'other' : null
  await useDatabase().update(customers).set({ fullName: name, email: email || null, gender, dateOfBirth: dateOfBirth || null, address: String(body.address ?? '').trim().slice(0, 255) || null, marketingConsent: Boolean(body.marketingConsent) }).where(eq(customers.id, session!.id))
  return { ok: true }
})
