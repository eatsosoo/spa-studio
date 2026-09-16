import { getAdminUser } from '../utils/admin-auth'
import { requiredAdminPermission, requireAdminPermission } from '../utils/admin-permissions'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin/')) return
  const user = await getAdminUser(event)
  const permission = requiredAdminPermission(path, event.method)
  if (!permission) throw createError({ statusCode: 403, statusMessage: 'API quản trị chưa được khai báo quyền.' })
  requireAdminPermission(user!, permission)
  event.context.adminUser = user
})
