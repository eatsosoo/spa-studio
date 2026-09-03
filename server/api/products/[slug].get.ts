import { getStoreProductBySlug } from '../../services/store-products'
import { releaseExpiredSalesOrders } from '../../services/sales-orders'

export default defineEventHandler(async (event) => {
  await releaseExpiredSalesOrders()
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const product = await getStoreProductBySlug(slug)
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm.' })
  return { data: product }
})
