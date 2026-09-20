import { revokeCustomerSession } from '../../utils/customer-auth'

export default defineEventHandler(async (event) => {
  await revokeCustomerSession(event)
  return { ok: true }
})
