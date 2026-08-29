import { and, asc, eq } from 'drizzle-orm'
import { auditLogs, inventoryLocations, salesOrderItems, salesOrders } from '../database/schema'
import { useDatabase } from '../database/client'
import { applyInventoryMovement } from './inventory'

export async function paySalesOrder(orderId: number, performedBy: number) {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(salesOrders).where(eq(salesOrders.id, orderId)).for('update')
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn bán hàng.' })
    if (order.status === 'paid') return { id: order.id, reference: order.reference, alreadyPaid: true }
    if (!['draft', 'confirmed'].includes(order.status)) throw createError({ statusCode: 409, statusMessage: 'Chỉ đơn nháp hoặc đã xác nhận mới có thể thanh toán.' })

    let locationId = order.inventoryLocationId
    if (!locationId) {
      const [location] = await tx.select({ id: inventoryLocations.id }).from(inventoryLocations)
        .where(and(eq(inventoryLocations.branchId, order.branchId), eq(inventoryLocations.isActive, true))).orderBy(asc(inventoryLocations.id)).limit(1)
      if (!location) throw createError({ statusCode: 409, statusMessage: 'Chi nhánh chưa có kho xuất hàng.' })
      locationId = location.id
    }

    const items = await tx.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id)).orderBy(asc(salesOrderItems.id))
    if (!items.length) throw createError({ statusCode: 409, statusMessage: 'Đơn hàng chưa có sản phẩm.' })
    for (const item of items) {
      if (!item.productId) throw createError({ statusCode: 409, statusMessage: `Sản phẩm ${item.sku} không còn liên kết với danh mục.` })
      await applyInventoryMovement(tx, {
        productId: item.productId,
        locationId,
        quantityDelta: -item.quantity,
        type: 'sale',
        performedBy,
        referenceType: 'sales_order_item',
        referenceId: item.id,
        note: `Xuất bán theo đơn ${order.reference}`,
      })
    }

    const paidAt = new Date()
    await tx.update(salesOrders).set({ status: 'paid', paidAt, inventoryLocationId: locationId }).where(eq(salesOrders.id, order.id))
    await tx.insert(auditLogs).values({ userId: performedBy, action: 'sales_order.pay', entityType: 'sales_order', entityId: String(order.id), oldValues: { status: order.status }, newValues: { status: 'paid', inventoryLocationId: locationId, paidAt: paidAt.toISOString() } })
    return { id: order.id, reference: order.reference, alreadyPaid: false }
  })
}
