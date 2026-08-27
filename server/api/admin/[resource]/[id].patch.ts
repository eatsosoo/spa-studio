import { getAdminResource, resourceId } from '../../../services/admin-resources'

export default defineEventHandler(async (event) => {
  const resource = getAdminResource(getRouterParam(event, 'resource'))
  await resource.save(resourceId(getRouterParam(event, 'id')), await readBody(event))
  return { data: await resource.list() }
})
