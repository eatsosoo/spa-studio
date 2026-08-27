import { getAdminResource, resourceId } from '../../../services/admin-resources'

export default defineEventHandler(async (event) => {
  const rows = await getAdminResource(getRouterParam(event, 'resource')).list()
  const row = rows.find(item => item.id === resourceId(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy dữ liệu.' })
  return { data: row }
})
