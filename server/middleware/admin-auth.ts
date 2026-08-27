import { getAdminUser } from '../utils/admin-auth'

export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/api/admin/')) event.context.adminUser = await getAdminUser(event)
})
