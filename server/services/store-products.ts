import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { branches, inventoryLocations, inventoryStocks, productCategories, products } from '../database/schema'
import { useDatabase } from '../database/client'

type Executor = Pick<ReturnType<typeof useDatabase>, 'select'>

export async function storefrontContext(executor: Executor = useDatabase()) {
  const [branch] = await executor.select({ id: branches.id }).from(branches).where(and(eq(branches.code, 'MAIN'), eq(branches.isActive, true))).limit(1)
  if (!branch) throw createError({ statusCode: 503, statusMessage: 'Cửa hàng chưa được cấu hình chi nhánh bán hàng.' })
  const [location] = await executor.select({ id: inventoryLocations.id }).from(inventoryLocations).where(and(eq(inventoryLocations.branchId, branch.id), eq(inventoryLocations.isActive, true))).orderBy(asc(inventoryLocations.id)).limit(1)
  if (!location) throw createError({ statusCode: 503, statusMessage: 'Cửa hàng chưa được cấu hình kho bán hàng.' })
  return { branchId: branch.id, locationId: location.id }
}

function normalizeBenefits(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export async function getStoreProducts(ids?: number[]) {
  const db = useDatabase()
  const { locationId } = await storefrontContext(db)
  const conditions = [isNull(products.deletedAt), inArray(products.status, ['active', 'out_of_stock'])]
  if (ids?.length) conditions.push(inArray(products.id, ids))
  const rows = await db.select({
    id: products.id,
    slug: products.slug,
    name: products.name,
    category: productCategories.name,
    shortDescription: products.shortDescription,
    description: products.description,
    price: products.salePrice,
    size: products.size,
    sku: products.sku,
    productStatus: products.status,
    image: products.imageUrl,
    imagePosition: products.imagePosition,
    benefits: products.benefits,
    ingredients: products.ingredients,
    usage: products.usage,
    stockQuantity: inventoryStocks.quantity,
    reservedQuantity: inventoryStocks.reservedQuantity,
    minQuantity: inventoryStocks.minQuantity,
  }).from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(inventoryStocks, and(eq(inventoryStocks.productId, products.id), eq(inventoryStocks.locationId, locationId)))
    .where(and(...conditions))
    .orderBy(asc(products.name))

  return rows.map((row) => {
    const stock = Math.max(0, Number(row.stockQuantity ?? 0) - Number(row.reservedQuantity ?? 0))
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category ?? 'Chưa phân nhóm',
      shortDescription: row.shortDescription ?? '',
      description: row.description ?? row.shortDescription ?? '',
      price: Number(row.price),
      size: row.size ?? 'Sản phẩm',
      stock,
      sku: row.sku,
      status: stock <= 0 ? 'Tạm hết hàng' as const : stock <= Number(row.minQuantity ?? 0) ? 'Sắp hết' as const : 'Đang bán' as const,
      image: row.image ?? '/images/mien-product-collection.png',
      imagePosition: row.imagePosition ?? 'center',
      benefits: normalizeBenefits(row.benefits),
      ingredients: row.ingredients ?? 'Thông tin thành phần đang được cập nhật.',
      usage: row.usage ?? 'Vui lòng xem hướng dẫn trên bao bì sản phẩm.',
    }
  })
}

export async function getStoreProductBySlug(slug: string) {
  const rows = await getStoreProducts()
  return rows.find(product => product.slug === slug)
}
