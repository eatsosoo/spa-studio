import { randomBytes } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import {
  auditLogs,
  inventoryDocumentItems,
  inventoryDocuments,
  inventoryLocations,
  inventoryStocks,
  inventoryTransactions,
  products,
} from '../database/schema'
import { useDatabase } from '../database/client'

type InventoryDocumentType = 'receipt' | 'adjustment' | 'transfer'
type InventoryDirection = 'increase' | 'decrease'
type InventoryTransactionType = 'opening' | 'purchase' | 'sale' | 'service_usage' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return'
type InventoryExecutor = Pick<ReturnType<typeof useDatabase>, 'select' | 'insert' | 'update'>
type Payload = Record<string, unknown>

export type InventoryMovement = {
  productId: number
  locationId: number
  quantityDelta: number
  type: InventoryTransactionType
  performedBy?: number | null
  documentItemId?: number | null
  referenceType?: string | null
  referenceId?: number | null
  unitCost?: number | null
  note?: string | null
}

const quantityNumber = (value: unknown, label = 'Số lượng', allowNegative = false) => {
  const number = Number(value)
  if (!Number.isFinite(number) || (!allowNegative && number <= 0)) throw createError({ statusCode: 422, statusMessage: `${label} không hợp lệ.` })
  return Math.round(number * 1000) / 1000
}
const quantityValue = (value: number) => value.toFixed(3)
const optionalText = (value: unknown, maxLength: number) => String(value ?? '').trim().slice(0, maxLength) || null
const positiveId = (value: unknown, label: string) => {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 422, statusMessage: `${label} không hợp lệ.` })
  return id
}
const documentReference = (type: InventoryDocumentType) => {
  const prefix = type === 'receipt' ? 'NK' : type === 'transfer' ? 'CK' : 'DC'
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
}

export async function applyInventoryMovement(executor: InventoryExecutor, movement: InventoryMovement) {
  const productId = positiveId(movement.productId, 'Sản phẩm')
  const locationId = positiveId(movement.locationId, 'Kho')
  const delta = quantityNumber(movement.quantityDelta, 'Biến động tồn kho', true)
  if (delta === 0) throw createError({ statusCode: 422, statusMessage: 'Biến động tồn kho phải khác 0.' })

  await executor.insert(inventoryStocks).values({ productId, locationId }).onDuplicateKeyUpdate({ set: { quantity: sql`${inventoryStocks.quantity}` } })
  const [stock] = await executor.select({ quantity: inventoryStocks.quantity, reserved: inventoryStocks.reservedQuantity }).from(inventoryStocks)
    .where(and(eq(inventoryStocks.productId, productId), eq(inventoryStocks.locationId, locationId))).for('update')
  if (!stock) throw createError({ statusCode: 500, statusMessage: 'Không thể khởi tạo số dư kho.' })

  const current = Number(stock.quantity)
  const reserved = Number(stock.reserved)
  const after = Math.round((current + delta) * 1000) / 1000
  if (after < reserved) throw createError({ statusCode: 409, statusMessage: `Tồn khả dụng không đủ. Hiện có ${(current - reserved).toLocaleString('vi-VN')} đơn vị.` })

  await executor.update(inventoryStocks).set({ quantity: quantityValue(after) }).where(and(eq(inventoryStocks.productId, productId), eq(inventoryStocks.locationId, locationId)))
  await executor.insert(inventoryTransactions).values({
    productId,
    locationId,
    documentItemId: movement.documentItemId ?? null,
    type: movement.type,
    quantityDelta: quantityValue(delta),
    quantityAfter: quantityValue(after),
    unitCost: movement.unitCost === null || movement.unitCost === undefined ? null : String(movement.unitCost),
    referenceType: movement.referenceType ?? null,
    referenceId: movement.referenceId ?? null,
    note: movement.note ?? null,
    performedBy: movement.performedBy ?? null,
  })
  return after
}

export async function createInventoryDocument(body: Payload, createdBy: number) {
  const db = useDatabase()
  const type = String(body.type ?? '') as InventoryDocumentType
  if (!['receipt', 'adjustment', 'transfer'].includes(type)) throw createError({ statusCode: 422, statusMessage: 'Loại chứng từ không hợp lệ.' })

  const sourceLocationId = body.sourceLocationId ? positiveId(body.sourceLocationId, 'Kho nguồn') : null
  const destinationLocationId = body.destinationLocationId ? positiveId(body.destinationLocationId, 'Kho nhận') : null
  if (type === 'receipt' && !destinationLocationId) throw createError({ statusCode: 422, statusMessage: 'Phiếu nhập cần chọn kho nhận.' })
  if (type === 'adjustment' && !destinationLocationId) throw createError({ statusCode: 422, statusMessage: 'Phiếu điều chỉnh cần chọn kho.' })
  if (type === 'transfer' && (!sourceLocationId || !destinationLocationId || sourceLocationId === destinationLocationId)) throw createError({ statusCode: 422, statusMessage: 'Điều chuyển cần hai kho nguồn và nhận khác nhau.' })

  const occurredAt = body.occurredAt ? new Date(String(body.occurredAt)) : new Date()
  if (Number.isNaN(occurredAt.getTime())) throw createError({ statusCode: 422, statusMessage: 'Thời điểm chứng từ không hợp lệ.' })
  const rawItems = Array.isArray(body.items) ? body.items as Payload[] : []
  if (!rawItems.length) throw createError({ statusCode: 422, statusMessage: 'Chứng từ cần ít nhất một sản phẩm.' })

  const items = rawItems.map((item) => {
    const direction = String(item.direction ?? '') as InventoryDirection
    if (type === 'adjustment' && !['increase', 'decrease'].includes(direction)) throw createError({ statusCode: 422, statusMessage: 'Mỗi dòng điều chỉnh cần chọn tăng hoặc giảm.' })
    const reasonCode = optionalText(item.reasonCode, 60)
    if (type === 'adjustment' && !reasonCode) throw createError({ statusCode: 422, statusMessage: 'Mỗi dòng điều chỉnh cần có lý do.' })
    const unitCost = item.unitCost === '' || item.unitCost === null || item.unitCost === undefined ? null : quantityNumber(item.unitCost, 'Đơn giá', true)
    if (unitCost !== null && unitCost < 0) throw createError({ statusCode: 422, statusMessage: 'Đơn giá không được nhỏ hơn 0.' })
    const expiryDate = optionalText(item.expiryDate, 10)
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw createError({ statusCode: 422, statusMessage: 'Hạn sử dụng không hợp lệ.' })
    return {
      productId: positiveId(item.productId, 'Sản phẩm'),
      direction: type === 'adjustment' ? direction : null,
      quantity: quantityValue(quantityNumber(item.quantity)),
      unitCost: unitCost === null ? null : String(unitCost),
      reasonCode,
      batchNumber: optionalText(item.batchNumber, 80),
      expiryDate,
      note: optionalText(item.note, 500),
    }
  })
  if (new Set(items.map(item => item.productId)).size !== items.length) throw createError({ statusCode: 422, statusMessage: 'Mỗi sản phẩm chỉ nên xuất hiện một lần trong chứng từ.' })

  const [knownProducts, knownLocations] = await Promise.all([
    db.select({ id: products.id }).from(products).where(and(inArray(products.id, items.map(item => item.productId)), isNull(products.deletedAt))),
    db.select({ id: inventoryLocations.id }).from(inventoryLocations).where(and(inArray(inventoryLocations.id, [sourceLocationId, destinationLocationId].filter((id): id is number => Boolean(id))), eq(inventoryLocations.isActive, true))),
  ])
  if (knownProducts.length !== items.length) throw createError({ statusCode: 422, statusMessage: 'Một hoặc nhiều sản phẩm không còn hoạt động.' })
  const requiredLocations = new Set([sourceLocationId, destinationLocationId].filter((id): id is number => Boolean(id)))
  if (knownLocations.length !== requiredLocations.size) throw createError({ statusCode: 422, statusMessage: 'Một hoặc nhiều kho không còn hoạt động.' })

  return db.transaction(async (tx) => {
    const reference = documentReference(type)
    const [created] = await tx.insert(inventoryDocuments).values({
      reference,
      type,
      sourceLocationId,
      destinationLocationId,
      supplierName: optionalText(body.supplierName, 180),
      invoiceNumber: optionalText(body.invoiceNumber, 80),
      note: optionalText(body.note, 500),
      occurredAt,
      createdBy,
    }).$returningId()
    if (!created) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo chứng từ kho.' })
    await tx.insert(inventoryDocumentItems).values(items.map(item => ({ ...item, documentId: created.id })))
    return { id: created.id, reference }
  })
}

export async function postInventoryDocument(documentId: number, performedBy: number) {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [document] = await tx.select().from(inventoryDocuments).where(eq(inventoryDocuments.id, documentId)).for('update')
    if (!document) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy chứng từ kho.' })
    if (document.status === 'posted') return { id: document.id, reference: document.reference, alreadyPosted: true }
    if (document.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'Chỉ chứng từ nháp mới có thể ghi sổ.' })
    const items = await tx.select().from(inventoryDocumentItems).where(eq(inventoryDocumentItems.documentId, document.id)).orderBy(asc(inventoryDocumentItems.id))
    if (!items.length) throw createError({ statusCode: 409, statusMessage: 'Chứng từ không có dòng sản phẩm.' })

    for (const item of items) {
      const quantity = Number(item.quantity)
      const common = { productId: item.productId, performedBy, documentItemId: item.id, referenceType: 'inventory_document_item', referenceId: item.id, unitCost: item.unitCost === null ? null : Number(item.unitCost), note: item.note ?? document.note }
      if (document.type === 'receipt') {
        await applyInventoryMovement(tx, { ...common, locationId: document.destinationLocationId!, quantityDelta: quantity, type: 'purchase' })
      } else if (document.type === 'adjustment') {
        await applyInventoryMovement(tx, { ...common, locationId: document.destinationLocationId!, quantityDelta: item.direction === 'decrease' ? -quantity : quantity, type: 'adjustment' })
      } else {
        await applyInventoryMovement(tx, { ...common, locationId: document.sourceLocationId!, quantityDelta: -quantity, type: 'transfer_out' })
        await applyInventoryMovement(tx, { ...common, locationId: document.destinationLocationId!, quantityDelta: quantity, type: 'transfer_in' })
      }
    }

    const postedAt = new Date()
    await tx.update(inventoryDocuments).set({ status: 'posted', postedBy: performedBy, postedAt }).where(eq(inventoryDocuments.id, document.id))
    await tx.insert(auditLogs).values({ userId: performedBy, action: 'inventory.post', entityType: 'inventory_document', entityId: String(document.id), newValues: { reference: document.reference, type: document.type, postedAt: postedAt.toISOString() } })
    return { id: document.id, reference: document.reference, alreadyPosted: false }
  })
}

export async function cancelInventoryDocument(documentId: number, performedBy: number) {
  const db = useDatabase()
  return db.transaction(async (tx) => {
    const [document] = await tx.select().from(inventoryDocuments).where(eq(inventoryDocuments.id, documentId)).for('update')
    if (!document) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy chứng từ kho.' })
    if (document.status === 'cancelled') return { id: document.id, reference: document.reference, alreadyCancelled: true }
    if (document.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'Chỉ chứng từ nháp mới có thể hủy.' })
    await tx.update(inventoryDocuments).set({ status: 'cancelled' }).where(eq(inventoryDocuments.id, document.id))
    await tx.insert(auditLogs).values({ userId: performedBy, action: 'inventory.cancel', entityType: 'inventory_document', entityId: String(document.id), oldValues: { status: 'draft' }, newValues: { status: 'cancelled' } })
    return { id: document.id, reference: document.reference, alreadyCancelled: false }
  })
}

export async function getInventoryWorkspace() {
  const db = useDatabase()
  const [stockRows, documentRows, transactionRows, productOptions, locationOptions] = await Promise.all([
    db.select({ productId: products.id, product: products.name, sku: products.sku, locationId: inventoryLocations.id, location: inventoryLocations.name, quantity: inventoryStocks.quantity, reserved: inventoryStocks.reservedQuantity, minimum: inventoryStocks.minQuantity })
      .from(products).leftJoin(inventoryStocks, eq(products.id, inventoryStocks.productId)).leftJoin(inventoryLocations, eq(inventoryStocks.locationId, inventoryLocations.id))
      .where(isNull(products.deletedAt)).orderBy(asc(products.name), asc(inventoryLocations.name)),
    db.select({ id: inventoryDocuments.id, reference: inventoryDocuments.reference, type: inventoryDocuments.type, status: inventoryDocuments.status, occurredAt: inventoryDocuments.occurredAt, sourceLocationId: inventoryDocuments.sourceLocationId, destinationLocationId: inventoryDocuments.destinationLocationId, supplierName: inventoryDocuments.supplierName, invoiceNumber: inventoryDocuments.invoiceNumber, note: inventoryDocuments.note, itemCount: sql<number>`(select count(*) from ${inventoryDocumentItems} idi where idi.document_id = ${inventoryDocuments.id})`.mapWith(Number), totalQuantity: sql<string>`(select coalesce(sum(idi.quantity), 0) from ${inventoryDocumentItems} idi where idi.document_id = ${inventoryDocuments.id})` })
      .from(inventoryDocuments).orderBy(desc(inventoryDocuments.createdAt)).limit(100),
    db.select({ id: inventoryTransactions.id, product: products.name, sku: products.sku, location: inventoryLocations.name, type: inventoryTransactions.type, quantityDelta: inventoryTransactions.quantityDelta, quantityAfter: inventoryTransactions.quantityAfter, referenceType: inventoryTransactions.referenceType, referenceId: inventoryTransactions.referenceId, note: inventoryTransactions.note, createdAt: inventoryTransactions.createdAt })
      .from(inventoryTransactions).innerJoin(products, eq(inventoryTransactions.productId, products.id)).innerJoin(inventoryLocations, eq(inventoryTransactions.locationId, inventoryLocations.id))
      .orderBy(desc(inventoryTransactions.createdAt)).limit(150),
    db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).where(isNull(products.deletedAt)).orderBy(asc(products.name)),
    db.select({ id: inventoryLocations.id, name: inventoryLocations.name, code: inventoryLocations.code }).from(inventoryLocations).where(eq(inventoryLocations.isActive, true)).orderBy(asc(inventoryLocations.name)),
  ])

  const locationNames = new Map(locationOptions.map(location => [location.id, location.name]))
  return {
    stocks: stockRows.map(row => ({ ...row, location: row.location ?? 'Chưa phát sinh', quantity: Number(row.quantity ?? 0), reserved: Number(row.reserved ?? 0), available: Number(row.quantity ?? 0) - Number(row.reserved ?? 0), minimum: Number(row.minimum ?? 0) })),
    documents: documentRows.map(row => ({ ...row, sourceLocation: row.sourceLocationId ? locationNames.get(row.sourceLocationId) ?? 'Không xác định' : '', destinationLocation: row.destinationLocationId ? locationNames.get(row.destinationLocationId) ?? 'Không xác định' : '', totalQuantity: Number(row.totalQuantity) })),
    transactions: transactionRows.map(row => ({ ...row, quantityDelta: Number(row.quantityDelta), quantityAfter: Number(row.quantityAfter) })),
    options: { products: productOptions, locations: locationOptions },
  }
}
