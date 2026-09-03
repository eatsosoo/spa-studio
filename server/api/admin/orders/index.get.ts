import { listAdminOrders } from '../../../services/store-orders'
import { paginateRows } from '../../../utils/pagination'

export default defineEventHandler(async (event) => {
  if (!event.context.adminUser?.id) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập không hợp lệ.' })
  return paginateRows(await listAdminOrders(), event, 20)
})
