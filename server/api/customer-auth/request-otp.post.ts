export default defineEventHandler(() => {
  throw createError({ statusCode: 410, statusMessage: 'Đăng nhập OTP đã ngừng sử dụng. Vui lòng đăng nhập bằng mật khẩu.' })
})
