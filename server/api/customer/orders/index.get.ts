import { listCustomerOrders } from '../../../services/customer-orders'
import { getCustomerSession } from '../../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  const customer = await getCustomerSession(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { data: await listCustomerOrders(customer!.id) }
})
