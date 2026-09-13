import { getAdminResource } from '../../../services/admin-resources'
import { paginateRows } from '../../../utils/pagination'

export default defineEventHandler(async event => {
  const resource = getRouterParam(event, 'resource')
  const rows = await getAdminResource(resource).list()
  const category = getQuery(event).category
  return paginateRows(resource === 'posts' && typeof category === 'string' ? rows.filter(row => 'category' in row && row.category === category) : rows, event)
})
