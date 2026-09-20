import { getAvailability, parseBookingDate } from '../../services/customer-bookings'
import { checkPublicRateLimit } from '../../utils/public-rate-limit'

export default defineEventHandler(async (event) => {
  await checkPublicRateLimit(event, 'booking-availability', 120, 60 * 60_000)
  const query = getQuery(event)
  const branchId = Number(query.branchId)
  const serviceId = Number(query.serviceId)
  const employeeId = query.employeeId ? Number(query.employeeId) : undefined
  parseBookingDate(query.date)
  if (!Number.isInteger(branchId) || !Number.isInteger(serviceId) || (employeeId !== undefined && !Number.isInteger(employeeId))) throw createError({ statusCode: 422, statusMessage: 'Thông tin tìm lịch trống chưa hợp lệ.' })
  return { data: await getAvailability({ branchId, serviceId, date: String(query.date), employeeId }) }
})
