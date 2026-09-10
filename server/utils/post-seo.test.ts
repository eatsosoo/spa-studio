import { describe, expect, it } from 'vitest'
import { scorePostSeo } from '../../app/utils/postSeo'

describe('SEO scoring', () => {
  it('tăng điểm khi bài có chủ đề, cấu trúc, link và ảnh tối ưu', () => {
    const weak = scorePostSeo({ title: 'Da đẹp', slug: '', summary: '', content: '<p>Nội dung ngắn.</p>', featuredImage: '', metaTitle: '', metaDescription: '', focusKeyword: '', status: 'Bản nháp' })
    const paragraph = 'chăm sóc da nhạy cảm cần sự dịu nhẹ và một quy trình đều đặn '.repeat(55)
    const strong = scorePostSeo({ title: 'Cách chăm sóc da nhạy cảm dịu nhẹ mỗi ngày', slug: 'cham-soc-da-nhay-cam', summary: 'Hướng dẫn chăm sóc da nhạy cảm với các bước làm sạch, phục hồi và bảo vệ hàng rào da một cách khoa học, vừa đủ cho thói quen mỗi ngày.', content: `<p>Chăm sóc da nhạy cảm là cách giúp da phục hồi bền vững.</p><h2>Hiểu làn da</h2><p>${paragraph}</p><h2>Quy trình thực hành</h2><p>${paragraph}</p><a href="/san-pham">Xem sản phẩm</a><img src="/uploads/posts/chung/da.webp" alt="Chuyên viên chăm sóc làn da nhạy cảm">`, featuredImage: '/uploads/posts/chung/cover.webp', metaTitle: 'Chăm sóc da nhạy cảm: quy trình dịu nhẹ mỗi ngày', metaDescription: 'Hướng dẫn chăm sóc da nhạy cảm với từng bước làm sạch, phục hồi hàng rào bảo vệ và lựa chọn sản phẩm dịu nhẹ cho thói quen chăm da hằng ngày.', focusKeyword: 'chăm sóc da nhạy cảm', status: 'Đã xuất bản' })
    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.score).toBeGreaterThanOrEqual(80)
  })
})
