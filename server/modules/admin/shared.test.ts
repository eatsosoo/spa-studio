import { describe, expect, it } from 'vitest'
import {
  dateInput,
  imageSource,
  insertedId,
  numberValue,
  reverseStatus,
  slugify,
  statusValue,
  textValue,
  timeInput,
} from './shared'

describe('admin shared helpers', () => {
  it('trims required text and returns null for an empty optional value', () => {
    expect(textValue({ name: '  An Nhiên  ' }, 'name')).toBe('An Nhiên')
    expect(textValue({ note: '   ' }, 'note', false)).toBeNull()
  })

  it('rejects missing required text', () => {
    expect(() => textValue({}, 'name')).toThrowError(/name/)
  })

  it('normalizes valid numbers', () => {
    expect(numberValue({ price: '1250.6' }, 'price')).toBe(1251)
    expect(numberValue({ price: 0 }, 'price')).toBe(0)
  })

  it.each([-1, 'không phải số', Number.POSITIVE_INFINITY])('rejects invalid number %s', (price) => {
    expect(() => numberValue({ price }, 'price')).toThrowError(/price/)
  })

  it('accepts local and HTTP image sources', () => {
    expect(imageSource({ image: '/images/product.png' }, 'image')).toBe('/images/product.png')
    expect(imageSource({ image: 'https://cdn.example.com/product.png' }, 'image')).toBe('https://cdn.example.com/product.png')
  })

  it.each(['javascript:alert(1)', 'ftp://example.com/file.png', 'product.png'])('rejects unsafe image source %s', (image) => {
    expect(() => imageSource({ image }, 'image')).toThrowError(/Hình ảnh/)
  })

  it('maps display statuses and uses the configured fallback', () => {
    const statuses = { Active: 'active', Hidden: 'hidden' } as const
    expect(statusValue({ status: 'Hidden' }, 'status', statuses, 'active')).toBe('hidden')
    expect(statusValue({ status: 'Unknown' }, 'status', statuses, 'active')).toBe('active')
    expect(reverseStatus(statuses, 'hidden')).toBe('Hidden')
    expect(reverseStatus(statuses, 'missing')).toBe('missing')
  })

  it('creates stable URL slugs from Vietnamese text', () => {
    expect(slugify('  Liệu Trình Đá Nóng & Thảo Mộc  ')).toBe('lieu-trinh-da-nong-thao-moc')
  })

  it('formats booking dates in the configured business timezone', () => {
    const value = new Date('2026-09-06T03:30:00.000Z')
    expect(dateInput(value)).toBe('2026-09-06')
    expect(timeInput(value)).toBe('10:30')
  })

  it('extracts inserted IDs and rejects an empty insert result', () => {
    expect(insertedId({ id: 42 })).toBe(42)
    expect(() => insertedId(undefined)).toThrowError(/Không thể tạo/)
  })
})
