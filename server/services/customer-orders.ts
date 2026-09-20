import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { salesOrderItems, salesOrders, salesOrderStatusHistory } from '../database/schema'
import { useDatabase } from '../database/client'
import { releaseExpiredSalesOrders } from './sales-orders'
import { orderLabels, paymentMethodLabel } from './store-orders'

const historyLabels: Record<string, string> = {
  draft: 'Đã tiếp nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipped: 'Đang giao',
  completed: 'Đã hoàn tất',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  expired: 'Đã hết thời gian giữ hàng',
}

function mapOrderSummary(order: typeof salesOrders.$inferSelect, items: Array<typeof salesOrderItems.$inferSelect>) {
  const orderItems = items.filter(item => item.orderId === order.id)
  return {
    id: order.id,
    reference: order.reference,
    createdAt: order.createdAt.toISOString(),
    itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
    itemSummary: orderItems.slice(0, 3).map(item => ({ productName: item.productName, quantity: item.quantity })),
    totalAmount: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    paymentMethodLabel: paymentMethodLabel(order.paymentMethod),
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    status: order.status,
    ...orderLabels(order),
  }
}

export async function listCustomerOrders(customerId: number) {
  await releaseExpiredSalesOrders()
  const db = useDatabase()
  const orders = await db.select().from(salesOrders).where(eq(salesOrders.customerId, customerId)).orderBy(desc(salesOrders.createdAt))
  if (!orders.length) return []
  const items = await db.select().from(salesOrderItems).where(inArray(salesOrderItems.orderId, orders.map(order => order.id))).orderBy(asc(salesOrderItems.id))
  return orders.map(order => mapOrderSummary(order, items))
}

export async function getCustomerOrder(customerId: number, reference: string) {
  await releaseExpiredSalesOrders()
  const db = useDatabase()
  const [order] = await db.select().from(salesOrders)
    .where(and(eq(salesOrders.customerId, customerId), eq(salesOrders.reference, reference)))
    .limit(1)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn hàng trong tài khoản của bạn.' })
  const [items, history] = await Promise.all([
    db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id)).orderBy(asc(salesOrderItems.id)),
    db.select().from(salesOrderStatusHistory).where(eq(salesOrderStatusHistory.orderId, order.id)).orderBy(asc(salesOrderStatusHistory.createdAt)),
  ])
  return {
    ...mapOrderSummary(order, items),
    customerName: order.customerName ?? '',
    customerPhone: order.customerPhone ?? '',
    customerEmail: order.customerEmail ?? '',
    customerNote: order.customerNote ?? '',
    shippingAddressLine: order.shippingAddressLine ?? '',
    shippingWard: order.shippingWard ?? '',
    shippingDistrict: order.shippingDistrict ?? '',
    shippingProvince: order.shippingProvince ?? '',
    shippingAddress: [order.shippingAddressLine, order.shippingWard, order.shippingDistrict, order.shippingProvince].filter(Boolean).join(', '),
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    shippingFee: Number(order.shippingFee),
    items: items.map(item => ({
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discountAmount: Number(item.discountAmount),
      totalAmount: Number(item.totalAmount),
    })),
    history: history.map(entry => ({
      id: entry.id,
      status: entry.status,
      statusLabel: historyLabels[entry.status] ?? entry.status,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  }
}
