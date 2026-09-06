import { and, desc, eq, isNull, ne } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { serviceCategories, services } from '../../../database/schema'
import { insertedId, numberValue, slugify, textValue, type AdminResource } from '../shared'

async function serviceCategoryId(db: ReturnType<typeof useDatabase>, name: string) {
  const [found] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(eq(serviceCategories.name, name)).limit(1)
  if (found) return found.id
  const suffix = Date.now().toString(36)
  const [created] = await db.insert(serviceCategories).values({ name, slug: `${slugify(name)}-${suffix}`, isActive: true }).$returningId()
  return insertedId(created)
}

async function listServices() {
  const db = useDatabase()
  const rows = await db.select({
    id: services.id,
    code: services.code,
    name: services.name,
    category: serviceCategories.name,
    durationMinutes: services.durationMinutes,
    bufferMinutes: services.bufferMinutes,
    price: services.price,
    description: services.description,
    isActive: services.isActive,
  }).from(services)
    .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(isNull(services.deletedAt))
    .orderBy(desc(services.updatedAt))

  return rows.map(row => ({
    ...row,
    category: row.category ?? 'Chưa phân nhóm',
    price: Number(row.price),
    description: row.description ?? '',
    status: row.isActive ? 'Đang hoạt động' : 'Tạm ngưng',
    isActive: undefined,
  }))
}

async function saveService(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const name = textValue(body, 'name')!
  const code = textValue(body, 'code')!.toUpperCase()
  const durationMinutes = numberValue(body, 'durationMinutes')
  const bufferMinutes = numberValue(body, 'bufferMinutes')
  if (durationMinutes <= 0) throw createError({ statusCode: 422, statusMessage: 'Thời lượng liệu trình phải lớn hơn 0 phút.' })
  if (id) {
    const [existing] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, id), isNull(services.deletedAt))).limit(1)
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Liệu trình không tồn tại hoặc đã bị xóa.' })
  }
  const [duplicate] = await db.select({ id: services.id }).from(services).where(id ? and(eq(services.code, code), ne(services.id, id)) : eq(services.code, code)).limit(1)
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Mã liệu trình đã được sử dụng.' })
  const values = {
    categoryId: await serviceCategoryId(db, textValue(body, 'category')!),
    code,
    name,
    description: textValue(body, 'description', false),
    durationMinutes,
    bufferMinutes,
    price: String(numberValue(body, 'price')),
    isActive: String(body.status ?? '') !== 'Tạm ngưng',
  }
  if (id) await db.update(services).set({ ...values, slug: `${slugify(name)}-${id}` }).where(and(eq(services.id, id), isNull(services.deletedAt)))
  else await db.insert(services).values({ ...values, slug: `${slugify(name)}-${Date.now().toString(36)}` })
}

async function removeService(id: number) {
  const db = useDatabase()
  const [existing] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, id), isNull(services.deletedAt))).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Liệu trình không tồn tại hoặc đã bị xóa.' })
  return db.update(services).set({ deletedAt: new Date(), isActive: false }).where(eq(services.id, id))
}

export const serviceResource = {
  list: listServices,
  save: saveService,
  remove: removeService,
} satisfies AdminResource
