import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { appointments, customers } from '../../../database/schema'
import { dateVi, reverseStatus, statusValue, textValue, type AdminResource } from '../shared'

const customerStatuses = {
  'Đang hoạt động': 'active',
  'Tạm ngưng': 'inactive',
  'Đã chặn': 'blocked',
} as const

async function listCustomers() {
  const db = useDatabase()
  const rows = await db.select({
    id: customers.id,
    name: customers.fullName,
    phone: customers.phone,
    email: customers.email,
    note: customers.notes,
    customerStatus: customers.status,
    totalSpent: customers.totalSpent,
    visits: sql<number>`(select count(*) from ${appointments} a where a.customer_id = ${customers.id} and a.status = 'completed')`.mapWith(Number),
    lastVisit: sql<Date | null>`(select max(a.starts_at) from ${appointments} a where a.customer_id = ${customers.id} and a.status = 'completed')`,
  }).from(customers).where(isNull(customers.deletedAt)).orderBy(desc(customers.updatedAt))

  return rows.map(row => ({
    ...row,
    email: row.email ?? '',
    note: row.note ?? '',
    lastVisit: dateVi(row.lastVisit),
    tier: Number(row.totalSpent) >= 10_000_000 || row.visits >= 10 ? 'An' : row.visits >= 3 ? 'Mộc' : 'Khách mới',
    status: reverseStatus(customerStatuses, row.customerStatus),
    totalSpent: undefined,
    customerStatus: undefined,
  }))
}

async function saveCustomer(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const values = {
    fullName: textValue(body, 'name')!,
    phone: textValue(body, 'phone')!,
    email: textValue(body, 'email', false),
    notes: textValue(body, 'note', false),
    status: statusValue(body, 'status', customerStatuses, 'active'),
  }
  if (id) await db.update(customers).set(values).where(and(eq(customers.id, id), isNull(customers.deletedAt)))
  else await db.insert(customers).values({ ...values, code: `KH-${Date.now().toString(36)}`.toUpperCase() })
}

async function removeCustomer(id: number) {
  return useDatabase().update(customers).set({ deletedAt: new Date() }).where(eq(customers.id, id))
}

export const customerResource = {
  list: listCustomers,
  save: saveCustomer,
  remove: removeCustomer,
} satisfies AdminResource
