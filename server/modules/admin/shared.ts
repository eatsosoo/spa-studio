export type AdminPayload = Record<string, unknown>

export type AdminResource = {
  list: () => Promise<Record<string, unknown>[]>
  save: (id: number | null, body: AdminPayload) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}

export const reverseStatus = (map: Record<string, string>, value: string) =>
  Object.entries(map).find(([, stored]) => stored === value)?.[0] ?? value

export function textValue(body: AdminPayload, key: string, required = true) {
  const value = String(body[key] ?? '').trim()
  if (required && !value) {
    throw createError({ statusCode: 422, statusMessage: `Trường ${key} là bắt buộc.` })
  }
  return value || null
}

export function numberValue(body: AdminPayload, key: string) {
  const value = Number(body[key] ?? 0)
  if (!Number.isFinite(value) || value < 0) {
    throw createError({ statusCode: 422, statusMessage: `Trường ${key} không hợp lệ.` })
  }
  return Math.round(value)
}

export function imageSource(body: AdminPayload, key: string) {
  const value = textValue(body, key)!
  if (value.startsWith('/')) return value
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return value
  } catch {
    // The validation error below gives the client a consistent response.
  }
  throw createError({ statusCode: 422, statusMessage: 'Hình ảnh phải là URL http/https hoặc đường dẫn bắt đầu bằng /.' })
}

export function statusValue<T extends Record<string, string>>(
  body: AdminPayload,
  key: string,
  map: T,
  fallback: T[keyof T],
) {
  const label = String(body[key] ?? '')
  return (map[label] ?? fallback) as T[keyof T]
}

export const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export const dateVi = (value: Date | string | null) =>
  value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : 'Chưa có'

export const dateInput = (value: Date | string) =>
  new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })

export const timeInput = (value: Date | string) =>
  new Date(value).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  })

export function insertedId(row: { id: number } | undefined) {
  if (!row) throw createError({ statusCode: 500, statusMessage: 'Không thể tạo bản ghi mới.' })
  return row.id
}
