import { revokeAdminSession } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  await revokeAdminSession(event)
  return { success: true }
})
