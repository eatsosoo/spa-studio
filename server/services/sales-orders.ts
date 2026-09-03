import { and, asc, eq, lt } from 'drizzle-orm'
import { auditLogs, inventoryLocations, inventoryReservations, salesOrderItems, salesOrders, salesOrderStatusHistory } from '../database/schema'
import { useDatabase } from '../database/client'
import { consumeInventoryFefo, consumeOrderReservations, releaseOrderReservations, reserveInventoryFefo } from './inventory'

type Transaction = Parameters<Parameters<ReturnType<typeof useDatabase>['transaction']>[0]>[0]

async function orderLocation(tx: Transaction, branchId: number, configured: number | null) {
  if (configured) return configured
  const [location] = await tx.select({ id: inventoryLocations.id }).from(inventoryLocations).where(and(eq(inventoryLocations.branchId, branchId), eq(inventoryLocations.isActive, true))).orderBy(asc(inventoryLocations.id)).limit(1)
  if (!location) throw createError({ statusCode: 409, statusMessage: 'Chi nhánh chưa có kho xuất hàng.' })
  return location.id
}

async function addHistory(tx: Transaction, orderId: number, status: string, changedBy: number | null, note?: string) {
  await tx.insert(salesOrderStatusHistory).values({ orderId, status, changedBy, note: note?.trim().slice(0, 500) || null })
}

export async function confirmSalesOrder(orderId: number, performedBy: number) {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(salesOrders).where(eq(salesOrders.id, orderId)).for('update')
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn bán hàng.' })
    if (order.status === 'confirmed') return { id: order.id, reference: order.reference, alreadyConfirmed: true }
    if (order.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'Chỉ đơn nháp mới có thể xác nhận.' })
    const locationId = await orderLocation(tx, order.branchId, order.inventoryLocationId)
    const items = await tx.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id)).orderBy(asc(salesOrderItems.id))
    if (!items.length) throw createError({ statusCode: 409, statusMessage: 'Đơn hàng chưa có sản phẩm.' })
    for (const item of items) {
      if (!item.productId) throw createError({ statusCode: 409, statusMessage: `Sản phẩm ${item.sku} không còn liên kết.` })
      await reserveInventoryFefo(tx, { orderItemId: item.id, productId: item.productId, locationId, quantity: item.quantity })
    }
    const confirmedAt = new Date()
    await tx.update(salesOrders).set({ status: 'confirmed', confirmedAt, inventoryLocationId: locationId }).where(eq(salesOrders.id, order.id))
    await addHistory(tx, order.id, 'confirmed', performedBy, 'Đơn được xác nhận và giữ tồn kho.')
    await tx.insert(auditLogs).values({ userId: performedBy, action: 'sales_order.confirm', entityType: 'sales_order', entityId: String(order.id), oldValues: { status: order.status }, newValues: { status: 'confirmed', inventoryLocationId: locationId } })
    return { id: order.id, reference: order.reference, alreadyConfirmed: false }
  })
}

export async function paySalesOrder(orderId: number, performedBy: number) {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(salesOrders).where(eq(salesOrders.id, orderId)).for('update')
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn bán hàng.' })
    if (order.status === 'paid') return { id: order.id, reference: order.reference, alreadyPaid: true }
    if (!['draft', 'confirmed'].includes(order.status)) throw createError({ statusCode: 409, statusMessage: 'Chỉ đơn nháp hoặc đã xác nhận mới có thể hoàn tất.' })
    const locationId = await orderLocation(tx, order.branchId, order.inventoryLocationId)
    const items = await tx.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id)).orderBy(asc(salesOrderItems.id))
    if (!items.length) throw createError({ statusCode: 409, statusMessage: 'Đơn hàng chưa có sản phẩm.' })
    let totalCost = 0
    for (const item of items) {
      if (!item.productId) throw createError({ statusCode: 409, statusMessage: `Sản phẩm ${item.sku} không còn liên kết.` })
      const reserved = await tx.select({ id: inventoryReservations.id }).from(inventoryReservations).where(and(eq(inventoryReservations.orderItemId, item.id), eq(inventoryReservations.status, 'active'))).limit(1)
      const cost = reserved.length
        ? await consumeOrderReservations(tx, { orderItemId: item.id, performedBy, reference: order.reference })
        : (await consumeInventoryFefo(tx, { productId: item.productId, locationId, quantity: item.quantity, type: 'sale', performedBy, referenceType: 'sales_order_item', referenceId: item.id, note: `Xuất bán theo đơn ${order.reference}` })).reduce((sum, allocation) => sum + allocation.quantity * allocation.unitCost, 0)
      totalCost += cost
      await tx.update(salesOrderItems).set({ unitCost: (cost / item.quantity).toFixed(2), costAmount: cost.toFixed(2) }).where(eq(salesOrderItems.id, item.id))
    }
    const paidAt = new Date()
    await tx.update(salesOrders).set({ status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'delivered', paidAt, completedAt: paidAt, reservationExpiresAt: null, inventoryLocationId: locationId, totalCost: totalCost.toFixed(2) }).where(eq(salesOrders.id, order.id))
    await addHistory(tx, order.id, 'completed', performedBy, 'Đơn đã hoàn tất; tồn giữ được chuyển thành xuất bán.')
    await tx.insert(auditLogs).values({ userId: performedBy, action: 'sales_order.pay', entityType: 'sales_order', entityId: String(order.id), oldValues: { status: order.status }, newValues: { status: 'paid', totalCost, paidAt: paidAt.toISOString() } })
    return { id: order.id, reference: order.reference, alreadyPaid: false, totalCost }
  })
}

export async function updateSalesOrderFulfillment(orderId: number, fulfillmentStatus: 'packing' | 'shipped', performedBy: number) {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(salesOrders).where(eq(salesOrders.id, orderId)).for('update')
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn bán hàng.' })
    if (order.status !== 'confirmed') throw createError({ statusCode: 409, statusMessage: 'Chỉ đơn đã xác nhận mới có thể xử lý giao hàng.' })
    const allowed = order.fulfillmentStatus === 'unfulfilled' ? ['packing'] : order.fulfillmentStatus === 'packing' ? ['shipped'] : []
    if (!allowed.includes(fulfillmentStatus)) throw createError({ statusCode: 409, statusMessage: 'Thứ tự xử lý giao hàng không hợp lệ.' })
    await tx.update(salesOrders).set({ fulfillmentStatus, reservationExpiresAt: null }).where(eq(salesOrders.id, order.id))
    await addHistory(tx, order.id, fulfillmentStatus, performedBy, fulfillmentStatus === 'packing' ? 'Đơn đang được đóng gói.' : 'Đơn đã được bàn giao vận chuyển.')
    return { id: order.id, reference: order.reference, fulfillmentStatus }
  })
}

export async function cancelSalesOrder(orderId: number, performedBy: number, reason = '') {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(salesOrders).where(eq(salesOrders.id, orderId)).for('update')
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn bán hàng.' })
    if (order.status === 'cancelled') return { id: order.id, reference: order.reference, alreadyCancelled: true }
    if (!['draft', 'confirmed'].includes(order.status)) throw createError({ statusCode: 409, statusMessage: 'Đơn đã hoàn tất không thể hủy trực tiếp.' })
    if (order.fulfillmentStatus === 'shipped') throw createError({ statusCode: 409, statusMessage: 'Đơn đã giao cho đơn vị vận chuyển; cần xử lý hoàn hàng thay vì hủy.' })
    const items = await tx.select({ id: salesOrderItems.id }).from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id))
    await releaseOrderReservations(tx, items.map(item => item.id))
    const cancelledAt = new Date()
    const cancellationReason = reason.trim().slice(0, 500) || 'Đơn hàng được hủy bởi nhân viên.'
    await tx.update(salesOrders).set({ status: 'cancelled', cancelledAt, cancellationReason, reservationExpiresAt: null }).where(eq(salesOrders.id, order.id))
    await addHistory(tx, order.id, 'cancelled', performedBy, cancellationReason)
    await tx.insert(auditLogs).values({ userId: performedBy, action: 'sales_order.cancel', entityType: 'sales_order', entityId: String(order.id), oldValues: { status: order.status }, newValues: { status: 'cancelled', cancellationReason } })
    return { id: order.id, reference: order.reference, alreadyCancelled: false }
  })
}

export async function releaseExpiredSalesOrders() {
  const db = useDatabase()
  const expired = await db.select({ id: salesOrders.id }).from(salesOrders).where(and(eq(salesOrders.status, 'confirmed'), eq(salesOrders.fulfillmentStatus, 'unfulfilled'), lt(salesOrders.reservationExpiresAt, new Date()))).limit(50)
  for (const candidate of expired) {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(salesOrders).where(eq(salesOrders.id, candidate.id)).for('update')
      if (!order || order.status !== 'confirmed' || order.fulfillmentStatus !== 'unfulfilled' || !order.reservationExpiresAt || order.reservationExpiresAt >= new Date()) return
      const items = await tx.select({ id: salesOrderItems.id }).from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id))
      await releaseOrderReservations(tx, items.map(item => item.id))
      const cancelledAt = new Date()
      await tx.update(salesOrders).set({ status: 'cancelled', cancelledAt, cancellationReason: 'Đơn quá thời hạn giữ hàng.', reservationExpiresAt: null }).where(eq(salesOrders.id, order.id))
      await addHistory(tx, order.id, 'cancelled', null, 'Hệ thống tự động trả tồn do quá thời hạn giữ hàng.')
    })
  }
}
