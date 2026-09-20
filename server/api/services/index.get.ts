import { and, asc, eq, isNull } from 'drizzle-orm'
import { serviceCategories, services } from '../../database/schema'
import { useDatabase } from '../../database/client'

export default defineEventHandler(async (event) => {
  const rows = await useDatabase().select({
    id: services.id,
    code: services.code,
    slug: services.slug,
    name: services.name,
    description: services.description,
    durationMinutes: services.durationMinutes,
    bufferMinutes: services.bufferMinutes,
    price: services.price,
    category: serviceCategories.name,
  }).from(services)
    .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(and(eq(services.isActive, true), isNull(services.deletedAt)))
    .orderBy(asc(serviceCategories.sortOrder), asc(services.name))

  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return { data: rows.map(row => ({ ...row, category: row.category ?? 'Liệu trình MIÊN', description: row.description ?? '', price: Number(row.price) })) }
})
