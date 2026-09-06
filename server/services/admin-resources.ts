import { bookingResource, getDailyBookingSchedule } from '../modules/admin/resources/bookings'
import { customerResource } from '../modules/admin/resources/customers'
import { employeeResource } from '../modules/admin/resources/employees'
import { postResource } from '../modules/admin/resources/posts'
import { productResource } from '../modules/admin/resources/products'
import { serviceResource } from '../modules/admin/resources/services'
import type { AdminResource } from '../modules/admin/shared'

type Resource = 'customers' | 'products' | 'services' | 'bookings' | 'employees' | 'posts'

export { getDailyBookingSchedule }

export const adminResources = {
  customers: customerResource,
  products: productResource,
  services: serviceResource,
  bookings: bookingResource,
  employees: employeeResource,
  posts: postResource,
} satisfies Record<Resource, AdminResource>

export function getAdminResource(value: string | undefined) {
  if (!value || !(value in adminResources)) {
    throw createError({ statusCode: 404, statusMessage: 'Phân hệ không tồn tại.' })
  }
  return adminResources[value as Resource]
}

export function resourceId(value: string | undefined) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ.' })
  }
  return id
}
