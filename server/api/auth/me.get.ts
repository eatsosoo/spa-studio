import { getAdminUser } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => ({ data: await getAdminUser(event) }))
