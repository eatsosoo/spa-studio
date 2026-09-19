import { createStoreOrder } from '../../services/store-orders'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'orders', 5, 60 * 60_000)
  const body = await readBody<Record<string, unknown>>(event)
  const result = await createStoreOrder(body)
  setResponseStatus(event, 201)
  return { data: result }
})
