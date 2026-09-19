import { getStoreOrder } from '../../services/store-orders'

export default defineEventHandler(async (event) => {
  const reference = String(getRouterParam(event, 'reference') ?? '')
  const authorization = getRequestHeader(event, 'authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!reference || !token) throw createError({ statusCode: 400, statusMessage: 'Thiếu thông tin tra cứu đơn hàng.' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { data: await getStoreOrder(reference, token) }
})
