export type Product = {
  id: number
  slug: string
  name: string
  category: string
  shortDescription: string
  description: string
  price: number
  size: string
  stock: number
  sku: string
  status: 'Đang bán' | 'Sắp hết' | 'Tạm hết hàng'
  image: string
  imagePosition: string
  benefits: string[]
  ingredients: string
  usage: string
}

export type CartLine = {
  productId: number
  quantity: number
}

export type CartProduct = Product & {
  requestedQuantity: number
  purchasableQuantity: number
  available: boolean
  message: string | null
}

export type StoreOrder = {
  reference: string
  status: string
  statusLabel: string
  paymentStatus: string
  paymentStatusLabel: string
  fulfillmentStatus: string
  fulfillmentStatusLabel: string
  customerName: string
  customerPhone: string
  shippingAddress: string
  subtotal: number
  shippingFee: number
  totalAmount: number
  createdAt: string
  items: Array<{
    id: number
    productId: number | null
    sku: string
    productName: string
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
}

export type CustomerOrderSummary = {
  id: number
  reference: string
  createdAt: string
  itemCount: number
  itemSummary: Array<{ productName: string; quantity: number }>
  totalAmount: number
  paymentMethod: string
  paymentMethodLabel: string
  paymentStatus: string
  paymentStatusLabel: string
  fulfillmentStatus: string
  fulfillmentStatusLabel: string
  status: string
  statusLabel: string
}

export type CustomerOrderDetail = CustomerOrderSummary & {
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerNote: string | null
  shippingAddressLine: string | null
  shippingWard: string | null
  shippingDistrict: string | null
  shippingProvince: string | null
  shippingAddress: string
  subtotal: number
  discountAmount: number
  shippingFee: number
  items: Array<{
    id: number
    productId: number | null
    sku: string
    productName: string
    quantity: number
    unitPrice: number
    discountAmount: number
    totalAmount: number
  }>
  history: Array<{
    id: number
    status: string
    statusLabel: string
    note: string | null
    createdAt: string
  }>
}

export type FeedbackType = 'service' | 'product'
export type FeedbackStatus = 'pending' | 'approved' | 'hidden'

export type CustomerFeedbackEligibility = {
  type: FeedbackType
  appointmentId?: number
  orderId?: number
  serviceId?: number
  productId?: number
  reference: string
  name: string
  completedAt: string
  existingFeedbackId: null
}

export type CustomerFeedback = {
  id: number
  type: FeedbackType
  rating: number
  content: string
  status: FeedbackStatus
  statusLabel: string
  subjectName: string
  reference: string
  createdAt: string
}

export type AdminFeedback = CustomerFeedback & {
  customerId: number
  customerName: string
  customerPhone: string
  customerEmail: string
  productId: number | null
  serviceId: number | null
  appointmentId: number | null
  orderId: number | null
  moderationNote: string | null
  moderatedBy: number | null
  moderatedAt: string | null
  updatedAt: string
}

export type AdminRow = Record<string, string | number>

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  from: number
  to: number
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: PaginationMeta
}

export type AdminColumn = {
  key: string
  label: string
  type?: 'text' | 'status' | 'money' | 'date' | 'number'
  align?: 'left' | 'right'
}

export type AdminFilter = {
  label: string
  field: string
  value: string
}

export type AdminFormField = {
  key: string
  label: string
  type?: 'text' | 'tel' | 'email' | 'url' | 'image' | 'number' | 'date' | 'time' | 'textarea' | 'select'
  placeholder?: string
  helper?: string
  options?: string[]
  required?: boolean
}
