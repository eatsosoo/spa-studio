import { paySalesOrder } from '../../../../services/sales-orders'

export default defineEventHandler(async (event) => {
  const userId = event.context.adminUser?.id
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập không hợp lệ.' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'ID đơn hàng không hợp lệ.' })
  return { data: await paySalesOrder(id, userId) }
})
