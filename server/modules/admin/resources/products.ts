import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { inventoryStocks, productCategories, products } from '../../../database/schema'
import { imageSource, insertedId, numberValue, reverseStatus, slugify, statusValue, textValue, type AdminResource } from '../shared'

const productStatuses = {
  'Đang bán': 'active',
  'Sắp hết': 'out_of_stock',
  'Tạm ẩn': 'inactive',
} as const

async function categoryId(db: ReturnType<typeof useDatabase>, name: string) {
  const [found] = await db.select({ id: productCategories.id }).from(productCategories).where(eq(productCategories.name, name)).limit(1)
  if (found) return found.id
  const suffix = Date.now().toString(36)
  const [created] = await db.insert(productCategories).values({ name, slug: `${slugify(name)}-${suffix}` }).$returningId()
  return insertedId(created)
}

async function listProducts() {
  const db = useDatabase()
  const rows = await db.select({
    id: products.id,
    name: products.name,
    sku: products.sku,
    category: productCategories.name,
    price: products.salePrice,
    productStatus: products.status,
    description: products.shortDescription,
    image: products.imageUrl,
    stock: sql<number>`coalesce(sum(${inventoryStocks.quantity}), 0)`.mapWith(Number),
  }).from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(inventoryStocks, eq(products.id, inventoryStocks.productId))
    .where(isNull(products.deletedAt))
    .groupBy(products.id, products.name, products.sku, productCategories.name, products.salePrice, products.status, products.shortDescription)
    .orderBy(desc(products.updatedAt))

  return rows.map(row => ({
    ...row,
    price: Number(row.price),
    category: row.category ?? 'Chưa phân nhóm',
    image: row.image ?? '',
    status: reverseStatus(productStatuses, row.productStatus),
    productStatus: undefined,
  }))
}

async function saveProduct(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const name = textValue(body, 'name')!
  const category = textValue(body, 'category')!
  const sku = textValue(body, 'sku')!.toUpperCase()
  if (id) {
    const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Sản phẩm không tồn tại hoặc đã bị xóa.' })
  }
  const [duplicate] = await db.select({ id: products.id }).from(products).where(id ? and(eq(products.sku, sku), ne(products.id, id)) : eq(products.sku, sku)).limit(1)
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Mã SKU đã được sử dụng. Vui lòng chọn mã khác.' })
  const values = {
    name,
    sku,
    imageUrl: imageSource(body, 'image'),
    categoryId: await categoryId(db, category),
    salePrice: String(numberValue(body, 'price')),
    shortDescription: textValue(body, 'description', false),
    status: statusValue(body, 'status', productStatuses, 'active'),
  }
  if (id) await db.update(products).set({ ...values, slug: `${slugify(name)}-${id}` }).where(and(eq(products.id, id), isNull(products.deletedAt)))
  else await db.insert(products).values({ ...values, slug: `${slugify(name)}-${Date.now().toString(36)}` })
}

async function removeProduct(id: number) {
  const db = useDatabase()
  const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Sản phẩm không tồn tại hoặc đã bị xóa.' })
  return db.update(products).set({ deletedAt: new Date() }).where(and(eq(products.id, id), isNull(products.deletedAt)))
}

export const productResource = {
  list: listProducts,
  save: saveProduct,
  remove: removeProduct,
} satisfies AdminResource
