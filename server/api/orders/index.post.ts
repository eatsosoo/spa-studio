import { createStoreOrder } from '../../services/store-orders'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const result = await createStoreOrder(body)
  setResponseStatus(event, 201)
  return { data: result }
})
