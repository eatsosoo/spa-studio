import { getStoreOrder } from '../../services/store-orders'

export default defineEventHandler(async (event) => {
  const reference = String(getRouterParam(event, 'reference') ?? '')
  const token = String(getQuery(event).token ?? '')
  if (!reference || !token) throw createError({ statusCode: 400, statusMessage: 'Thiếu thông tin tra cứu đơn hàng.' })
  return { data: await getStoreOrder(reference, token) }
})
