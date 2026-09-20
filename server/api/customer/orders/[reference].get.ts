import { getCustomerOrder } from '../../../services/customer-orders'
import { getCustomerSession } from '../../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  const customer = await getCustomerSession(event)
  const reference = String(getRouterParam(event, 'reference') ?? '').trim()
  if (!/^[A-Z0-9-]{3,30}$/i.test(reference)) throw createError({ statusCode: 400, statusMessage: 'Mã đơn hàng không hợp lệ.' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { data: await getCustomerOrder(customer!.id, reference) }
})
