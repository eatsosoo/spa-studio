import { getAdminResource } from '../../../services/admin-resources'

export default defineEventHandler(async (event) => ({ data: await getAdminResource(getRouterParam(event, 'resource')).list() }))
