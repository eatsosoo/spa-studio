import { and, asc, eq, isNull, like, ne, or } from 'drizzle-orm'
import { postCategories, posts, products, services } from '../../database/schema'
import { useDatabase } from '../../database/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const term = String(query.q ?? '').trim().slice(0, 80)
  const pattern = `%${term}%`
  const currentPostId = Number(query.postId ?? 0)
  const category = String(query.category ?? '').trim()
  const db = useDatabase()
  const postConditions = [isNull(posts.deletedAt)]
  if (currentPostId > 0) postConditions.push(ne(posts.id, currentPostId))
  if (term) postConditions.push(or(like(posts.title, pattern), like(posts.slug, pattern))!)
  if (!term && category) postConditions.push(eq(postCategories.name, category))

  const [postRows, productRows, serviceRows] = await Promise.all([
    db.select({ id: posts.id, title: posts.title, slug: posts.slug }).from(posts).leftJoin(postCategories, eq(posts.categoryId, postCategories.id)).where(and(...postConditions)).orderBy(asc(posts.title)).limit(12),
    db.select({ id: products.id, title: products.name, slug: products.slug }).from(products).where(and(isNull(products.deletedAt), term ? or(like(products.name, pattern), like(products.slug, pattern)) : undefined)).orderBy(asc(products.name)).limit(12),
    db.select({ id: services.id, title: services.name, slug: services.slug }).from(services).where(and(isNull(services.deletedAt), term ? or(like(services.name, pattern), like(services.slug, pattern)) : undefined)).orderBy(asc(services.name)).limit(12),
  ])
  const items = [
    ...postRows.map(item => ({ ...item, type: 'Bài viết', url: `/bai-viet/${item.slug}` })),
    ...productRows.map(item => ({ ...item, type: 'Sản phẩm', url: `/san-pham/${item.slug}` })),
    ...serviceRows.map(item => ({ ...item, type: 'Dịch vụ', url: `/#dich-vu-${item.slug}` })),
    { id: 0, title: 'Trang sản phẩm', type: 'Trang', url: '/san-pham' },
    { id: -1, title: 'Trang bài viết', type: 'Trang', url: '/bai-viet' },
  ]
  return { data: items.slice(0, 30) }
})
