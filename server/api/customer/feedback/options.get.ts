import { getCustomerFeedbackOptions } from '../../../services/feedback'
import { getCustomerSession } from '../../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  const customer = await getCustomerSession(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { data: await getCustomerFeedbackOptions(customer!.id) }
})
