import { getAdminResource } from '../../services/admin-resources'

type Row = Record<string, string | number>

export default defineEventHandler(async () => {
  const [bookings, products, customers] = await Promise.all([
    getAdminResource('bookings').list() as Promise<Row[]>,
    getAdminResource('products').list() as Promise<Row[]>,
    getAdminResource('customers').list() as Promise<Row[]>,
  ])
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
  const todayBookings = bookings.filter(item => item.date === today)
  const confirmed = todayBookings.filter(item => item.status === 'Đã xác nhận').length
  const inService = todayBookings.filter(item => item.status === 'Đang phục vụ' || item.status === 'Đã đến').length
  const revenue = todayBookings.filter(item => item.status === 'Đã hoàn tất').reduce((sum, item) => sum + Number(item.total ?? 0), 0)
  const lowStock = products.filter(item => Number(item.stock) <= 10).slice(0, 5)

  return {
    data: {
      stats: [
        { label: 'Lịch hôm nay', value: String(todayBookings.length).padStart(2, '0'), note: `${confirmed} lịch đã xác nhận` },
        { label: 'Khách đang phục vụ', value: String(inService).padStart(2, '0'), note: 'Cập nhật theo trạng thái lịch' },
        { label: 'Doanh thu hôm nay', value: `${new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(revenue)}đ`, note: 'Từ các lịch đã hoàn tất' },
        { label: 'Sản phẩm sắp hết', value: String(lowStock.length).padStart(2, '0'), note: 'Tồn kho từ 10 sản phẩm trở xuống' },
      ],
      appointments: todayBookings.filter(item => String(item.time) >= new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })).sort((a, b) => String(a.time).localeCompare(String(b.time))).slice(0, 4),
      lowStock,
      customers: customers.slice(0, 4),
    },
  }
})
