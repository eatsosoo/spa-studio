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
