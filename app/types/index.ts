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
  status: 'Đang bán' | 'Sắp hết' | 'Tạm ẩn'
  image: string
  imagePosition: string
  benefits: string[]
  ingredients: string
  usage: string
}

export type AdminRow = Record<string, string | number>

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
