import type { H3Event } from 'h3'

type Row = Record<string, unknown>

const positiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function paginationQuery(event: H3Event, defaultPageSize = 10) {
  const query = getQuery(event)
  return {
    page: positiveInteger(query.page, 1),
    pageSize: Math.min(100, positiveInteger(query.pageSize, defaultPageSize)),
    search: String(query.search ?? '').trim().toLocaleLowerCase('vi'),
    filterField: String(query.filterField ?? '').trim(),
    filterValue: String(query.filterValue ?? '').trim(),
  }
}

export function paginateRows(rows: Row[], event: H3Event, defaultPageSize = 10) {
  const query = paginationQuery(event, defaultPageSize)
  const filtered = rows.filter((row) => {
    const matchesSearch = !query.search || Object.values(row).some(value => String(value ?? '').toLocaleLowerCase('vi').includes(query.search))
    const matchesFilter = !query.filterField || String(row[query.filterField] ?? '') === query.filterValue
    return matchesSearch && matchesFilter
  })
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const page = Math.min(query.page, totalPages)
  const offset = (page - 1) * query.pageSize

  return {
    data: filtered.slice(offset, offset + query.pageSize),
    meta: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
      from: total ? offset + 1 : 0,
      to: Math.min(offset + query.pageSize, total),
    },
  }
}
