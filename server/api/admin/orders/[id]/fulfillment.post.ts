import { updateSalesOrderFulfillment } from '../../../../services/sales-orders'

export default defineEventHandler(async (event) => {
  const userId = event.context.adminUser?.id
  const orderId = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ status?: 'packing' | 'shipped' }>(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập không hợp lệ.' })
  if (!Number.isInteger(orderId) || orderId <= 0) throw createError({ statusCode: 400, statusMessage: 'ID đơn hàng không hợp lệ.' })
  if (!body.status || !['packing', 'shipped'].includes(body.status)) throw createError({ statusCode: 422, statusMessage: 'Trạng thái giao hàng không hợp lệ.' })
  return { data: await updateSalesOrderFulfillment(orderId, body.status, userId) }
})
