import { getAdminOrder } from '../../../services/store-orders'

export default defineEventHandler(async (event) => {
  if (!event.context.adminUser?.id) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập không hợp lệ.' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'ID đơn hàng không hợp lệ.' })
  return { data: await getAdminOrder(id) }
})
