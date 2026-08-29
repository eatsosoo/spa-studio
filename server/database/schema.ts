import {
  bigint,
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

const id = () => bigint({ mode: 'number', unsigned: true }).autoincrement().primaryKey()
const money = (name: string) => decimal(name, { precision: 14, scale: 2 })
const inventoryQuantity = (name: string) => decimal(name, { precision: 14, scale: 3 })
const createdAt = () => timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
const updatedAt = () => timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow().notNull()

export const branches = mysqlTable('branches', {
  id: id(),
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 190 }),
  addressLine: varchar('address_line', { length: 255 }),
  ward: varchar('ward', { length: 100 }),
  district: varchar('district', { length: 100 }),
  province: varchar('province', { length: 100 }),
  country: varchar('country', { length: 2 }).default('VN').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Bangkok').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('branches_code_unique').on(table.code)])

export const users = mysqlTable('users', {
  id: id(),
  username: varchar('username', { length: 80 }).notNull(),
  email: varchar('email', { length: 190 }),
  phone: varchar('phone', { length: 30 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['pending', 'active', 'locked', 'disabled']).default('active').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { mode: 'date' }),
  phoneVerifiedAt: timestamp('phone_verified_at', { mode: 'date' }),
  failedLoginAttempts: int('failed_login_attempts', { unsigned: true }).default(0).notNull(),
  lockedUntil: timestamp('locked_until', { mode: 'date' }),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  passwordChangedAt: timestamp('password_changed_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  uniqueIndex('users_username_unique').on(table.username),
  uniqueIndex('users_email_unique').on(table.email),
  uniqueIndex('users_phone_unique').on(table.phone),
  index('users_status_idx').on(table.status),
])

export const roles = mysqlTable('roles', {
  id: id(),
  code: varchar('code', { length: 80 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: varchar('description', { length: 255 }),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('roles_code_unique').on(table.code)])

export const permissions = mysqlTable('permissions', {
  id: id(),
  code: varchar('code', { length: 120 }).notNull(),
  module: varchar('module', { length: 60 }).notNull(),
  action: varchar('action', { length: 40 }).notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex('permissions_code_unique').on(table.code),
  index('permissions_module_idx').on(table.module),
])

export const userRoles = mysqlTable('user_roles', {
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: bigint('role_id', { mode: 'number', unsigned: true }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id, { onDelete: 'cascade' }),
  assignedAt: createdAt(),
}, (table) => [primaryKey({ columns: [table.userId, table.roleId, table.branchId] })])

export const rolePermissions = mysqlTable('role_permissions', {
  roleId: bigint('role_id', { mode: 'number', unsigned: true }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: bigint('permission_id', { mode: 'number', unsigned: true }).notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })])

export const authSessions = mysqlTable('auth_sessions', {
  id: id(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { mode: 'date' }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { mode: 'date' }),
  revokeReason: varchar('revoke_reason', { length: 120 }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
  index('auth_sessions_user_expires_idx').on(table.userId, table.expiresAt),
])

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: id(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: createdAt(),
}, (table) => [uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash)])

export const employees = mysqlTable('employees', {
  id: id(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id),
  code: varchar('code', { length: 30 }).notNull(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 190 }),
  gender: mysqlEnum('gender', ['female', 'male', 'other']),
  dateOfBirth: date('date_of_birth', { mode: 'string' }),
  address: varchar('address', { length: 255 }),
  identityNumber: varchar('identity_number', { length: 30 }),
  hireDate: date('hire_date', { mode: 'string' }).notNull(),
  terminationDate: date('termination_date', { mode: 'string' }),
  jobTitle: varchar('job_title', { length: 100 }),
  employmentType: mysqlEnum('employment_type', ['full_time', 'part_time', 'contract']).default('full_time').notNull(),
  status: mysqlEnum('status', ['active', 'on_leave', 'terminated']).default('active').notNull(),
  emergencyContact: varchar('emergency_contact', { length: 150 }),
  emergencyPhone: varchar('emergency_phone', { length: 30 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  uniqueIndex('employees_user_unique').on(table.userId),
  uniqueIndex('employees_code_unique').on(table.code),
  index('employees_branch_status_idx').on(table.branchId, table.status),
])

export const employeeSalaryConfigs = mysqlTable('employee_salary_configs', {
  id: id(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull().references(() => employees.id, { onDelete: 'cascade' }),
  salaryType: mysqlEnum('salary_type', ['monthly', 'daily', 'hourly']).default('monthly').notNull(),
  baseSalary: money('base_salary').default('0').notNull(),
  hourlyRate: money('hourly_rate').default('0').notNull(),
  overtimeRate: money('overtime_rate').default('0').notNull(),
  serviceCommissionRate: decimal('service_commission_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  productCommissionRate: decimal('product_commission_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
  effectiveTo: date('effective_to', { mode: 'string' }),
  createdAt: createdAt(),
}, (table) => [index('salary_configs_employee_effective_idx').on(table.employeeId, table.effectiveFrom)])

export const customers = mysqlTable('customers', {
  id: id(),
  code: varchar('code', { length: 30 }).notNull(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  phone: varchar('phone', { length: 30 }).notNull(),
  email: varchar('email', { length: 190 }),
  gender: mysqlEnum('gender', ['female', 'male', 'other']),
  dateOfBirth: date('date_of_birth', { mode: 'string' }),
  address: varchar('address', { length: 255 }),
  source: varchar('source', { length: 80 }),
  loyaltyPoints: int('loyalty_points').default(0).notNull(),
  totalSpent: money('total_spent').default('0').notNull(),
  notes: text('notes'),
  marketingConsent: boolean('marketing_consent').default(false).notNull(),
  status: mysqlEnum('status', ['active', 'inactive', 'blocked']).default('active').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  uniqueIndex('customers_code_unique').on(table.code),
  uniqueIndex('customers_phone_unique').on(table.phone),
  index('customers_name_idx').on(table.fullName),
])

export const serviceCategories = mysqlTable('service_categories', {
  id: id(),
  parentId: bigint('parent_id', { mode: 'number', unsigned: true }),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  sortOrder: int('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('service_categories_slug_unique').on(table.slug)])

export const services = mysqlTable('services', {
  id: id(),
  categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(() => serviceCategories.id, { onDelete: 'set null' }),
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 180 }).notNull(),
  description: text('description'),
  durationMinutes: int('duration_minutes', { unsigned: true }).notNull(),
  bufferMinutes: int('buffer_minutes', { unsigned: true }).default(0).notNull(),
  price: money('price').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  uniqueIndex('services_code_unique').on(table.code),
  uniqueIndex('services_slug_unique').on(table.slug),
])

export const productCategories = mysqlTable('product_categories', {
  id: id(),
  parentId: bigint('parent_id', { mode: 'number', unsigned: true }),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  sortOrder: int('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('product_categories_slug_unique').on(table.slug)])

export const products = mysqlTable('products', {
  id: id(),
  categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(() => productCategories.id, { onDelete: 'set null' }),
  sku: varchar('sku', { length: 60 }).notNull(),
  barcode: varchar('barcode', { length: 80 }),
  name: varchar('name', { length: 180 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull(),
  shortDescription: varchar('short_description', { length: 500 }),
  description: text('description'),
  unit: varchar('unit', { length: 30 }).default('sản phẩm').notNull(),
  costPrice: money('cost_price').default('0').notNull(),
  salePrice: money('sale_price').notNull(),
  trackInventory: boolean('track_inventory').default(true).notNull(),
  status: mysqlEnum('status', ['draft', 'active', 'inactive', 'out_of_stock']).default('draft').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  uniqueIndex('products_sku_unique').on(table.sku),
  uniqueIndex('products_barcode_unique').on(table.barcode),
  uniqueIndex('products_slug_unique').on(table.slug),
  index('products_category_status_idx').on(table.categoryId, table.status),
])

export const inventoryLocations = mysqlTable('inventory_locations', {
  id: id(),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id),
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex('inventory_locations_code_unique').on(table.code)])

export const inventoryDocuments = mysqlTable('inventory_documents', {
  id: id(),
  reference: varchar('reference', { length: 40 }).notNull(),
  type: mysqlEnum('type', ['receipt', 'adjustment', 'transfer']).notNull(),
  status: mysqlEnum('status', ['draft', 'posted', 'cancelled']).default('draft').notNull(),
  sourceLocationId: bigint('source_location_id', { mode: 'number', unsigned: true }).references(() => inventoryLocations.id),
  destinationLocationId: bigint('destination_location_id', { mode: 'number', unsigned: true }).references(() => inventoryLocations.id),
  supplierName: varchar('supplier_name', { length: 180 }),
  invoiceNumber: varchar('invoice_number', { length: 80 }),
  note: varchar('note', { length: 500 }),
  occurredAt: timestamp('occurred_at', { mode: 'date' }).notNull(),
  createdBy: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  postedBy: bigint('posted_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  postedAt: timestamp('posted_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('inventory_documents_reference_unique').on(table.reference),
  index('inventory_documents_status_occurred_idx').on(table.status, table.occurredAt),
  index('inventory_documents_type_occurred_idx').on(table.type, table.occurredAt),
])

export const inventoryDocumentItems = mysqlTable('inventory_document_items', {
  id: id(),
  documentId: bigint('document_id', { mode: 'number', unsigned: true }).notNull().references(() => inventoryDocuments.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number', unsigned: true }).notNull().references(() => products.id),
  direction: mysqlEnum('direction', ['increase', 'decrease']),
  quantity: inventoryQuantity('quantity').notNull(),
  unitCost: money('unit_cost'),
  reasonCode: varchar('reason_code', { length: 60 }),
  batchNumber: varchar('batch_number', { length: 80 }),
  expiryDate: date('expiry_date', { mode: 'string' }),
  note: varchar('note', { length: 500 }),
}, (table) => [
  index('inventory_document_items_document_idx').on(table.documentId),
  index('inventory_document_items_product_idx').on(table.productId),
])

export const inventoryStocks = mysqlTable('inventory_stocks', {
  productId: bigint('product_id', { mode: 'number', unsigned: true }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  locationId: bigint('location_id', { mode: 'number', unsigned: true }).notNull().references(() => inventoryLocations.id, { onDelete: 'cascade' }),
  quantity: inventoryQuantity('quantity').default('0').notNull(),
  reservedQuantity: inventoryQuantity('reserved_quantity').default('0').notNull(),
  minQuantity: inventoryQuantity('min_quantity').default('0').notNull(),
  updatedAt: updatedAt(),
}, (table) => [primaryKey({ columns: [table.productId, table.locationId] })])

export const inventoryTransactions = mysqlTable('inventory_transactions', {
  id: id(),
  documentItemId: bigint('document_item_id', { mode: 'number', unsigned: true }).references(() => inventoryDocumentItems.id),
  productId: bigint('product_id', { mode: 'number', unsigned: true }).notNull().references(() => products.id),
  locationId: bigint('location_id', { mode: 'number', unsigned: true }).notNull().references(() => inventoryLocations.id),
  type: mysqlEnum('type', ['opening', 'purchase', 'sale', 'service_usage', 'adjustment', 'transfer_in', 'transfer_out', 'return']).notNull(),
  quantityDelta: inventoryQuantity('quantity_delta').notNull(),
  quantityAfter: inventoryQuantity('quantity_after').notNull(),
  unitCost: money('unit_cost'),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: bigint('reference_id', { mode: 'number', unsigned: true }),
  note: varchar('note', { length: 500 }),
  performedBy: bigint('performed_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (table) => [
  index('inventory_transactions_product_location_idx').on(table.productId, table.locationId, table.createdAt),
  index('inventory_transactions_reference_idx').on(table.referenceType, table.referenceId),
  uniqueIndex('inventory_transactions_document_item_unique').on(table.documentItemId, table.locationId, table.type),
  uniqueIndex('inventory_transactions_source_unique').on(table.referenceType, table.referenceId, table.locationId, table.type),
])

export const promotions = mysqlTable('promotions', {
  id: id(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  discountType: mysqlEnum('discount_type', ['percent', 'fixed_amount']).notNull(),
  discountValue: money('discount_value').notNull(),
  maxDiscountAmount: money('max_discount_amount'),
  minOrderAmount: money('min_order_amount').default('0').notNull(),
  usageLimit: int('usage_limit', { unsigned: true }),
  perCustomerLimit: int('per_customer_limit', { unsigned: true }),
  startsAt: timestamp('starts_at', { mode: 'date' }).notNull(),
  endsAt: timestamp('ends_at', { mode: 'date' }).notNull(),
  isAutomatic: boolean('is_automatic').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('promotions_code_unique').on(table.code),
  index('promotions_active_period_idx').on(table.isActive, table.startsAt, table.endsAt),
])

export const promotionProducts = mysqlTable('promotion_products', {
  promotionId: bigint('promotion_id', { mode: 'number', unsigned: true }).notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number', unsigned: true }).notNull().references(() => products.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.promotionId, table.productId] })])

export const promotionServices = mysqlTable('promotion_services', {
  promotionId: bigint('promotion_id', { mode: 'number', unsigned: true }).notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  serviceId: bigint('service_id', { mode: 'number', unsigned: true }).notNull().references(() => services.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.promotionId, table.serviceId] })])

export const coupons = mysqlTable('coupons', {
  id: id(),
  promotionId: bigint('promotion_id', { mode: 'number', unsigned: true }).notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 60 }).notNull(),
  usageLimit: int('usage_limit', { unsigned: true }),
  usedCount: int('used_count', { unsigned: true }).default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex('coupons_code_unique').on(table.code)])

export const appointments = mysqlTable('appointments', {
  id: id(),
  reference: varchar('reference', { length: 30 }).notNull(),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id),
  customerId: bigint('customer_id', { mode: 'number', unsigned: true }).references(() => customers.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 150 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 30 }).notNull(),
  startsAt: timestamp('starts_at', { mode: 'date' }).notNull(),
  endsAt: timestamp('ends_at', { mode: 'date' }).notNull(),
  status: mysqlEnum('status', ['pending', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show']).default('pending').notNull(),
  source: mysqlEnum('source', ['website', 'phone', 'walk_in', 'admin']).default('website').notNull(),
  subtotal: money('subtotal').default('0').notNull(),
  discountAmount: money('discount_amount').default('0').notNull(),
  totalAmount: money('total_amount').default('0').notNull(),
  promotionId: bigint('promotion_id', { mode: 'number', unsigned: true }).references(() => promotions.id, { onDelete: 'set null' }),
  couponId: bigint('coupon_id', { mode: 'number', unsigned: true }).references(() => coupons.id, { onDelete: 'set null' }),
  notes: text('notes'),
  cancellationReason: varchar('cancellation_reason', { length: 500 }),
  createdBy: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('appointments_reference_unique').on(table.reference),
  index('appointments_branch_start_idx').on(table.branchId, table.startsAt),
  index('appointments_customer_idx').on(table.customerId, table.startsAt),
  index('appointments_status_idx').on(table.status),
])

export const appointmentServices = mysqlTable('appointment_services', {
  id: id(),
  appointmentId: bigint('appointment_id', { mode: 'number', unsigned: true }).notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  serviceId: bigint('service_id', { mode: 'number', unsigned: true }).notNull().references(() => services.id),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).references(() => employees.id, { onDelete: 'set null' }),
  serviceName: varchar('service_name', { length: 150 }).notNull(),
  durationMinutes: int('duration_minutes', { unsigned: true }).notNull(),
  unitPrice: money('unit_price').notNull(),
  discountAmount: money('discount_amount').default('0').notNull(),
  finalPrice: money('final_price').notNull(),
  commissionAmount: money('commission_amount').default('0').notNull(),
  status: mysqlEnum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled').notNull(),
  startedAt: timestamp('started_at', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
}, (table) => [
  index('appointment_services_appointment_idx').on(table.appointmentId),
  index('appointment_services_employee_idx').on(table.employeeId),
])

export const attendanceRecords = mysqlTable('attendance_records', {
  id: id(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull().references(() => employees.id),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id),
  workDate: date('work_date', { mode: 'string' }).notNull(),
  shiftStart: time('shift_start'),
  shiftEnd: time('shift_end'),
  checkInAt: timestamp('check_in_at', { mode: 'date' }),
  checkOutAt: timestamp('check_out_at', { mode: 'date' }),
  regularMinutes: int('regular_minutes', { unsigned: true }).default(0).notNull(),
  overtimeMinutes: int('overtime_minutes', { unsigned: true }).default(0).notNull(),
  lateMinutes: int('late_minutes', { unsigned: true }).default(0).notNull(),
  status: mysqlEnum('status', ['present', 'absent', 'leave', 'holiday']).default('present').notNull(),
  note: varchar('note', { length: 500 }),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('attendance_employee_date_unique').on(table.employeeId, table.workDate),
  index('attendance_branch_date_idx').on(table.branchId, table.workDate),
])

export const payrollPeriods = mysqlTable('payroll_periods', {
  id: id(),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id),
  name: varchar('name', { length: 100 }).notNull(),
  startsOn: date('starts_on', { mode: 'string' }).notNull(),
  endsOn: date('ends_on', { mode: 'string' }).notNull(),
  status: mysqlEnum('status', ['draft', 'calculated', 'approved', 'paid', 'cancelled']).default('draft').notNull(),
  approvedBy: bigint('approved_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('payroll_period_branch_dates_unique').on(table.branchId, table.startsOn, table.endsOn)])

export const payrolls = mysqlTable('payrolls', {
  id: id(),
  periodId: bigint('period_id', { mode: 'number', unsigned: true }).notNull().references(() => payrollPeriods.id, { onDelete: 'cascade' }),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull().references(() => employees.id),
  baseSalary: money('base_salary').default('0').notNull(),
  attendanceAmount: money('attendance_amount').default('0').notNull(),
  overtimeAmount: money('overtime_amount').default('0').notNull(),
  serviceCommission: money('service_commission').default('0').notNull(),
  productCommission: money('product_commission').default('0').notNull(),
  bonusAmount: money('bonus_amount').default('0').notNull(),
  deductionAmount: money('deduction_amount').default('0').notNull(),
  grossAmount: money('gross_amount').default('0').notNull(),
  netAmount: money('net_amount').default('0').notNull(),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  note: text('note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('payrolls_period_employee_unique').on(table.periodId, table.employeeId)])

export const payrollItems = mysqlTable('payroll_items', {
  id: id(),
  payrollId: bigint('payroll_id', { mode: 'number', unsigned: true }).notNull().references(() => payrolls.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['earning', 'deduction']).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).default('1').notNull(),
  rate: money('rate').default('0').notNull(),
  amount: money('amount').notNull(),
  metadata: json('metadata'),
  createdAt: createdAt(),
}, (table) => [index('payroll_items_payroll_idx').on(table.payrollId)])

export const salesOrders = mysqlTable('sales_orders', {
  id: id(),
  reference: varchar('reference', { length: 30 }).notNull(),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).notNull().references(() => branches.id),
  inventoryLocationId: bigint('inventory_location_id', { mode: 'number', unsigned: true }).references(() => inventoryLocations.id),
  customerId: bigint('customer_id', { mode: 'number', unsigned: true }).references(() => customers.id, { onDelete: 'set null' }),
  status: mysqlEnum('status', ['draft', 'confirmed', 'paid', 'cancelled', 'refunded']).default('draft').notNull(),
  subtotal: money('subtotal').default('0').notNull(),
  discountAmount: money('discount_amount').default('0').notNull(),
  totalAmount: money('total_amount').default('0').notNull(),
  promotionId: bigint('promotion_id', { mode: 'number', unsigned: true }).references(() => promotions.id, { onDelete: 'set null' }),
  couponId: bigint('coupon_id', { mode: 'number', unsigned: true }).references(() => coupons.id, { onDelete: 'set null' }),
  soldBy: bigint('sold_by', { mode: 'number', unsigned: true }).references(() => employees.id, { onDelete: 'set null' }),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('sales_orders_reference_unique').on(table.reference),
  index('sales_orders_branch_created_idx').on(table.branchId, table.createdAt),
])

export const salesOrderItems = mysqlTable('sales_order_items', {
  id: id(),
  orderId: bigint('order_id', { mode: 'number', unsigned: true }).notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number', unsigned: true }).references(() => products.id, { onDelete: 'set null' }),
  sku: varchar('sku', { length: 60 }).notNull(),
  productName: varchar('product_name', { length: 180 }).notNull(),
  quantity: int('quantity', { unsigned: true }).notNull(),
  unitPrice: money('unit_price').notNull(),
  discountAmount: money('discount_amount').default('0').notNull(),
  totalAmount: money('total_amount').notNull(),
  commissionAmount: money('commission_amount').default('0').notNull(),
}, (table) => [index('sales_order_items_order_idx').on(table.orderId)])

export const couponRedemptions = mysqlTable('coupon_redemptions', {
  id: id(),
  couponId: bigint('coupon_id', { mode: 'number', unsigned: true }).notNull().references(() => coupons.id),
  customerId: bigint('customer_id', { mode: 'number', unsigned: true }).references(() => customers.id, { onDelete: 'set null' }),
  appointmentId: bigint('appointment_id', { mode: 'number', unsigned: true }).references(() => appointments.id, { onDelete: 'set null' }),
  orderId: bigint('order_id', { mode: 'number', unsigned: true }).references(() => salesOrders.id, { onDelete: 'set null' }),
  discountAmount: money('discount_amount').notNull(),
  redeemedAt: createdAt(),
}, (table) => [
  index('coupon_redemptions_coupon_idx').on(table.couponId),
  index('coupon_redemptions_customer_idx').on(table.customerId),
])

export const postCategories = mysqlTable('post_categories', {
  id: id(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('post_categories_slug_unique').on(table.slug)])

export const posts = mysqlTable('posts', {
  id: id(),
  categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(() => postCategories.id, { onDelete: 'set null' }),
  authorId: bigint('author_id', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 250 }).notNull(),
  slug: varchar('slug', { length: 280 }).notNull(),
  excerpt: varchar('excerpt', { length: 500 }),
  content: text('content').notNull(),
  featuredImageUrl: varchar('featured_image_url', { length: 500 }),
  status: mysqlEnum('status', ['draft', 'published', 'archived']).default('draft').notNull(),
  publishedAt: timestamp('published_at', { mode: 'date' }),
  metaTitle: varchar('meta_title', { length: 250 }),
  metaDescription: varchar('meta_description', { length: 500 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  uniqueIndex('posts_slug_unique').on(table.slug),
  index('posts_status_published_idx').on(table.status, table.publishedAt),
])

export const systemSettings = mysqlTable('system_settings', {
  id: id(),
  branchId: bigint('branch_id', { mode: 'number', unsigned: true }).references(() => branches.id, { onDelete: 'cascade' }),
  group: varchar('group', { length: 60 }).default('general').notNull(),
  key: varchar('key', { length: 120 }).notNull(),
  value: json('value').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  description: varchar('description', { length: 255 }),
  updatedBy: bigint('updated_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('system_settings_scope_key_unique').on(table.branchId, table.key),
  index('system_settings_group_idx').on(table.group),
])

export const auditLogs = mysqlTable('audit_logs', {
  id: id(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: varchar('entity_id', { length: 80 }),
  oldValues: json('old_values'),
  newValues: json('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: createdAt(),
}, (table) => [
  index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  index('audit_logs_user_created_idx').on(table.userId, table.createdAt),
])
