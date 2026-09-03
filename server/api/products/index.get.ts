import { getStoreProducts } from '../../services/store-products'
import { releaseExpiredSalesOrders } from '../../services/sales-orders'

export default defineEventHandler(async (event) => {
  await releaseExpiredSalesOrders()
  const rawIds = String(getQuery(event).ids ?? '')
  const ids = rawIds ? [...new Set(rawIds.split(',').map(Number).filter(value => Number.isInteger(value) && value > 0))].slice(0, 100) : undefined
  return { data: await getStoreProducts(ids) }
})
