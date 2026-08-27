import { getAdminResource } from '../../../services/admin-resources'

export default defineEventHandler(async (event) => {
  const resource = getAdminResource(getRouterParam(event, 'resource'))
  await resource.save(null, await readBody(event))
  return { data: await resource.list() }
})
