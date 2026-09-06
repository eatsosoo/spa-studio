import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { paginateRows, paginationQuery } from './pagination'

const event = {} as H3Event

describe('pagination utilities', () => {
  beforeEach(() => {
    vi.stubGlobal('getQuery', vi.fn(() => ({})))
  })

  it('uses safe defaults for invalid pagination input', () => {
    vi.mocked(getQuery).mockReturnValue({ page: '-2', pageSize: 'invalid' })
    expect(paginationQuery(event, 20)).toEqual({ page: 1, pageSize: 20, search: '', filterField: '', filterValue: '' })
  })

  it('caps the page size at 100', () => {
    vi.mocked(getQuery).mockReturnValue({ page: '2', pageSize: '999' })
    expect(paginationQuery(event)).toMatchObject({ page: 2, pageSize: 100 })
  })

  it('searches case-insensitively across row values', () => {
    vi.mocked(getQuery).mockReturnValue({ search: '  SEN  ', pageSize: '10' })
    const result = paginateRows([
      { id: 1, name: 'Tinh dầu Sen' },
      { id: 2, name: 'Đá nóng' },
    ], event)
    expect(result.data).toEqual([{ id: 1, name: 'Tinh dầu Sen' }])
    expect(result.meta.total).toBe(1)
  })

  it('filters by an exact field value', () => {
    vi.mocked(getQuery).mockReturnValue({ filterField: 'status', filterValue: 'active' })
    const result = paginateRows([
      { id: 1, status: 'active' },
      { id: 2, status: 'inactive' },
    ], event)
    expect(result.data).toEqual([{ id: 1, status: 'active' }])
  })

  it('clamps an out-of-range page and returns correct metadata', () => {
    vi.mocked(getQuery).mockReturnValue({ page: '99', pageSize: '2' })
    const result = paginateRows([{ id: 1 }, { id: 2 }, { id: 3 }], event)
    expect(result).toEqual({
      data: [{ id: 3 }],
      meta: { page: 2, pageSize: 2, total: 3, totalPages: 2, from: 3, to: 3 },
    })
  })

  it('returns consistent metadata for an empty result', () => {
    const result = paginateRows([], event)
    expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 0, totalPages: 1, from: 0, to: 0 })
  })
})
