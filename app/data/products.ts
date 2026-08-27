import type { Product } from '~/types'

export const products: Product[] = [
  {
    id: 1,
    slug: 'serum-suong-mai',
    name: 'Serum Sương Mai',
    category: 'Chăm sóc da',
    shortDescription: 'Phục hồi độ ẩm và làm dịu làn da sau một ngày dài.',
    description: 'Kết cấu dầu nước mỏng nhẹ giúp da trở về trạng thái mềm, ẩm và bình tĩnh. Công thức được tạo cho cả những làn da nhạy cảm với mùi hương rất thấp.',
    price: 780000,
    size: '30 ml',
    stock: 18,
    sku: 'MN-SM-030',
    status: 'Đang bán',
    image: '/images/mien-product-collection.png',
    imagePosition: '16% center',
    benefits: ['Giữ ẩm lâu nhưng không bí da', 'Làm dịu cảm giác căng rát', 'Dùng được sáng và tối'],
    ingredients: 'Dầu cám gạo, squalane thực vật, chiết xuất rau má và vitamin E.',
    usage: 'Sau bước cân bằng, làm ấm 2–3 giọt trong lòng bàn tay rồi áp nhẹ lên mặt và cổ.',
  },
  {
    id: 2,
    slug: 'dau-co-the-moc',
    name: 'Dầu Cơ Thể Mộc',
    category: 'Chăm sóc cơ thể',
    shortDescription: 'Hỗn hợp dầu thực vật ấm, dành cho nghi thức massage tại nhà.',
    description: 'Một lớp dầu có độ trượt vừa đủ để massage nhưng thấm gọn sau vài phút. Hương gỗ và lá xanh ở mức rất nhẹ, không lưu quá lâu trên da.',
    price: 640000,
    size: '100 ml',
    stock: 7,
    sku: 'MN-MC-100',
    status: 'Sắp hết',
    image: '/images/mien-product-collection.png',
    imagePosition: '39% center',
    benefits: ['Làm mềm vùng da khô', 'Phù hợp massage vai gáy', 'Không để lại màng bóng'],
    ingredients: 'Dầu hạt nho, dầu jojoba, cám gạo và hỗn hợp tinh dầu tuyết tùng nồng độ thấp.',
    usage: 'Thoa lên da còn hơi ẩm sau khi tắm hoặc làm ấm trong tay trước khi massage.',
  },
  {
    id: 3,
    slug: 'kem-duong-an',
    name: 'Kem Dưỡng An',
    category: 'Chăm sóc da',
    shortDescription: 'Chất kem êm, củng cố hàng rào bảo vệ cho da thiếu ẩm.',
    description: 'Chất kem giàu dưỡng nhưng không nặng mặt, tập trung vào việc giảm mất nước và bảo vệ da trước môi trường điều hòa, nắng nóng.',
    price: 920000,
    size: '50 g',
    stock: 24,
    sku: 'MN-KA-050',
    status: 'Đang bán',
    image: '/images/mien-product-collection.png',
    imagePosition: '64% center',
    benefits: ['Khóa ẩm qua đêm', 'Hỗ trợ hàng rào bảo vệ da', 'Không chứa màu tổng hợp'],
    ingredients: 'Ceramide, bơ hạt mỡ, beta-glucan và chiết xuất yến mạch.',
    usage: 'Lấy lượng bằng một hạt đậu, tán đều ở bước cuối của chu trình dưỡng da.',
  },
  {
    id: 4,
    slug: 'balm-tha-long',
    name: 'Balm Thả Lỏng',
    category: 'Nghi thức tại nhà',
    shortDescription: 'Balm gọn nhẹ cho thái dương, vai và những vùng thường căng mỏi.',
    description: 'Mang cảm giác ấm dịu khi massage, thích hợp đặt cạnh giường hoặc mang theo khi di chuyển. Hương thảo mộc tan dần sau khoảng hai mươi phút.',
    price: 460000,
    size: '45 g',
    stock: 0,
    sku: 'MN-BT-045',
    status: 'Tạm ẩn',
    image: '/images/mien-product-collection.png',
    imagePosition: '88% center',
    benefits: ['Hỗ trợ thư giãn vùng vai gáy', 'Gọn để mang theo', 'Hương thơm không lưu quá lâu'],
    ingredients: 'Bơ xoài, sáp cám gạo, dầu gừng và tinh dầu hương thảo.',
    usage: 'Lấy một lượng nhỏ, làm ấm bằng đầu ngón tay rồi massage theo chuyển động tròn.',
  },
]

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug)
}
