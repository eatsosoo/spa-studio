import { getAdminResource, resourceId } from '../../../services/admin-resources'

export default defineEventHandler(async (event) => {
  await getAdminResource(getRouterParam(event, 'resource')).remove(resourceId(getRouterParam(event, 'id')))
  return { success: true }
})
