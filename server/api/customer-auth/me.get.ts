import { getCustomerSession } from '../../utils/customer-auth'

export default defineEventHandler(async event => ({ data: await getCustomerSession(event, false) }))
