import { describe, expect, it } from 'vitest'
import { getDailyBookingSchedule } from '../modules/admin/resources/bookings'
import { adminResources, getAdminResource, resourceId } from './admin-resources'

describe('admin resource registry', () => {
  it('registers every supported backend module', () => {
    expect(Object.keys(adminResources)).toEqual(['customers', 'products', 'services', 'bookings', 'employees', 'posts'])
    for (const resource of Object.values(adminResources)) {
      expect(resource).toMatchObject({ list: expect.any(Function), save: expect.any(Function), remove: expect.any(Function) })
    }
  })

  it('resolves known resources and rejects unknown ones', () => {
    expect(getAdminResource('products')).toBe(adminResources.products)
    expect(() => getAdminResource('payments')).toThrowError(/Phân hệ không tồn tại/)
    expect(() => getAdminResource(undefined)).toThrowError(/Phân hệ không tồn tại/)
  })

  it.each([['12', 12], ['1', 1]])('parses resource ID %s', (value, expected) => {
    expect(resourceId(value)).toBe(expected)
  })

  it.each([undefined, '', '0', '-1', '1.5', 'abc'])('rejects invalid resource ID %s', (value) => {
    expect(() => resourceId(value)).toThrowError(/ID không hợp lệ/)
  })

  it.each(['06-09-2026', '2026-02-30', 'not-a-date'])('rejects an invalid schedule date before querying the database: %s', async (value) => {
    await expect(getDailyBookingSchedule(value)).rejects.toThrowError(/Ngày xem lịch không hợp lệ/)
  })
})
