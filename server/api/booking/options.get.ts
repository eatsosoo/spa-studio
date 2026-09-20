import { getPublicBookingOptions } from '../../services/customer-bookings'

export default defineEventHandler(async () => ({ data: await getPublicBookingOptions() }))
