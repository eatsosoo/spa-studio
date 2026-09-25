export type SiteLink = {
  label: string
  to?: string
  external?: boolean
  action?: 'booking'
}

export const siteInfo = {
  brand: 'MIÊN Spa',
  tagline: 'Một khoảng lặng cho cơ thể.',
  description: 'Không gian chăm sóc cơ thể và làn da theo nhịp riêng của mỗi người.',
  address: '18 Nguyễn Ư Dĩ, Thảo Điền, TP. Hồ Chí Minh',
  phone: '028 7302 8628',
  phoneHref: 'tel:02873028628',
  email: 'hello@mien-spa.vn',
  emailHref: 'mailto:hello@mien-spa.vn',
  openingHours: '09:00–21:00 mỗi ngày',
  copyright: `© ${new Date().getFullYear()} MIÊN Spa. Bảo lưu mọi quyền.`,
} as const

export const footerLinkGroups: Array<{ title: string; links: SiteLink[] }> = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Liệu trình', to: '/lieu-trinh' },
      { label: 'Sản phẩm', to: '/san-pham' },
      { label: 'Bài viết', to: '/bai-viet' },
      { label: 'Đặt lịch tư vấn', action: 'booking' },
    ],
  },
  {
    title: 'Tài khoản',
    links: [
      { label: 'Hồ sơ', to: '/tai-khoan' },
      { label: 'Lịch hẹn', to: '/tai-khoan?tab=lich-hen' },
      { label: 'Giỏ hàng', to: '/gio-hang' },
      { label: 'Đơn hàng', to: '/tai-khoan?tab=don-hang' },
    ],
  },
  {
    title: 'Thông tin',
    links: [
      { label: 'Chính sách dịch vụ', to: '/chinh-sach' },
      { label: 'Điều khoản sử dụng', to: '/dieu-khoan' },
      { label: 'Chính sách bảo mật', to: '/bao-mat' },
    ],
  },
]

// Cập nhật các URL này khi tài khoản mạng xã hội chính thức được xác nhận.
export const socialLinks: SiteLink[] = [
  { label: 'Instagram', to: 'https://www.instagram.com/mien.spa', external: true },
  { label: 'Facebook', to: 'https://www.facebook.com/mien.spa', external: true },
]

export const legalPages = {
  'chinh-sach': {
    eyebrow: 'Thông tin dịch vụ',
    title: 'Chính sách dịch vụ',
    description: 'Các nguyên tắc giúp mỗi cuộc hẹn tại MIÊN diễn ra thuận tiện và trọn vẹn.',
    sections: [
      { title: 'Đặt và thay đổi lịch', body: 'Bạn có thể xem và điều chỉnh lịch hẹn trong khu vực tài khoản. Khi cần hỗ trợ sát giờ hẹn, vui lòng liên hệ trực tiếp với MIÊN.' },
      { title: 'Đến đúng giờ', body: 'Vui lòng có mặt sớm vài phút để hoàn tất trao đổi nhu cầu. Việc đến muộn có thể làm thời lượng liệu trình được điều chỉnh để không ảnh hưởng lịch kế tiếp.' },
      { title: 'Sản phẩm và hoàn trả', body: 'Sản phẩm cần được giữ nguyên tình trạng khi yêu cầu hỗ trợ đổi trả. MIÊN sẽ xác nhận điều kiện áp dụng theo từng đơn hàng.' },
    ],
  },
  'dieu-khoan': {
    eyebrow: 'Thông tin pháp lý',
    title: 'Điều khoản sử dụng',
    description: 'Quy định chung khi bạn sử dụng website, đặt lịch và mua sản phẩm tại MIÊN.',
    sections: [
      { title: 'Tài khoản của bạn', body: 'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và cung cấp thông tin chính xác khi đặt lịch hoặc đặt hàng.' },
      { title: 'Thông tin trên website', body: 'Nội dung chăm sóc có tính chất tham khảo và không thay thế chẩn đoán hoặc hướng dẫn của chuyên gia y tế.' },
      { title: 'Hỗ trợ', body: 'Nếu có câu hỏi về giao dịch hoặc dịch vụ, hãy liên hệ MIÊN qua số điện thoại hoặc email được công bố trên website.' },
    ],
  },
  'bao-mat': {
    eyebrow: 'Quyền riêng tư',
    title: 'Chính sách bảo mật',
    description: 'Cách MIÊN tiếp nhận và sử dụng thông tin cần thiết để phục vụ lịch hẹn và đơn hàng của bạn.',
    sections: [
      { title: 'Thông tin được thu thập', body: 'MIÊN chỉ tiếp nhận những dữ liệu cần cho tài khoản, lịch hẹn, giao nhận, thanh toán và hỗ trợ khách hàng.' },
      { title: 'Mục đích sử dụng', body: 'Thông tin được dùng để cung cấp dịch vụ, xác nhận giao dịch, cải thiện trải nghiệm và đáp ứng yêu cầu hỗ trợ.' },
      { title: 'Quyền của bạn', body: 'Bạn có thể cập nhật hồ sơ trong khu vực tài khoản hoặc liên hệ MIÊN để yêu cầu hỗ trợ đối với dữ liệu cá nhân.' },
    ],
  },
} as const
