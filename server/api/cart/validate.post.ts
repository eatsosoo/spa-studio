import { getStoreProducts } from '../../services/store-products'
import { releaseExpiredSalesOrders } from '../../services/sales-orders'

type Line = { productId?: number; quantity?: number }

export default defineEventHandler(async (event) => {
  await releaseExpiredSalesOrders()
  const body = await readBody<{ items?: Line[] }>(event)
  const merged = new Map<number, number>()
  for (const item of body.items ?? []) {
    const productId = Number(item.productId)
    const quantity = Math.floor(Number(item.quantity))
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) continue
    merged.set(productId, Math.min(99, (merged.get(productId) ?? 0) + quantity))
  }
  const currentProducts = await getStoreProducts([...merged.keys()])
  const productsById = new Map(currentProducts.map(product => [product.id, product]))
  const data = [...merged].map(([productId, requestedQuantity]) => {
    const product = productsById.get(productId)
    if (!product) return { productId, requestedQuantity, purchasableQuantity: 0, available: false, message: 'Sản phẩm không còn được bán.' }
    const purchasableQuantity = Math.min(requestedQuantity, product.stock)
    return {
      ...product,
      requestedQuantity,
      purchasableQuantity,
      available: product.stock >= requestedQuantity,
      message: product.stock <= 0 ? 'Sản phẩm đã hết hàng.' : product.stock < requestedQuantity ? `Chỉ còn ${product.stock} sản phẩm trong kho.` : null,
    }
  })
  return { data, valid: data.length > 0 && data.every(item => item.available) }
})
