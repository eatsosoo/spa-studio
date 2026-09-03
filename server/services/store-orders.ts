import { createHash, randomBytes } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { customers, products, salesOrderItems, salesOrders, salesOrderStatusHistory } from '../database/schema'
import { useDatabase } from '../database/client'
import { reserveInventoryFefo } from './inventory'
import { releaseExpiredSalesOrders } from './sales-orders'
import { storefrontContext } from './store-products'

type Payload = Record<string, unknown>
type RawLine = { productId?: unknown; quantity?: unknown }

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const reference = () => `DH-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`

function orderLabels(order: { status: string; paymentStatus: string; fulfillmentStatus: string }) {
  const statuses: Record<string, string> = { draft: 'Bản nháp', confirmed: 'Đã xác nhận', paid: 'Đã hoàn tất', cancelled: 'Đã hủy', refunded: 'Đã hoàn tiền' }
  const payments: Record<string, string> = { unpaid: 'Chưa thanh toán', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán lỗi', partially_refunded: 'Hoàn tiền một phần', refunded: 'Đã hoàn tiền' }
  const fulfillment: Record<string, string> = { unfulfilled: 'Chờ xử lý', packing: 'Đang đóng gói', shipped: 'Đang giao', delivered: 'Đã giao', returned: 'Đã hoàn hàng' }
  return { statusLabel: statuses[order.status] ?? order.status, paymentStatusLabel: payments[order.paymentStatus] ?? order.paymentStatus, fulfillmentStatusLabel: fulfillment[order.fulfillmentStatus] ?? order.fulfillmentStatus }
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 30) throw createError({ statusCode: 422, statusMessage: 'Giỏ hàng không hợp lệ.' })
  const merged = new Map<number, number>()
  for (const raw of value as RawLine[]) {
    const productId = Number(raw.productId)
    const quantity = Math.floor(Number(raw.quantity))
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) throw createError({ statusCode: 422, statusMessage: 'Số lượng sản phẩm không hợp lệ.' })
    merged.set(productId, (merged.get(productId) ?? 0) + quantity)
  }
  if ([...merged.values()].some(quantity => quantity > 99)) throw createError({ statusCode: 422, statusMessage: 'Mỗi sản phẩm chỉ được đặt tối đa 99.' })
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

export async function createStoreOrder(body: Payload) {
  await releaseExpiredSalesOrders()
  const name = clean(body.customerName, 150)
  const phone = clean(body.customerPhone, 30).replace(/\s/g, '')
  const email = clean(body.customerEmail, 190)
  const addressLine = clean(body.shippingAddressLine, 255)
  const ward = clean(body.shippingWard, 100)
  const district = clean(body.shippingDistrict, 100)
  const province = clean(body.shippingProvince, 100)
  const note = clean(body.customerNote, 500)
  const paymentMethod = String(body.paymentMethod ?? 'cod') as 'cod' | 'bank_transfer'
  const idempotencyKey = clean(body.idempotencyKey, 80)
  const accessToken = clean(body.accessToken, 100)
  const items = normalizeItems(body.items)
  if (name.length < 2 || !/^(\+84|0)\d{9}$/.test(phone) || !addressLine || !district || !province) throw createError({ statusCode: 422, statusMessage: 'Vui lòng điền đầy đủ và đúng thông tin nhận hàng.' })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 422, statusMessage: 'Email không hợp lệ.' })
  if (!['cod', 'bank_transfer'].includes(paymentMethod)) throw createError({ statusCode: 422, statusMessage: 'Phương thức thanh toán không hợp lệ.' })
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(idempotencyKey) || !/^[a-zA-Z0-9-]{20,100}$/.test(accessToken)) throw createError({ statusCode: 422, statusMessage: 'Mã xác nhận đơn không hợp lệ.' })

  const db = useDatabase()
  const existing = await db.select({ reference: salesOrders.reference, accessTokenHash: salesOrders.accessTokenHash, totalAmount: salesOrders.totalAmount }).from(salesOrders).where(eq(salesOrders.idempotencyKey, idempotencyKey)).limit(1)
  if (existing[0]) {
    if (existing[0].accessTokenHash !== hash(accessToken)) throw createError({ statusCode: 409, statusMessage: 'Mã gửi lại đơn hàng không hợp lệ.' })
    return { reference: existing[0].reference, accessToken, totalAmount: Number(existing[0].totalAmount), duplicated: true }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const { branchId, locationId } = await storefrontContext(tx)
    const productRows = await tx.select().from(products).where(and(inArray(products.id, items.map(item => item.productId)), inArray(products.status, ['active', 'out_of_stock']), isNull(products.deletedAt))).for('update')
    if (productRows.length !== items.length) throw createError({ statusCode: 409, statusMessage: 'Một hoặc nhiều sản phẩm không còn được bán. Vui lòng cập nhật giỏ hàng.' })
    const productsById = new Map(productRows.map(product => [product.id, product]))
    const subtotal = items.reduce((sum, item) => sum + Number(productsById.get(item.productId)!.salePrice) * item.quantity, 0)
    const shippingFee = subtotal >= 1_200_000 ? 0 : 40_000
    const fullAddress = [addressLine, ward, district, province].filter(Boolean).join(', ')

    await tx.insert(customers).values({ code: `KH-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`.toUpperCase(), fullName: name, phone, email: email || null, address: fullAddress, source: 'website' }).onDuplicateKeyUpdate({ set: { fullName: name, email: email || null, address: fullAddress } })
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.phone, phone)).limit(1)
    const orderReference = reference()
    const now = new Date()
    const reservationExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const [created] = await tx.insert(salesOrders).values({
      reference: orderReference,
      branchId,
      inventoryLocationId: locationId,
      customerId: customer?.id,
      source: 'website',
      accessTokenHash: hash(accessToken),
      idempotencyKey,
      customerName: name,
      customerPhone: phone,
      customerEmail: email || null,
      customerNote: note || null,
      shippingAddressLine: addressLine,
      shippingWard: ward || null,
      shippingDistrict: district,
      shippingProvince: province,
      shippingFee: shippingFee.toFixed(2),
      paymentMethod,
      paymentStatus: paymentMethod === 'bank_transfer' ? 'pending' : 'unpaid',
      fulfillmentStatus: 'unfulfilled',
      status: 'confirmed',
      subtotal: subtotal.toFixed(2),
      totalAmount: (subtotal + shippingFee).toFixed(2),
      confirmedAt: now,
      reservationExpiresAt,
    }).$returningId()
    if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo đơn hàng.' })

    for (const item of items) {
      const product = productsById.get(item.productId)!
      const unitPrice = Number(product.salePrice)
      const [createdItem] = await tx.insert(salesOrderItems).values({ orderId: created.id, productId: product.id, sku: product.sku, productName: product.name, quantity: item.quantity, unitPrice: unitPrice.toFixed(2), totalAmount: (unitPrice * item.quantity).toFixed(2) }).$returningId()
      if (!createdItem) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo dòng sản phẩm.' })
      try {
        await reserveInventoryFefo(tx, { orderItemId: createdItem.id, productId: product.id, locationId, quantity: item.quantity })
      } catch (failure) {
        if ((failure as { statusCode?: number }).statusCode !== 409) throw failure
        throw createError({ statusCode: 409, statusMessage: `${product.name} không còn đủ số lượng yêu cầu. Vui lòng cập nhật giỏ hàng.` })
      }
    }
    await tx.insert(salesOrderStatusHistory).values({ orderId: created.id, status: 'confirmed', note: 'Khách đặt hàng trên website; tồn kho được giữ trong 24 giờ.' })
        return { reference: orderReference, accessToken, totalAmount: subtotal + shippingFee, duplicated: false }
      })
    } catch (failure) {
      const databaseError = failure as { code?: string; cause?: { code?: string } }
      const code = databaseError.code ?? databaseError.cause?.code
      if (code === 'ER_LOCK_DEADLOCK' && attempt < 2) continue
      if (code === 'ER_DUP_ENTRY') {
        const [duplicate] = await db.select({ reference: salesOrders.reference, accessTokenHash: salesOrders.accessTokenHash, totalAmount: salesOrders.totalAmount }).from(salesOrders).where(eq(salesOrders.idempotencyKey, idempotencyKey)).limit(1)
        if (duplicate?.accessTokenHash === hash(accessToken)) return { reference: duplicate.reference, accessToken, totalAmount: Number(duplicate.totalAmount), duplicated: true }
      }
      throw failure
    }
  }
  throw createError({ statusCode: 409, statusMessage: 'Kho đang được cập nhật. Vui lòng thử đặt hàng lại.' })
}

export async function getStoreOrder(referenceValue: string, accessToken: string) {
  await releaseExpiredSalesOrders()
  const db = useDatabase()
  const [order] = await db.select().from(salesOrders).where(and(eq(salesOrders.reference, referenceValue), eq(salesOrders.accessTokenHash, hash(accessToken)))).limit(1)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn hàng.' })
  const items = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id)).orderBy(asc(salesOrderItems.id))
  return {
    reference: order.reference,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    ...orderLabels(order),
    customerName: order.customerName ?? '',
    customerPhone: order.customerPhone ?? '',
    shippingAddress: [order.shippingAddressLine, order.shippingWard, order.shippingDistrict, order.shippingProvince].filter(Boolean).join(', '),
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    items: items.map(item => ({ ...item, unitPrice: Number(item.unitPrice), totalAmount: Number(item.totalAmount) })),
  }
}

export async function listAdminOrders() {
  await releaseExpiredSalesOrders()
  const db = useDatabase()
  const rows = await db.select({ id: salesOrders.id, reference: salesOrders.reference, customer: salesOrders.customerName, phone: salesOrders.customerPhone, status: salesOrders.status, paymentStatus: salesOrders.paymentStatus, fulfillmentStatus: salesOrders.fulfillmentStatus, totalAmount: salesOrders.totalAmount, createdAt: salesOrders.createdAt, itemCount: sql<number>`(select coalesce(sum(soi.quantity), 0) from ${salesOrderItems} soi where soi.order_id = ${salesOrders.id})`.mapWith(Number) }).from(salesOrders).orderBy(desc(salesOrders.createdAt))
  return rows.map(row => ({ ...row, ...orderLabels(row), customer: row.customer ?? 'Khách vãng lai', phone: row.phone ?? '', totalAmount: Number(row.totalAmount), createdAt: row.createdAt.toISOString() }))
}

export async function getAdminOrder(orderId: number) {
  const db = useDatabase()
  const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, orderId)).limit(1)
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn hàng.' })
  const [items, history] = await Promise.all([
    db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, order.id)).orderBy(asc(salesOrderItems.id)),
    db.select().from(salesOrderStatusHistory).where(eq(salesOrderStatusHistory.orderId, order.id)).orderBy(desc(salesOrderStatusHistory.createdAt)),
  ])
  return { ...order, ...orderLabels(order), subtotal: Number(order.subtotal), shippingFee: Number(order.shippingFee), totalAmount: Number(order.totalAmount), totalCost: Number(order.totalCost), items: items.map(item => ({ ...item, unitPrice: Number(item.unitPrice), totalAmount: Number(item.totalAmount) })), history }
}
