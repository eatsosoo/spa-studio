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

  if (!body.name?.trim() || !/^(\+84|0)\d{9}$/.test(phone)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Thông tin đặt lịch chưa hợp lệ.',
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 650))

  return {
    ok: true,
    reference: `MIEN-${Date.now().toString().slice(-6)}`,
    message: 'MIÊN đã nhận yêu cầu và sẽ gọi lại để xác nhận khung giờ.',
  }
})
