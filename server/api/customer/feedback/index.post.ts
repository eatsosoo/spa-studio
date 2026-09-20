import { createCustomerFeedback } from '../../../services/feedback'
import { getCustomerSession } from '../../../utils/customer-auth'
import { checkPublicRateLimit } from '../../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'customer-feedback', 10, 60 * 60_000)
  const customer = await getCustomerSession(event)
  const body = await readBody<Record<string, unknown>>(event)
  const result = await createCustomerFeedback(customer!.id, body)
  setResponseStatus(event, 201)
  return { ok: true, data: result }
})
