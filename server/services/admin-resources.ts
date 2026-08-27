import { and, desc, eq, isNull, like, sql } from 'drizzle-orm'
import {
  appointmentServices,
  appointments,
  branches,
  customers,
  employees,
  inventoryLocations,
  inventoryStocks,
  postCategories,
  posts,
  productCategories,
  products,
  services,
  users,
} from '../database/schema'
import { useDatabase } from '../database/client'

type Payload = Record<string, unknown>
type Resource = 'customers' | 'products' | 'bookings' | 'employees' | 'posts'

const customerStatuses = { 'Đang hoạt động': 'active', 'Tạm ngưng': 'inactive', 'Đã chặn': 'blocked' } as const
const productStatuses = { 'Đang bán': 'active', 'Sắp hết': 'out_of_stock', 'Tạm ẩn': 'inactive' } as const
const bookingStatuses = { 'Chờ xác nhận': 'pending', 'Đã xác nhận': 'confirmed', 'Đã đến': 'checked_in', 'Đang phục vụ': 'in_service', 'Đã hoàn tất': 'completed', 'Đã hủy': 'cancelled' } as const
const employeeStatuses = { 'Đang làm việc': 'active', 'Nghỉ hôm nay': 'on_leave', 'Đã nghỉ việc': 'terminated' } as const
const postStatuses = { 'Bản nháp': 'draft', 'Đã xuất bản': 'published', 'Lưu trữ': 'archived' } as const

const reverse = (map: Record<string, string>, value: string) => Object.entries(map).find(([, stored]) => stored === value)?.[0] ?? value
const text = (body: Payload, key: string, required = true) => {
  const value = String(body[key] ?? '').trim()
  if (required && !value) throw createError({ statusCode: 422, statusMessage: `Trường ${key} là bắt buộc.` })
  return value || null
}
const number = (body: Payload, key: string) => {
  const value = Number(body[key] ?? 0)
  if (!Number.isFinite(value) || value < 0) throw createError({ statusCode: 422, statusMessage: `Trường ${key} không hợp lệ.` })
  return Math.round(value)
}
const status = <T extends Record<string, string>>(body: Payload, key: string, map: T, fallback: T[keyof T]) => {
  const label = String(body[key] ?? '')
  return (map[label] ?? fallback) as T[keyof T]
}
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const dateVi = (value: Date | string | null) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : 'Chưa có'
const dateInput = (value: Date | string) => new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
const timeInput = (value: Date | string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
const insertedId = (row: { id: number } | undefined) => {
  if (!row) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo bản ghi mới.' })
  return row.id
}

async function defaultBranch(db: ReturnType<typeof useDatabase>) {
  const [branch] = await db.select({ id: branches.id }).from(branches).where(eq(branches.code, 'MAIN')).limit(1)
  if (!branch) throw createError({ statusCode: 409, statusMessage: 'Chưa có chi nhánh MAIN. Hãy chạy migration trước.' })
  return branch.id
}

async function categoryId(db: ReturnType<typeof useDatabase>, table: typeof productCategories | typeof postCategories, name: string) {
  const [found] = await db.select({ id: table.id }).from(table).where(eq(table.name, name)).limit(1)
  if (found) return found.id
  const suffix = Date.now().toString(36)
  const [created] = await db.insert(table).values({ name, slug: `${slugify(name)}-${suffix}` }).$returningId()
  return insertedId(created)
}

async function defaultLocation(db: ReturnType<typeof useDatabase>) {
  const [found] = await db.select({ id: inventoryLocations.id }).from(inventoryLocations).where(eq(inventoryLocations.code, 'MAIN-STOCK')).limit(1)
  if (found) return found.id
  const [created] = await db.insert(inventoryLocations).values({ branchId: await defaultBranch(db), code: 'MAIN-STOCK', name: 'Kho chính' }).$returningId()
  return insertedId(created)
}

async function serviceByName(db: ReturnType<typeof useDatabase>, name: string) {
  const [found] = await db.select().from(services).where(and(eq(services.name, name), isNull(services.deletedAt))).limit(1)
  if (found) return found
  const suffix = Date.now().toString(36)
  const [created] = await db.insert(services).values({ code: `DV-${suffix}`.toUpperCase(), name, slug: `${slugify(name)}-${suffix}`, durationMinutes: 60, price: '0', isActive: true }).$returningId()
  const [result] = await db.select().from(services).where(eq(services.id, insertedId(created))).limit(1)
  return result!
}

async function listCustomers() {
  const db = useDatabase()
  const rows = await db.select({
    id: customers.id, name: customers.fullName, phone: customers.phone, email: customers.email,
    note: customers.notes, customerStatus: customers.status, totalSpent: customers.totalSpent,
    visits: sql<number>`(select count(*) from ${appointments} a where a.customer_id = ${customers.id} and a.status = 'completed')`.mapWith(Number),
    lastVisit: sql<Date | null>`(select max(a.starts_at) from ${appointments} a where a.customer_id = ${customers.id} and a.status = 'completed')`,
  }).from(customers).where(isNull(customers.deletedAt)).orderBy(desc(customers.updatedAt))
  return rows.map(row => ({ ...row, email: row.email ?? '', note: row.note ?? '', lastVisit: dateVi(row.lastVisit), tier: Number(row.totalSpent) >= 10000000 || row.visits >= 10 ? 'An' : row.visits >= 3 ? 'Mộc' : 'Khách mới', status: reverse(customerStatuses, row.customerStatus), totalSpent: undefined, customerStatus: undefined }))
}

async function saveCustomer(id: number | null, body: Payload) {
  const db = useDatabase()
  const values = { fullName: text(body, 'name')!, phone: text(body, 'phone')!, email: text(body, 'email', false), notes: text(body, 'note', false), status: status(body, 'status', customerStatuses, 'active') }
  if (id) await db.update(customers).set(values).where(and(eq(customers.id, id), isNull(customers.deletedAt)))
  else await db.insert(customers).values({ ...values, code: `KH-${Date.now().toString(36)}`.toUpperCase() })
}

async function listProducts() {
  const db = useDatabase()
  const rows = await db.select({
    id: products.id, name: products.name, sku: products.sku, category: productCategories.name,
    price: products.salePrice, productStatus: products.status, description: products.shortDescription,
    stock: sql<number>`coalesce(sum(${inventoryStocks.quantity}), 0)`.mapWith(Number),
  }).from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(inventoryStocks, eq(products.id, inventoryStocks.productId))
    .where(isNull(products.deletedAt))
    .groupBy(products.id, products.name, products.sku, productCategories.name, products.salePrice, products.status, products.shortDescription)
    .orderBy(desc(products.updatedAt))
  return rows.map(row => ({ ...row, price: Number(row.price), category: row.category ?? 'Chưa phân nhóm', status: reverse(productStatuses, row.productStatus), productStatus: undefined }))
}

async function saveProduct(id: number | null, body: Payload) {
  const db = useDatabase()
  const name = text(body, 'name')!
  const category = text(body, 'category')!
  const stock = number(body, 'stock')
  const values = { name, sku: text(body, 'sku')!, categoryId: await categoryId(db, productCategories, category), salePrice: String(number(body, 'price')), shortDescription: text(body, 'description', false), status: status(body, 'status', productStatuses, 'active') }
  const locationId = await defaultLocation(db)
  let productId = id
  await db.transaction(async tx => {
    if (productId) await tx.update(products).set({ ...values, slug: `${slugify(name)}-${productId}` }).where(and(eq(products.id, productId), isNull(products.deletedAt)))
    else {
      const [created] = await tx.insert(products).values({ ...values, slug: `${slugify(name)}-${Date.now().toString(36)}` }).$returningId()
      productId = insertedId(created)
    }
    await tx.insert(inventoryStocks).values({ productId: productId!, locationId, quantity: stock }).onDuplicateKeyUpdate({ set: { quantity: stock } })
  })
}

async function listEmployees() {
  const db = useDatabase()
  const rows = await db.select({
    id: employees.id, code: employees.code, name: employees.fullName, role: employees.jobTitle,
    phone: employees.phone, email: employees.email, hireDate: employees.hireDate, employeeStatus: employees.status,
    appointments: sql<number>`(select count(*) from ${appointmentServices} aps join ${appointments} ap on ap.id = aps.appointment_id where aps.employee_id = ${employees.id} and date(ap.starts_at) = current_date())`.mapWith(Number),
  }).from(employees).where(isNull(employees.deletedAt)).orderBy(desc(employees.updatedAt))
  return rows.map(row => ({ ...row, role: row.role ?? 'Chưa phân vai trò', phone: row.phone ?? '', email: row.email ?? '', shift: 'Linh hoạt', status: reverse(employeeStatuses, row.employeeStatus), employeeStatus: undefined }))
}

async function saveEmployee(id: number | null, body: Payload) {
  const db = useDatabase()
  const values = { branchId: await defaultBranch(db), code: text(body, 'code')!, fullName: text(body, 'name')!, phone: text(body, 'phone', false), email: text(body, 'email', false), hireDate: text(body, 'hireDate')!, jobTitle: text(body, 'role')!, status: status(body, 'status', employeeStatuses, 'active') }
  if (id) await db.update(employees).set(values).where(and(eq(employees.id, id), isNull(employees.deletedAt)))
  else await db.insert(employees).values(values)
}

async function listBookings() {
  const db = useDatabase()
  const rows = await db.select({
    id: appointments.id, customer: appointments.customerName, phone: appointments.customerPhone,
    startsAt: appointments.startsAt, bookingStatus: appointments.status, note: appointments.notes, total: appointments.totalAmount,
    service: appointmentServices.serviceName, staff: employees.fullName,
  }).from(appointments)
    .leftJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
    .leftJoin(employees, eq(appointmentServices.employeeId, employees.id))
    .orderBy(desc(appointments.startsAt))
  return rows.map(row => ({ id: row.id, customer: row.customer, phone: row.phone, date: dateInput(row.startsAt), time: timeInput(row.startsAt), service: row.service ?? 'Chưa chọn', staff: row.staff ?? 'Chưa phân công', room: 'Chưa xếp', note: row.note ?? '', total: Number(row.total), status: reverse(bookingStatuses, row.bookingStatus) }))
}

async function saveBooking(id: number | null, body: Payload) {
  const db = useDatabase()
  const customer = text(body, 'customer')!
  const phone = text(body, 'phone')!
  const service = await serviceByName(db, text(body, 'service')!)
  const staffName = text(body, 'staff', false)
  const [employee] = staffName ? await db.select({ id: employees.id }).from(employees).where(and(like(employees.fullName, `%${staffName}%`), isNull(employees.deletedAt))).limit(1) : []
  const start = new Date(`${text(body, 'date')}T${text(body, 'time')}:00+07:00`)
  if (Number.isNaN(start.getTime())) throw createError({ statusCode: 422, statusMessage: 'Ngày hoặc giờ hẹn không hợp lệ.' })
  const end = new Date(start.getTime() + service.durationMinutes * 60_000)
  const [knownCustomer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.phone, phone), isNull(customers.deletedAt))).limit(1)
  const appointmentValues = { branchId: await defaultBranch(db), customerId: knownCustomer?.id, customerName: customer, customerPhone: phone, startsAt: start, endsAt: end, status: status(body, 'status', bookingStatuses, 'pending'), source: body.source === 'website' ? 'website' as const : 'admin' as const, subtotal: service.price, totalAmount: service.price, notes: text(body, 'note', false) }
  let reference = ''
  await db.transaction(async tx => {
    let appointmentId = id
    if (appointmentId) await tx.update(appointments).set(appointmentValues).where(eq(appointments.id, appointmentId))
    else {
      reference = `LH-${Date.now().toString(36)}`.toUpperCase()
      const [created] = await tx.insert(appointments).values({ ...appointmentValues, reference }).$returningId()
      appointmentId = insertedId(created)
    }
    await tx.delete(appointmentServices).where(eq(appointmentServices.appointmentId, appointmentId!))
    await tx.insert(appointmentServices).values({ appointmentId: appointmentId!, serviceId: service.id, employeeId: employee?.id, serviceName: service.name, durationMinutes: service.durationMinutes, unitPrice: service.price, finalPrice: service.price, status: appointmentValues.status === 'completed' ? 'completed' : appointmentValues.status === 'cancelled' ? 'cancelled' : 'scheduled' })
  })
  return { reference }
}

async function listPosts() {
  const db = useDatabase()
  const rows = await db.select({ id: posts.id, title: posts.title, category: postCategories.name, author: users.username, summary: posts.excerpt, content: posts.content, postStatus: posts.status, updatedAt: posts.updatedAt }).from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id)).leftJoin(users, eq(posts.authorId, users.id))
    .where(isNull(posts.deletedAt)).orderBy(desc(posts.updatedAt))
  return rows.map(row => ({ ...row, category: row.category ?? 'Chưa phân loại', author: row.author ?? 'MIÊN', summary: row.summary ?? '', updatedAt: dateVi(row.updatedAt), status: reverse(postStatuses, row.postStatus), postStatus: undefined }))
}

async function savePost(id: number | null, body: Payload) {
  const db = useDatabase()
  const title = text(body, 'title')!
  const postStatus = status(body, 'status', postStatuses, 'draft')
  const values = { title, categoryId: await categoryId(db, postCategories, text(body, 'category')!), excerpt: text(body, 'summary', false), content: text(body, 'content')!, status: postStatus, publishedAt: postStatus === 'published' ? new Date() : null }
  if (id) await db.update(posts).set({ ...values, slug: `${slugify(title)}-${id}` }).where(and(eq(posts.id, id), isNull(posts.deletedAt)))
  else await db.insert(posts).values({ ...values, slug: `${slugify(title)}-${Date.now().toString(36)}` })
}

export const adminResources = {
  customers: { list: listCustomers, save: saveCustomer, remove: async (id: number) => useDatabase().update(customers).set({ deletedAt: new Date() }).where(eq(customers.id, id)) },
  products: { list: listProducts, save: saveProduct, remove: async (id: number) => useDatabase().update(products).set({ deletedAt: new Date() }).where(eq(products.id, id)) },
  bookings: { list: listBookings, save: saveBooking, remove: async (id: number) => useDatabase().delete(appointments).where(eq(appointments.id, id)) },
  employees: { list: listEmployees, save: saveEmployee, remove: async (id: number) => useDatabase().update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id)) },
  posts: { list: listPosts, save: savePost, remove: async (id: number) => useDatabase().update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id)) },
} satisfies Record<Resource, { list: () => Promise<Record<string, unknown>[]>; save: (id: number | null, body: Payload) => Promise<unknown>; remove: (id: number) => Promise<unknown> }>

export function getAdminResource(value: string | undefined) {
  if (!value || !(value in adminResources)) throw createError({ statusCode: 404, statusMessage: 'Phân hệ không tồn tại.' })
  return adminResources[value as Resource]
}

export function resourceId(value: string | undefined) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ.' })
  return id
}
