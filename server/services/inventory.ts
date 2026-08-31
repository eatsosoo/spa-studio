import { randomBytes } from 'node:crypto'
import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { appointmentServices, auditLogs, inventoryDocumentItems, inventoryDocuments, inventoryLocations, inventoryLots, inventoryReservations, inventoryStocks, inventoryTransactions, products, salesOrderItems, salesOrders, serviceProductUsages, services } from '../database/schema'
import { useDatabase } from '../database/client'

type DocumentType = 'receipt' | 'adjustment' | 'transfer' | 'return'
type TransactionType = 'opening' | 'purchase' | 'sale' | 'service_usage' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return'
type Executor = Pick<ReturnType<typeof useDatabase>, 'select' | 'insert' | 'update' | 'delete'>
type Payload = Record<string, unknown>
export type InventoryMovement = { productId: number; locationId: number; quantityDelta: number; type: TransactionType; lotId?: number | null; performedBy?: number | null; documentItemId?: number | null; referenceType?: string | null; referenceId?: number | null; unitCost?: number | null; note?: string | null }

const qty = (value: unknown, label = 'Số lượng', signed = false) => { const result = Math.round(Number(value) * 1000) / 1000; if (!Number.isFinite(result) || (!signed && result <= 0)) throw createError({ statusCode: 422, statusMessage: `${label} không hợp lệ.` }); return result }
const qv = (value: number) => value.toFixed(3)
const mv = (value: number) => value.toFixed(2)
const optional = (value: unknown, length: number) => String(value ?? '').trim().slice(0, length) || null
const id = (value: unknown, label: string) => { const result = Number(value); if (!Number.isInteger(result) || result <= 0) throw createError({ statusCode: 422, statusMessage: `${label} không hợp lệ.` }); return result }
const reference = (type: DocumentType) => `${{ receipt: 'NK', adjustment: 'DC', transfer: 'CK', return: 'TH' }[type]}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`

export async function applyInventoryMovement(executor: Executor, movement: InventoryMovement) {
  const productId = id(movement.productId, 'Sản phẩm'); const locationId = id(movement.locationId, 'Kho'); const delta = qty(movement.quantityDelta, 'Biến động tồn kho', true)
  if (!delta) throw createError({ statusCode: 422, statusMessage: 'Biến động tồn kho phải khác 0.' })
  await executor.insert(inventoryStocks).values({ productId, locationId }).onDuplicateKeyUpdate({ set: { quantity: sql`${inventoryStocks.quantity}` } })
  const [stock] = await executor.select().from(inventoryStocks).where(and(eq(inventoryStocks.productId, productId), eq(inventoryStocks.locationId, locationId))).for('update')
  if (!stock) throw createError({ statusCode: 500, statusMessage: 'Không thể khởi tạo số dư kho.' })
  const after = Math.round((Number(stock.quantity) + delta) * 1000) / 1000
  if (after < Number(stock.reservedQuantity)) throw createError({ statusCode: 409, statusMessage: `Tồn khả dụng không đủ. Hiện có ${(Number(stock.quantity) - Number(stock.reservedQuantity)).toLocaleString('vi-VN')} đơn vị.` })
  await executor.update(inventoryStocks).set({ quantity: qv(after) }).where(and(eq(inventoryStocks.productId, productId), eq(inventoryStocks.locationId, locationId)))
  await executor.insert(inventoryTransactions).values({ productId, locationId, lotId: movement.lotId ?? null, documentItemId: movement.documentItemId ?? null, type: movement.type, quantityDelta: qv(delta), quantityAfter: qv(after), unitCost: movement.unitCost == null ? null : mv(movement.unitCost), referenceType: movement.referenceType ?? null, referenceId: movement.referenceId ?? null, note: movement.note ?? null, performedBy: movement.performedBy ?? null })
  return after
}

async function addLot(executor: Executor, input: { productId: number; locationId: number; quantity: number; receivedAt: Date; batchNumber?: string | null; expiryDate?: string | null; unitCost?: number | null; documentItemId?: number | null; movement: Omit<InventoryMovement, 'productId' | 'locationId' | 'quantityDelta' | 'lotId' | 'unitCost'> }) {
  const [created] = await executor.insert(inventoryLots).values({ productId: input.productId, locationId: input.locationId, documentItemId: input.documentItemId ?? null, batchNumber: input.batchNumber || `LOT-${input.documentItemId ?? Date.now()}`, receivedAt: input.receivedAt, expiryDate: input.expiryDate ?? null, initialQuantity: qv(input.quantity), quantity: qv(input.quantity), unitCost: mv(input.unitCost ?? 0) }).$returningId()
  if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo lô hàng.' })
  await applyInventoryMovement(executor, { ...input.movement, productId: input.productId, locationId: input.locationId, lotId: created.id, quantityDelta: input.quantity, unitCost: input.unitCost })
  return created.id
}

export async function consumeInventoryFefo(executor: Executor, input: Omit<InventoryMovement, 'quantityDelta' | 'lotId' | 'unitCost'> & { quantity: number }) {
  let remaining = qty(input.quantity)
  const lots = await executor.select().from(inventoryLots).where(and(eq(inventoryLots.productId, input.productId), eq(inventoryLots.locationId, input.locationId), eq(inventoryLots.status, 'available'), gt(inventoryLots.quantity, inventoryLots.reservedQuantity))).orderBy(sql`${inventoryLots.expiryDate} is null`, asc(inventoryLots.expiryDate), asc(inventoryLots.receivedAt), asc(inventoryLots.id)).for('update')
  const available = lots.reduce((sum, lot) => sum + Number(lot.quantity) - Number(lot.reservedQuantity), 0)
  if (available + 0.0001 < remaining) throw createError({ statusCode: 409, statusMessage: `Không đủ tồn khả dụng theo lô. Hiện có ${available.toLocaleString('vi-VN')} đơn vị.` })
  const allocations: Array<{ quantity: number; unitCost: number; batchNumber: string; expiryDate: string | null }> = []
  for (const lot of lots) {
    if (remaining <= 0) break
    const quantity = Math.min(remaining, Number(lot.quantity) - Number(lot.reservedQuantity)); if (quantity <= 0) continue
    const after = Math.round((Number(lot.quantity) - quantity) * 1000) / 1000
    await executor.update(inventoryLots).set({ quantity: qv(after), status: after <= 0 ? 'depleted' : 'available' }).where(eq(inventoryLots.id, lot.id))
    await applyInventoryMovement(executor, { ...input, lotId: lot.id, quantityDelta: -quantity, unitCost: Number(lot.unitCost) })
    allocations.push({ quantity, unitCost: Number(lot.unitCost), batchNumber: lot.batchNumber, expiryDate: lot.expiryDate }); remaining = Math.round((remaining - quantity) * 1000) / 1000
  }
  return allocations
}

export async function reserveInventoryFefo(executor: Executor, input: { orderItemId: number; productId: number; locationId: number; quantity: number }) {
  const existing = await executor.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderItemId, input.orderItemId), eq(inventoryReservations.status, 'active')))
  if (existing.length) return existing
  let remaining = qty(input.quantity)
  await executor.insert(inventoryStocks).values({ productId: input.productId, locationId: input.locationId }).onDuplicateKeyUpdate({ set: { quantity: sql`${inventoryStocks.quantity}` } })
  const [stock] = await executor.select().from(inventoryStocks).where(and(eq(inventoryStocks.productId, input.productId), eq(inventoryStocks.locationId, input.locationId))).for('update')
  const lots = await executor.select().from(inventoryLots).where(and(eq(inventoryLots.productId, input.productId), eq(inventoryLots.locationId, input.locationId), eq(inventoryLots.status, 'available'), gt(inventoryLots.quantity, inventoryLots.reservedQuantity))).orderBy(sql`${inventoryLots.expiryDate} is null`, asc(inventoryLots.expiryDate), asc(inventoryLots.receivedAt), asc(inventoryLots.id)).for('update')
  const available = lots.reduce((sum, lot) => sum + Number(lot.quantity) - Number(lot.reservedQuantity), 0)
  if (!stock || available + 0.0001 < remaining) throw createError({ statusCode: 409, statusMessage: `Không đủ hàng để giữ. Khả dụng ${available.toLocaleString('vi-VN')} đơn vị.` })
  const rows: Array<{ orderItemId: number; productId: number; locationId: number; lotId: number; quantity: string }> = []
  for (const lot of lots) { if (remaining <= 0) break; const quantity = Math.min(remaining, Number(lot.quantity) - Number(lot.reservedQuantity)); if (quantity <= 0) continue; await executor.update(inventoryLots).set({ reservedQuantity: qv(Number(lot.reservedQuantity) + quantity) }).where(eq(inventoryLots.id, lot.id)); rows.push({ orderItemId: input.orderItemId, productId: input.productId, locationId: input.locationId, lotId: lot.id, quantity: qv(quantity) }); remaining = Math.round((remaining - quantity) * 1000) / 1000 }
  await executor.insert(inventoryReservations).values(rows)
  await executor.update(inventoryStocks).set({ reservedQuantity: qv(Number(stock.reservedQuantity) + input.quantity) }).where(and(eq(inventoryStocks.productId, input.productId), eq(inventoryStocks.locationId, input.locationId)))
  return rows
}

export async function releaseOrderReservations(executor: Executor, orderItemIds: number[]) {
  if (!orderItemIds.length) return
  const rows = await executor.select().from(inventoryReservations).where(and(inArray(inventoryReservations.orderItemId, orderItemIds), eq(inventoryReservations.status, 'active'))).for('update')
  for (const row of rows) {
    const [lot] = await executor.select().from(inventoryLots).where(eq(inventoryLots.id, row.lotId)).for('update')
    if (lot) await executor.update(inventoryLots).set({ reservedQuantity: qv(Math.max(0, Number(lot.reservedQuantity) - Number(row.quantity))) }).where(eq(inventoryLots.id, lot.id))
    const [stock] = await executor.select().from(inventoryStocks).where(and(eq(inventoryStocks.productId, row.productId), eq(inventoryStocks.locationId, row.locationId))).for('update')
    if (stock) await executor.update(inventoryStocks).set({ reservedQuantity: qv(Math.max(0, Number(stock.reservedQuantity) - Number(row.quantity))) }).where(and(eq(inventoryStocks.productId, row.productId), eq(inventoryStocks.locationId, row.locationId)))
    await executor.update(inventoryReservations).set({ status: 'released' }).where(eq(inventoryReservations.id, row.id))
  }
}

export async function consumeOrderReservations(executor: Executor, input: { orderItemId: number; performedBy: number; reference: string }) {
  const rows = await executor.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderItemId, input.orderItemId), eq(inventoryReservations.status, 'active'))).for('update'); let totalCost = 0
  for (const row of rows) {
    const [lot] = await executor.select().from(inventoryLots).where(eq(inventoryLots.id, row.lotId)).for('update'); if (!lot || Number(lot.quantity) < Number(row.quantity)) throw createError({ statusCode: 409, statusMessage: 'Lô hàng đã giữ không còn đủ số lượng.' })
    const quantity = Number(row.quantity); const after = Number(lot.quantity) - quantity
    await executor.update(inventoryLots).set({ quantity: qv(after), reservedQuantity: qv(Math.max(0, Number(lot.reservedQuantity) - quantity)), status: after <= 0 ? 'depleted' : 'available' }).where(eq(inventoryLots.id, lot.id))
    const [stock] = await executor.select().from(inventoryStocks).where(and(eq(inventoryStocks.productId, row.productId), eq(inventoryStocks.locationId, row.locationId))).for('update'); if (!stock) throw createError({ statusCode: 500, statusMessage: 'Không tìm thấy số dư kho đã giữ.' })
    await executor.update(inventoryStocks).set({ reservedQuantity: qv(Math.max(0, Number(stock.reservedQuantity) - quantity)) }).where(and(eq(inventoryStocks.productId, row.productId), eq(inventoryStocks.locationId, row.locationId)))
    await applyInventoryMovement(executor, { productId: row.productId, locationId: row.locationId, lotId: lot.id, quantityDelta: -quantity, type: 'sale', performedBy: input.performedBy, referenceType: 'sales_order_item', referenceId: input.orderItemId, unitCost: Number(lot.unitCost), note: `Xuất bán theo đơn ${input.reference}` })
    await executor.update(inventoryReservations).set({ status: 'consumed' }).where(eq(inventoryReservations.id, row.id)); totalCost += quantity * Number(lot.unitCost)
  }
  return totalCost
}

export async function createInventoryDocument(body: Payload, createdBy: number) {
  const db = useDatabase(); const type = String(body.type ?? '') as DocumentType
  if (!['receipt', 'adjustment', 'transfer', 'return'].includes(type)) throw createError({ statusCode: 422, statusMessage: 'Loại chứng từ không hợp lệ.' })
  const sourceLocationId = body.sourceLocationId ? id(body.sourceLocationId, 'Kho nguồn') : null; const destinationLocationId = body.destinationLocationId ? id(body.destinationLocationId, 'Kho nhận') : null
  if (['receipt', 'adjustment', 'return'].includes(type) && !destinationLocationId) throw createError({ statusCode: 422, statusMessage: 'Chứng từ cần chọn kho nhận.' })
  if (type === 'transfer' && (!sourceLocationId || !destinationLocationId || sourceLocationId === destinationLocationId)) throw createError({ statusCode: 422, statusMessage: 'Điều chuyển cần hai kho nguồn và nhận khác nhau.' })
  const sourceOrderId = type === 'return' ? id(body.sourceOrderId, 'Đơn bán gốc') : null
  const occurredAt = body.occurredAt ? new Date(String(body.occurredAt)) : new Date(); if (Number.isNaN(occurredAt.getTime())) throw createError({ statusCode: 422, statusMessage: 'Thời điểm chứng từ không hợp lệ.' })
  const rawItems = Array.isArray(body.items) ? body.items as Payload[] : []; if (!rawItems.length) throw createError({ statusCode: 422, statusMessage: 'Chứng từ cần ít nhất một sản phẩm.' })
  const items = rawItems.map((item) => {
    const direction = String(item.direction ?? '') as 'increase' | 'decrease'; if (type === 'adjustment' && !['increase', 'decrease'].includes(direction)) throw createError({ statusCode: 422, statusMessage: 'Mỗi dòng điều chỉnh cần chọn tăng hoặc giảm.' })
    const reasonCode = optional(item.reasonCode, 60); if (type === 'adjustment' && !reasonCode) throw createError({ statusCode: 422, statusMessage: 'Mỗi dòng điều chỉnh cần có lý do.' })
    const unitCost = item.unitCost === '' || item.unitCost == null ? null : qty(item.unitCost, 'Đơn giá', true); if (unitCost !== null && unitCost < 0) throw createError({ statusCode: 422, statusMessage: 'Đơn giá không được nhỏ hơn 0.' })
    const expiryDate = optional(item.expiryDate, 10); if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw createError({ statusCode: 422, statusMessage: 'Hạn sử dụng không hợp lệ.' })
    const disposition = String(item.disposition ?? 'sellable') as 'sellable' | 'damaged'; if (!['sellable', 'damaged'].includes(disposition)) throw createError({ statusCode: 422, statusMessage: 'Tình trạng hàng trả không hợp lệ.' })
    return { productId: id(item.productId, 'Sản phẩm'), direction: type === 'adjustment' ? direction : null, quantity: qv(qty(item.quantity)), unitCost: unitCost == null ? null : mv(unitCost), reasonCode, batchNumber: optional(item.batchNumber, 80), expiryDate, disposition, note: optional(item.note, 500) }
  })
  if (new Set(items.map(item => item.productId)).size !== items.length) throw createError({ statusCode: 422, statusMessage: 'Mỗi sản phẩm chỉ nên xuất hiện một lần trong chứng từ.' })
  const [knownProducts, knownLocations] = await Promise.all([db.select({ id: products.id }).from(products).where(and(inArray(products.id, items.map(item => item.productId)), isNull(products.deletedAt))), db.select({ id: inventoryLocations.id }).from(inventoryLocations).where(and(inArray(inventoryLocations.id, [sourceLocationId, destinationLocationId].filter((value): value is number => Boolean(value))), eq(inventoryLocations.isActive, true)))])
  if (knownProducts.length !== items.length) throw createError({ statusCode: 422, statusMessage: 'Một hoặc nhiều sản phẩm không còn hoạt động.' })
  if (knownLocations.length !== new Set([sourceLocationId, destinationLocationId].filter(Boolean)).size) throw createError({ statusCode: 422, statusMessage: 'Một hoặc nhiều kho không còn hoạt động.' })
  if (sourceOrderId) {
    const [order] = await db.select({ id: salesOrders.id }).from(salesOrders).where(eq(salesOrders.id, sourceOrderId)).limit(1); if (!order) throw createError({ statusCode: 422, statusMessage: 'Không tìm thấy đơn bán gốc.' })
    const sold = await db.select({ productId: salesOrderItems.productId, quantity: salesOrderItems.quantity }).from(salesOrderItems).where(eq(salesOrderItems.orderId, sourceOrderId))
    const returned = await db.select({ productId: inventoryDocumentItems.productId, quantity: sql<number>`coalesce(sum(${inventoryDocumentItems.quantity}), 0)`.mapWith(Number) }).from(inventoryDocumentItems).innerJoin(inventoryDocuments, eq(inventoryDocumentItems.documentId, inventoryDocuments.id)).where(and(eq(inventoryDocuments.sourceOrderId, sourceOrderId), sql`${inventoryDocuments.status} <> 'cancelled'`)).groupBy(inventoryDocumentItems.productId)
    for (const item of items) {
      const soldQuantity = sold.filter(row => row.productId === item.productId).reduce((sum, row) => sum + row.quantity, 0); const returnedQuantity = returned.find(row => row.productId === item.productId)?.quantity ?? 0
      if (Number(item.quantity) > soldQuantity - returnedQuantity) throw createError({ statusCode: 422, statusMessage: 'Tổng số lượng trả vượt quá số lượng đã bán.' })
    }
  }
  return db.transaction(async (tx) => {
    const documentReference = reference(type); const [created] = await tx.insert(inventoryDocuments).values({ reference: documentReference, type, sourceLocationId, destinationLocationId, sourceOrderId, supplierName: optional(body.supplierName, 180), invoiceNumber: optional(body.invoiceNumber, 80), note: optional(body.note, 500), occurredAt, createdBy }).$returningId()
    if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo chứng từ kho.' }); await tx.insert(inventoryDocumentItems).values(items.map(item => ({ ...item, documentId: created.id }))); return { id: created.id, reference: documentReference }
  })
}

export async function postInventoryDocument(documentId: number, performedBy: number) {
  const db = useDatabase(); return db.transaction(async (tx) => {
    const [document] = await tx.select().from(inventoryDocuments).where(eq(inventoryDocuments.id, documentId)).for('update'); if (!document) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy chứng từ kho.' }); if (document.status === 'posted') return { id: document.id, reference: document.reference, alreadyPosted: true }; if (document.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'Chỉ chứng từ nháp mới có thể ghi sổ.' })
    const items = await tx.select().from(inventoryDocumentItems).where(eq(inventoryDocumentItems.documentId, document.id)).orderBy(asc(inventoryDocumentItems.id)); if (!items.length) throw createError({ statusCode: 409, statusMessage: 'Chứng từ không có dòng sản phẩm.' })
    for (const item of items) {
      const quantity = Number(item.quantity); const common = { productId: item.productId, performedBy, documentItemId: item.id, referenceType: 'inventory_document_item', referenceId: item.id, note: item.note ?? document.note }
      if (document.type === 'receipt' || (document.type === 'adjustment' && item.direction === 'increase') || (document.type === 'return' && item.disposition === 'sellable')) await addLot(tx, { productId: item.productId, locationId: document.destinationLocationId!, quantity, receivedAt: document.occurredAt, batchNumber: item.batchNumber || `${document.reference}-${item.id}`, expiryDate: item.expiryDate, unitCost: Number(item.unitCost ?? 0), documentItemId: item.id, movement: { performedBy, documentItemId: item.id, referenceType: 'inventory_document_item', referenceId: item.id, note: item.note ?? document.note, type: document.type === 'receipt' ? 'purchase' : document.type === 'return' ? 'return' : 'adjustment' } })
      else if (document.type === 'adjustment') await consumeInventoryFefo(tx, { ...common, locationId: document.destinationLocationId!, quantity, type: 'adjustment' })
      else if (document.type === 'transfer') { const allocations = await consumeInventoryFefo(tx, { ...common, locationId: document.sourceLocationId!, quantity, type: 'transfer_out' }); for (const allocation of allocations) await addLot(tx, { productId: item.productId, locationId: document.destinationLocationId!, quantity: allocation.quantity, receivedAt: document.occurredAt, batchNumber: allocation.batchNumber, expiryDate: allocation.expiryDate, unitCost: allocation.unitCost, documentItemId: item.id, movement: { performedBy, documentItemId: item.id, referenceType: 'inventory_document_item', referenceId: item.id, note: item.note ?? document.note, type: 'transfer_in' } }) }
    }
    const postedAt = new Date(); await tx.update(inventoryDocuments).set({ status: 'posted', postedBy: performedBy, postedAt }).where(eq(inventoryDocuments.id, document.id)); await tx.insert(auditLogs).values({ userId: performedBy, action: 'inventory.post', entityType: 'inventory_document', entityId: String(document.id), newValues: { reference: document.reference, type: document.type, postedAt: postedAt.toISOString() } }); return { id: document.id, reference: document.reference, alreadyPosted: false }
  })
}

export async function cancelInventoryDocument(documentId: number, performedBy: number) {
  const db = useDatabase(); return db.transaction(async (tx) => { const [document] = await tx.select().from(inventoryDocuments).where(eq(inventoryDocuments.id, documentId)).for('update'); if (!document) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy chứng từ kho.' }); if (document.status === 'cancelled') return { id: document.id, reference: document.reference, alreadyCancelled: true }; if (document.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'Chỉ chứng từ nháp mới có thể hủy.' }); await tx.update(inventoryDocuments).set({ status: 'cancelled' }).where(eq(inventoryDocuments.id, document.id)); await tx.insert(auditLogs).values({ userId: performedBy, action: 'inventory.cancel', entityType: 'inventory_document', entityId: String(document.id), oldValues: { status: 'draft' }, newValues: { status: 'cancelled' } }); return { id: document.id, reference: document.reference, alreadyCancelled: false } })
}

export async function getInventoryWorkspace() {
  const db = useDatabase()
  const [stockRows, documentRows, transactionRows, lotRows, productOptions, locationOptions, orderOptions, movementRows, revenueRows, serviceCostRows, serviceUsageRows] = await Promise.all([
    db.select({ productId: products.id, product: products.name, sku: products.sku, locationId: inventoryLocations.id, location: inventoryLocations.name, quantity: inventoryStocks.quantity, reserved: inventoryStocks.reservedQuantity, minimum: inventoryStocks.minQuantity }).from(products).leftJoin(inventoryStocks, eq(products.id, inventoryStocks.productId)).leftJoin(inventoryLocations, eq(inventoryStocks.locationId, inventoryLocations.id)).where(isNull(products.deletedAt)).orderBy(asc(products.name), asc(inventoryLocations.name)),
    db.select({ id: inventoryDocuments.id, reference: inventoryDocuments.reference, type: inventoryDocuments.type, status: inventoryDocuments.status, occurredAt: inventoryDocuments.occurredAt, sourceLocationId: inventoryDocuments.sourceLocationId, destinationLocationId: inventoryDocuments.destinationLocationId, sourceOrderId: inventoryDocuments.sourceOrderId, supplierName: inventoryDocuments.supplierName, invoiceNumber: inventoryDocuments.invoiceNumber, note: inventoryDocuments.note, itemCount: sql<number>`(select count(*) from ${inventoryDocumentItems} idi where idi.document_id = ${inventoryDocuments.id})`.mapWith(Number), totalQuantity: sql<string>`(select coalesce(sum(idi.quantity), 0) from ${inventoryDocumentItems} idi where idi.document_id = ${inventoryDocuments.id})` }).from(inventoryDocuments).orderBy(desc(inventoryDocuments.createdAt)).limit(100),
    db.select({ id: inventoryTransactions.id, product: products.name, sku: products.sku, location: inventoryLocations.name, lot: inventoryLots.batchNumber, type: inventoryTransactions.type, quantityDelta: inventoryTransactions.quantityDelta, quantityAfter: inventoryTransactions.quantityAfter, unitCost: inventoryTransactions.unitCost, note: inventoryTransactions.note, createdAt: inventoryTransactions.createdAt }).from(inventoryTransactions).innerJoin(products, eq(inventoryTransactions.productId, products.id)).innerJoin(inventoryLocations, eq(inventoryTransactions.locationId, inventoryLocations.id)).leftJoin(inventoryLots, eq(inventoryTransactions.lotId, inventoryLots.id)).orderBy(desc(inventoryTransactions.createdAt)).limit(200),
    db.select({ id: inventoryLots.id, product: products.name, sku: products.sku, location: inventoryLocations.name, batchNumber: inventoryLots.batchNumber, receivedAt: inventoryLots.receivedAt, expiryDate: inventoryLots.expiryDate, initialQuantity: inventoryLots.initialQuantity, quantity: inventoryLots.quantity, reserved: inventoryLots.reservedQuantity, unitCost: inventoryLots.unitCost, status: inventoryLots.status }).from(inventoryLots).innerJoin(products, eq(inventoryLots.productId, products.id)).innerJoin(inventoryLocations, eq(inventoryLots.locationId, inventoryLocations.id)).orderBy(sql`${inventoryLots.expiryDate} is null`, asc(inventoryLots.expiryDate), asc(inventoryLots.receivedAt)),
    db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).where(isNull(products.deletedAt)).orderBy(asc(products.name)),
    db.select({ id: inventoryLocations.id, name: inventoryLocations.name, code: inventoryLocations.code }).from(inventoryLocations).where(eq(inventoryLocations.isActive, true)).orderBy(asc(inventoryLocations.name)),
    db.select({ id: salesOrders.id, reference: salesOrders.reference }).from(salesOrders).where(inArray(salesOrders.status, ['paid', 'refunded'])).orderBy(desc(salesOrders.createdAt)).limit(100),
    db.select({ day: sql<string>`date(${inventoryTransactions.createdAt})`, incoming: sql<number>`coalesce(sum(case when ${inventoryTransactions.quantityDelta} > 0 then ${inventoryTransactions.quantityDelta} else 0 end), 0)`.mapWith(Number), outgoing: sql<number>`abs(coalesce(sum(case when ${inventoryTransactions.quantityDelta} < 0 then ${inventoryTransactions.quantityDelta} else 0 end), 0))`.mapWith(Number) }).from(inventoryTransactions).where(sql`${inventoryTransactions.createdAt} >= date_sub(current_date(), interval 13 day)`).groupBy(sql`date(${inventoryTransactions.createdAt})`).orderBy(asc(sql`date(${inventoryTransactions.createdAt})`)),
    db.select({ revenue: sql<number>`coalesce(sum(${salesOrders.totalAmount}), 0)`.mapWith(Number), cost: sql<number>`coalesce(sum(${salesOrders.totalCost}), 0)`.mapWith(Number) }).from(salesOrders).where(and(eq(salesOrders.status, 'paid'), sql`${salesOrders.paidAt} >= date_sub(current_date(), interval 30 day)`)),
    db.select({ cost: sql<number>`coalesce(sum(${appointmentServices.materialCost}), 0)`.mapWith(Number) }).from(appointmentServices).where(and(eq(appointmentServices.status, 'completed'), sql`${appointmentServices.completedAt} >= date_sub(current_date(), interval 30 day)`)),
    db.select({ product: products.name, sku: products.sku, quantity: sql<number>`abs(coalesce(sum(${inventoryTransactions.quantityDelta}), 0))`.mapWith(Number), cost: sql<number>`abs(coalesce(sum(${inventoryTransactions.quantityDelta} * coalesce(${inventoryTransactions.unitCost}, 0)), 0))`.mapWith(Number) }).from(inventoryTransactions).innerJoin(products, eq(inventoryTransactions.productId, products.id)).where(and(eq(inventoryTransactions.type, 'service_usage'), sql`${inventoryTransactions.createdAt} >= date_sub(current_date(), interval 30 day)`)).groupBy(products.id, products.name, products.sku).orderBy(desc(sql`abs(sum(${inventoryTransactions.quantityDelta} * coalesce(${inventoryTransactions.unitCost}, 0)))`)).limit(20),
  ])
  const locationNames = new Map(locationOptions.map(location => [location.id, location.name])); const today = new Date(); today.setHours(0, 0, 0, 0); const soon = new Date(today); soon.setDate(soon.getDate() + 30)
  const lots = lotRows.map(row => ({ ...row, initialQuantity: Number(row.initialQuantity), quantity: Number(row.quantity), reserved: Number(row.reserved), available: Number(row.quantity) - Number(row.reserved), unitCost: Number(row.unitCost), stockValue: Number(row.quantity) * Number(row.unitCost), expiryState: !row.expiryDate ? 'none' : new Date(row.expiryDate) < today ? 'expired' : new Date(row.expiryDate) <= soon ? 'soon' : 'good' }))
  const stocks = stockRows.map(row => ({ ...row, location: row.location ?? 'Chưa phát sinh', quantity: Number(row.quantity ?? 0), reserved: Number(row.reserved ?? 0), available: Number(row.quantity ?? 0) - Number(row.reserved ?? 0), minimum: Number(row.minimum ?? 0) }))
  const revenue = revenueRows[0]?.revenue ?? 0; const cost = revenueRows[0]?.cost ?? 0
  return { stocks, documents: documentRows.map(row => ({ ...row, sourceLocation: row.sourceLocationId ? locationNames.get(row.sourceLocationId) ?? 'Không xác định' : '', destinationLocation: row.destinationLocationId ? locationNames.get(row.destinationLocationId) ?? 'Không xác định' : '', totalQuantity: Number(row.totalQuantity) })), transactions: transactionRows.map(row => ({ ...row, lot: row.lot ?? 'Không theo lô', quantityDelta: Number(row.quantityDelta), quantityAfter: Number(row.quantityAfter), unitCost: Number(row.unitCost ?? 0) })), lots, alerts: { lowStock: stocks.filter(row => row.locationId && row.available <= row.minimum).length, expiring: lots.filter(row => row.quantity > 0 && row.expiryState === 'soon').length, expired: lots.filter(row => row.quantity > 0 && row.expiryState === 'expired').length, drafts: documentRows.filter(row => row.status === 'draft').length }, reports: { movement: movementRows, inventoryValue: lots.reduce((sum, lot) => sum + lot.stockValue, 0), revenue30Days: revenue, cost30Days: cost, grossProfit30Days: revenue - cost, serviceMaterialCost30Days: serviceCostRows[0]?.cost ?? 0, serviceUsage: serviceUsageRows }, options: { products: productOptions, locations: locationOptions, orders: orderOptions } }
}

export async function getServiceRecipes() {
  const db = useDatabase(); const [serviceRows, usageRows, productOptions] = await Promise.all([
    db.select({ id: services.id, code: services.code, name: services.name }).from(services).where(and(eq(services.isActive, true), isNull(services.deletedAt))).orderBy(asc(services.name)),
    db.select({ id: serviceProductUsages.id, serviceId: serviceProductUsages.serviceId, productId: serviceProductUsages.productId, product: products.name, sku: products.sku, quantity: serviceProductUsages.quantity, note: serviceProductUsages.note }).from(serviceProductUsages).innerJoin(products, eq(serviceProductUsages.productId, products.id)).orderBy(asc(products.name)),
    db.select({ id: products.id, name: products.name, sku: products.sku, unit: products.unit }).from(products).where(and(isNull(products.deletedAt), eq(products.trackInventory, true))).orderBy(asc(products.name)),
  ]); return { services: serviceRows.map(service => ({ ...service, usages: usageRows.filter(row => row.serviceId === service.id).map(row => ({ ...row, quantity: Number(row.quantity) })) })), products: productOptions }
}

export async function saveServiceRecipe(serviceId: number, body: Payload) {
  const db = useDatabase(); const raw = Array.isArray(body.items) ? body.items as Payload[] : []; const items = raw.map(row => ({ serviceId, productId: id(row.productId, 'Sản phẩm'), quantity: qv(qty(row.quantity)), note: optional(row.note, 255) }))
  if (new Set(items.map(item => item.productId)).size !== items.length) throw createError({ statusCode: 422, statusMessage: 'Mỗi sản phẩm chỉ được khai báo một lần.' }); const [service] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, serviceId), isNull(services.deletedAt))).limit(1); if (!service) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy dịch vụ.' })
  await db.transaction(async (tx) => { await tx.delete(serviceProductUsages).where(eq(serviceProductUsages.serviceId, serviceId)); if (items.length) await tx.insert(serviceProductUsages).values(items) }); return { serviceId, itemCount: items.length }
}
