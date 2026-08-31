import { getAdminResource } from '../../../services/admin-resources'
import { paginateRows } from '../../../utils/pagination'

export default defineEventHandler(async (event) => paginateRows(await getAdminResource(getRouterParam(event, 'resource')).list(), event))
