import { getAdminResource } from '../services/admin-resources'

interface BookingPayload {
  name?: string
  phone?: string
  service?: string
  date?: string
  note?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<BookingPayload>(event)
  const phone = body.phone?.replace(/\s/g, '') ?? ''

  if (!body.name?.trim() || !body.service?.trim() || !body.date || !/^(\+84|0)\d{9}$/.test(phone)) {
    throw createError({ statusCode: 422, statusMessage: 'Thông tin đặt lịch chưa hợp lệ.' })
  }

  const result = await getAdminResource('bookings').save(null, {
    customer: body.name,
    phone,
    service: body.service,
    date: body.date,
    time: '09:00',
    status: 'Chờ xác nhận',
    note: body.note,
    source: 'website',
  }) as { reference: string }

  return {
    ok: true,
    reference: result.reference,
    message: 'MIÊN đã nhận yêu cầu và sẽ gọi lại để xác nhận khung giờ.',
  }
})
