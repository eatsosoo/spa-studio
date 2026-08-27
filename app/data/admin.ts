import type { AdminColumn, AdminFilter, AdminFormField, AdminRow } from '~/types'

export type AdminResourceConfig = {
  title: string
  eyebrow: string
  description: string
  addLabel: string
  searchPlaceholder: string
  singularLabel: string
  columns: AdminColumn[]
  filters: AdminFilter[]
  fields: AdminFormField[]
  rows: AdminRow[]
}

export const adminResources: Record<string, AdminResourceConfig> = {
  customers: {
    title: 'Khách hàng',
    eyebrow: 'Quan hệ khách hàng',
    description: 'Lịch sử ghé, hạng thành viên và những ghi chú cần nhớ cho lần chăm sóc tiếp theo.',
    addLabel: 'Thêm khách hàng',
    searchPlaceholder: 'Tìm theo tên hoặc số điện thoại',
    singularLabel: 'khách hàng',
    columns: [
      { key: 'name', label: 'Khách hàng' },
      { key: 'phone', label: 'Liên hệ' },
      { key: 'lastVisit', label: 'Lần ghé gần nhất', type: 'date' },
      { key: 'visits', label: 'Số lần ghé', type: 'number', align: 'right' },
      { key: 'tier', label: 'Hạng', type: 'status' },
    ],
    filters: [
      { label: 'Tất cả', field: '', value: '' },
      { label: 'Thành viên Mộc', field: 'tier', value: 'Mộc' },
      { label: 'Thành viên An', field: 'tier', value: 'An' },
      { label: 'Khách mới', field: 'tier', value: 'Khách mới' },
    ],
    fields: [
      { key: 'name', label: 'Họ và tên', placeholder: 'Tên khách hàng' },
      { key: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '090 000 0000' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'ten@email.com' },
      { key: 'tier', label: 'Hạng thành viên', type: 'select', options: ['Khách mới', 'Mộc', 'An'] },
      { key: 'note', label: 'Ghi chú chăm sóc', type: 'textarea', helper: 'Không ghi thông tin sức khỏe nhạy cảm nếu chưa có sự đồng ý.' },
    ],
    rows: [
      { id: 1, name: 'Nguyễn Minh Thư', phone: '093 842 7165', lastVisit: '24/08/2026', visits: 14, tier: 'An' },
      { id: 2, name: 'Trần Hạ Vy', phone: '090 517 4826', lastVisit: '22/08/2026', visits: 8, tier: 'Mộc' },
      { id: 3, name: 'Phạm Gia Linh', phone: '077 391 6804', lastVisit: '19/08/2026', visits: 3, tier: 'Mộc' },
      { id: 4, name: 'Lê Khánh Chi', phone: '086 425 1973', lastVisit: '18/08/2026', visits: 1, tier: 'Khách mới' },
      { id: 5, name: 'Võ Nhật Lam', phone: '091 763 2048', lastVisit: '11/08/2026', visits: 6, tier: 'Mộc' },
      { id: 6, name: 'Đặng An Khuê', phone: '038 614 9257', lastVisit: '02/08/2026', visits: 11, tier: 'An' },
    ],
  },
  products: {
    title: 'Sản phẩm',
    eyebrow: 'Kho và bán lẻ',
    description: 'Theo dõi giá bán, mức tồn và trạng thái hiển thị trên cửa hàng trực tuyến.',
    addLabel: 'Thêm sản phẩm',
    searchPlaceholder: 'Tìm tên hoặc mã SKU',
    singularLabel: 'sản phẩm',
    columns: [
      { key: 'name', label: 'Sản phẩm' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Nhóm' },
      { key: 'stock', label: 'Tồn', type: 'number', align: 'right' },
      { key: 'price', label: 'Giá bán', type: 'money', align: 'right' },
      { key: 'status', label: 'Trạng thái', type: 'status' },
    ],
    filters: [
      { label: 'Tất cả', field: '', value: '' },
      { label: 'Đang bán', field: 'status', value: 'Đang bán' },
      { label: 'Sắp hết', field: 'status', value: 'Sắp hết' },
      { label: 'Tạm ẩn', field: 'status', value: 'Tạm ẩn' },
    ],
    fields: [
      { key: 'name', label: 'Tên sản phẩm', placeholder: 'Tên hiển thị' },
      { key: 'sku', label: 'Mã SKU', placeholder: 'MN-XX-000' },
      { key: 'category', label: 'Nhóm sản phẩm', type: 'select', options: ['Chăm sóc da', 'Chăm sóc cơ thể', 'Nghi thức tại nhà'] },
      { key: 'stock', label: 'Số lượng tồn', type: 'number' },
      { key: 'price', label: 'Giá bán', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['Đang bán', 'Sắp hết', 'Tạm ẩn'] },
    ],
    rows: [
      { id: 1, name: 'Serum Sương Mai', sku: 'MN-SM-030', category: 'Chăm sóc da', stock: 18, price: 780000, status: 'Đang bán' },
      { id: 2, name: 'Dầu Cơ Thể Mộc', sku: 'MN-MC-100', category: 'Chăm sóc cơ thể', stock: 7, price: 640000, status: 'Sắp hết' },
      { id: 3, name: 'Kem Dưỡng An', sku: 'MN-KA-050', category: 'Chăm sóc da', stock: 24, price: 920000, status: 'Đang bán' },
      { id: 4, name: 'Balm Thả Lỏng', sku: 'MN-BT-045', category: 'Nghi thức tại nhà', stock: 0, price: 460000, status: 'Tạm ẩn' },
      { id: 5, name: 'Muối Ngâm Chân Tĩnh', sku: 'MN-MT-240', category: 'Nghi thức tại nhà', stock: 9, price: 390000, status: 'Sắp hết' },
    ],
  },
  bookings: {
    title: 'Đặt lịch',
    eyebrow: 'Vận hành hôm nay',
    description: 'Sắp xếp lịch trị liệu theo khách, kỹ thuật viên và trạng thái xác nhận.',
    addLabel: 'Tạo lịch hẹn',
    searchPlaceholder: 'Tìm khách, liệu trình hoặc nhân viên',
    singularLabel: 'lịch hẹn',
    columns: [
      { key: 'time', label: 'Thời gian' },
      { key: 'customer', label: 'Khách hàng' },
      { key: 'service', label: 'Liệu trình' },
      { key: 'staff', label: 'Kỹ thuật viên' },
      { key: 'room', label: 'Phòng' },
      { key: 'status', label: 'Trạng thái', type: 'status' },
    ],
    filters: [
      { label: 'Tất cả', field: '', value: '' },
      { label: 'Đã xác nhận', field: 'status', value: 'Đã xác nhận' },
      { label: 'Chờ xác nhận', field: 'status', value: 'Chờ xác nhận' },
      { label: 'Đã hoàn tất', field: 'status', value: 'Đã hoàn tất' },
    ],
    fields: [
      { key: 'customer', label: 'Khách hàng', placeholder: 'Tên khách hàng' },
      { key: 'service', label: 'Liệu trình', type: 'select', options: ['Thả lỏng toàn thân', 'Phục hồi làn da', 'Chăm sóc da đầu', 'Nghi thức đá ấm'] },
      { key: 'date', label: 'Ngày hẹn', type: 'date' },
      { key: 'time', label: 'Giờ bắt đầu', type: 'time' },
      { key: 'staff', label: 'Kỹ thuật viên', type: 'select', options: ['Bảo Ngọc', 'Thùy Dung', 'Yến Nhi', 'Mai Phương'] },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['Chờ xác nhận', 'Đã xác nhận', 'Đã hoàn tất'] },
    ],
    rows: [
      { id: 1, time: '09:15', customer: 'Nguyễn Minh Thư', service: 'Phục hồi làn da', staff: 'Bảo Ngọc', room: 'An 02', status: 'Đã hoàn tất' },
      { id: 2, time: '10:40', customer: 'Trần Hạ Vy', service: 'Thả lỏng toàn thân', staff: 'Thùy Dung', room: 'Mộc 01', status: 'Đã xác nhận' },
      { id: 3, time: '13:20', customer: 'Lê Khánh Chi', service: 'Chăm sóc da đầu', staff: 'Yến Nhi', room: 'Tĩnh 01', status: 'Chờ xác nhận' },
      { id: 4, time: '15:10', customer: 'Võ Nhật Lam', service: 'Nghi thức đá ấm', staff: 'Mai Phương', room: 'Mộc 02', status: 'Đã xác nhận' },
      { id: 5, time: '17:35', customer: 'Phạm Gia Linh', service: 'Thả lỏng toàn thân', staff: 'Bảo Ngọc', room: 'An 01', status: 'Chờ xác nhận' },
    ],
  },
  employees: {
    title: 'Nhân viên',
    eyebrow: 'Đội ngũ MIÊN',
    description: 'Vai trò, ca làm và trạng thái hiện tại của từng thành viên.',
    addLabel: 'Thêm nhân viên',
    searchPlaceholder: 'Tìm tên hoặc vai trò',
    singularLabel: 'nhân viên',
    columns: [
      { key: 'name', label: 'Nhân viên' },
      { key: 'role', label: 'Vai trò' },
      { key: 'phone', label: 'Liên hệ' },
      { key: 'shift', label: 'Ca hôm nay' },
      { key: 'appointments', label: 'Lịch hôm nay', type: 'number', align: 'right' },
      { key: 'status', label: 'Trạng thái', type: 'status' },
    ],
    filters: [
      { label: 'Tất cả', field: '', value: '' },
      { label: 'Đang làm việc', field: 'status', value: 'Đang làm việc' },
      { label: 'Nghỉ hôm nay', field: 'status', value: 'Nghỉ hôm nay' },
    ],
    fields: [
      { key: 'name', label: 'Họ và tên', placeholder: 'Tên nhân viên' },
      { key: 'phone', label: 'Số điện thoại', type: 'tel' },
      { key: 'role', label: 'Vai trò', type: 'select', options: ['Kỹ thuật viên', 'Lễ tân', 'Quản lý', 'Tư vấn viên'] },
      { key: 'shift', label: 'Ca làm mặc định', type: 'select', options: ['09:00–17:00', '12:30–21:00', 'Linh hoạt'] },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['Đang làm việc', 'Nghỉ hôm nay'] },
    ],
    rows: [
      { id: 1, name: 'Hoàng Bảo Ngọc', role: 'Kỹ thuật viên', phone: '090 684 5217', shift: '09:00–17:00', appointments: 5, status: 'Đang làm việc' },
      { id: 2, name: 'Trịnh Thùy Dung', role: 'Kỹ thuật viên', phone: '093 251 7468', shift: '12:30–21:00', appointments: 4, status: 'Đang làm việc' },
      { id: 3, name: 'Ngô Yến Nhi', role: 'Kỹ thuật viên', phone: '078 642 9351', shift: '09:00–17:00', appointments: 3, status: 'Đang làm việc' },
      { id: 4, name: 'Đỗ Mai Phương', role: 'Kỹ thuật viên', phone: '091 536 2847', shift: '12:30–21:00', appointments: 4, status: 'Đang làm việc' },
      { id: 5, name: 'Lâm Tú Anh', role: 'Lễ tân', phone: '086 724 1593', shift: '09:00–17:00', appointments: 0, status: 'Nghỉ hôm nay' },
    ],
  },
  posts: {
    title: 'Bài viết',
    eyebrow: 'Nội dung và kiến thức',
    description: 'Quản lý bài viết chăm sóc tại nhà và câu chuyện thương hiệu trên website.',
    addLabel: 'Viết bài mới',
    searchPlaceholder: 'Tìm tiêu đề hoặc tác giả',
    singularLabel: 'bài viết',
    columns: [
      { key: 'title', label: 'Tiêu đề' },
      { key: 'category', label: 'Chuyên mục' },
      { key: 'author', label: 'Tác giả' },
      { key: 'updatedAt', label: 'Cập nhật', type: 'date' },
      { key: 'status', label: 'Trạng thái', type: 'status' },
    ],
    filters: [
      { label: 'Tất cả', field: '', value: '' },
      { label: 'Đã xuất bản', field: 'status', value: 'Đã xuất bản' },
      { label: 'Bản nháp', field: 'status', value: 'Bản nháp' },
      { label: 'Đã lên lịch', field: 'status', value: 'Đã lên lịch' },
    ],
    fields: [
      { key: 'title', label: 'Tiêu đề', placeholder: 'Tiêu đề bài viết' },
      { key: 'category', label: 'Chuyên mục', type: 'select', options: ['Chăm sóc tại nhà', 'Hiểu về cơ thể', 'Câu chuyện MIÊN'] },
      { key: 'summary', label: 'Mô tả ngắn', type: 'textarea' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['Bản nháp', 'Đã lên lịch', 'Đã xuất bản'] },
    ],
    rows: [
      { id: 1, title: 'Một buổi tối để cơ thể chậm lại', category: 'Chăm sóc tại nhà', author: 'Khánh Vân', updatedAt: '25/08/2026', status: 'Đã xuất bản' },
      { id: 2, title: 'Vì sao da cần những ngày nghỉ', category: 'Hiểu về cơ thể', author: 'Hà My', updatedAt: '23/08/2026', status: 'Đã lên lịch' },
      { id: 3, title: 'Mùi hương vừa đủ trong phòng trị liệu', category: 'Câu chuyện MIÊN', author: 'Khánh Vân', updatedAt: '17/08/2026', status: 'Bản nháp' },
      { id: 4, title: 'Ba điểm nên thả lỏng trước khi ngủ', category: 'Chăm sóc tại nhà', author: 'Hà My', updatedAt: '12/08/2026', status: 'Đã xuất bản' },
      { id: 5, title: 'Lắng nghe da sau một ngày nắng', category: 'Hiểu về cơ thể', author: 'Khánh Vân', updatedAt: '08/08/2026', status: 'Đã xuất bản' },
    ],
  },
}
