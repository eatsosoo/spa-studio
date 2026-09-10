export type SeoInput = {
  title: string
  slug: string
  summary: string
  content: string
  featuredImage: string
  metaTitle: string
  metaDescription: string
  focusKeyword: string
  status: string
}

export type SeoCheck = { id: string; label: string; passed: boolean; points: number; maxPoints: number; explanation: string; guidance: string; field: string }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').replace(/đ/g, 'd')
const includes = (value: string, keyword: string) => Boolean(keyword && normalize(value).includes(normalize(keyword)))
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const check = (id: string, label: string, passed: boolean, maxPoints: number, explanation: string, guidance: string, field: string): SeoCheck => ({ id, label, passed, points: passed ? maxPoints : 0, maxPoints, explanation, guidance, field })

export function scorePostSeo(input: SeoInput) {
  const contentText = text(input.content)
  const keyword = input.focusKeyword.trim()
  const seoTitle = input.metaTitle.trim() || input.title.trim()
  const description = input.metaDescription.trim() || input.summary.trim()
  const firstParagraph = input.content.match(/<p[^>]*>(.*?)<\/p>/i)?.[1] ?? ''
  const headings = [...input.content.matchAll(/<h([23])[^>]*>(.*?)<\/h\1>/gi)]
  const images = [...input.content.matchAll(/<img\s+([^>]+)>/gi)]
  const links = [...input.content.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map(match => match[1] ?? '')
  const wordCount = contentText.split(/\s+/).filter(Boolean).length
  const keywordCount = keyword ? normalize(contentText).split(normalize(keyword)).length - 1 : 0
  const naturalKeywordUse = !keyword || wordCount < 120 || keywordCount <= Math.max(5, Math.ceil(wordCount / 90))
  const hasDirectAnswer = /<p[^>]*>[^<]{30,260}<\/p>/i.test(input.content) && (/[?？]/.test(input.title) || /(?:là|giúp|nên|cần|cách)/i.test(firstParagraph))
  const hasCta = /(?:đặt lịch|xem sản phẩm|thêm vào giỏ|liên hệ|khám phá|tìm hiểu)/i.test(contentText)
  const ctaCount = (contentText.match(/(?:đặt lịch|xem sản phẩm|thêm vào giỏ|liên hệ)/gi) ?? []).length
  const slug = input.slug.trim()

  const checks = [
    check('keyword', 'Có từ khóa chính', Boolean(keyword), 7, keyword ? `Đang theo dõi “${keyword}”.` : 'Chưa có chủ đề trọng tâm để đối chiếu.', 'Nhập cụm từ mô tả đúng ý định tìm kiếm chính.', 'focusKeyword'),
    check('seo-title-keyword', 'Từ khóa trong SEO title', includes(seoTitle, keyword), 7, 'SEO title giúp công cụ tìm kiếm hiểu chủ đề trang.', 'Đưa chủ đề chính vào tiêu đề SEO một cách tự nhiên.', 'metaTitle'),
    check('h1-keyword', 'Từ khóa trong tiêu đề bài viết', includes(input.title, keyword), 7, 'H1 là tín hiệu chủ đề quan trọng nhất trên trang.', 'Điều chỉnh tiêu đề để phản ánh trực tiếp chủ đề.', 'title'),
    check('intro-keyword', 'Từ khóa trong đoạn mở đầu', includes(firstParagraph, keyword), 6, 'Đoạn đầu xác nhận nhanh bài viết đáp ứng đúng nhu cầu.', 'Nhắc chủ đề chính trong đoạn mở đầu, không lặp máy móc.', 'content'),
    check('slug', 'Slug ngắn và dễ đọc', slug.length >= 3 && slug.length <= 72 && /^[a-z0-9-]+$/.test(slug), 5, slug ? `Slug dài ${slug.length} ký tự.` : 'Chưa có slug.', 'Dùng 3–8 từ không dấu, phân cách bằng dấu gạch nối.', 'slug'),
    check('description', 'Mô tả SEO hợp lý', description.length >= 120 && description.length <= 165 && (!keyword || includes(description, keyword)), 7, `Mô tả hiện có ${description.length} ký tự.`, 'Giữ khoảng 120–165 ký tự và diễn đạt lợi ích chính.', 'metaDescription'),
    check('headings', 'Cấu trúc H2/H3 rõ ràng', headings.some(item => item[1] === '2') && headings.length >= 2, 6, `Đang có ${headings.length} tiêu đề phụ.`, 'Chia nội dung thành các phần có H2; dùng H3 cho ý nhỏ.', 'content'),
    check('depth', 'Nội dung đủ sâu', wordCount >= 600, 7, `Bài viết có khoảng ${wordCount} từ.`, 'Bổ sung ví dụ, quy trình và lưu ý thiết thực; không kéo dài vô ích.', 'content'),
    check('internal-link', 'Có liên kết nội bộ', links.some(link => link.startsWith('/') && !link.startsWith('//')), 6, `Đang có ${links.filter(link => link.startsWith('/')).length} liên kết nội bộ.`, 'Dẫn người đọc tới bài viết, dịch vụ hoặc sản phẩm liên quan.', 'content'),
    check('valid-links', 'Không có liên kết sai định dạng', links.every(link => /^(?:\/|https?:\/\/|mailto:)/.test(link)), 4, 'Kiểm tra định dạng các URL đã chèn.', 'Thay các liên kết không hợp lệ bằng lựa chọn từ thư viện nội bộ.', 'content'),
    check('cover', 'Có ảnh đại diện', Boolean(input.featuredImage), 5, 'Ảnh đại diện dùng cho trang bài và chia sẻ xã hội.', 'Chọn ảnh ngang rõ nét từ thư viện.', 'featuredImage'),
    check('image-alt', 'Ảnh nội dung có alt text', images.every(image => /\balt=["'][^"']{3,}["']/i.test(image[1] ?? '')), 5, `Đang kiểm tra ${images.length} ảnh nội dung.`, 'Viết alt text mô tả đúng nội dung ảnh, không nhồi từ khóa.', 'content'),
    check('optimized-image', 'Ảnh đã được tối ưu', images.every(image => /src=["'][^"']+\.webp["']/i.test(image[1] ?? '')), 4, 'WebP giúp giảm dung lượng mà vẫn giữ chất lượng.', 'Chọn ảnh từ thư viện để hệ thống tự tối ưu WebP.', 'content'),
    check('title-length', 'Độ dài tiêu đề phù hợp', seoTitle.length >= 35 && seoTitle.length <= 65, 5, `Tiêu đề SEO có ${seoTitle.length} ký tự.`, 'Giữ tiêu đề khoảng 35–65 ký tự, ưu tiên ý quan trọng ở đầu.', 'metaTitle'),
    check('authorship', 'Có tác giả và ngày bài viết', input.status === 'Đã xuất bản' || input.status === 'Bản nháp', 4, 'Hệ thống gắn tác giả đăng nhập và thời gian cập nhật.', 'Xuất bản khi nội dung hoàn thiện để ghi nhận ngày công khai.', 'status'),
    check('direct-answer', 'Có đoạn trả lời trực tiếp', hasDirectAnswer, 6, 'Một đoạn ngắn, rõ giúp người đọc nắm ý chính nhanh.', 'Thêm câu trả lời 1–3 câu ngay sau phần mở đầu.', 'content'),
    check('cta', 'CTA phù hợp, không lạm dụng', hasCta && ctaCount <= 4, 5, `Phát hiện ${ctaCount} lời kêu gọi hành động trực tiếp.`, 'Đặt một CTA phù hợp với mục tiêu đọc, tránh lặp quá nhiều.', 'content'),
    check('natural-keyword', 'Từ khóa được dùng tự nhiên', naturalKeywordUse, 4, keywordCount ? `Từ khóa xuất hiện ${keywordCount} lần trong nội dung.` : 'Chưa phát hiện lặp từ khóa.', 'Ưu tiên biến thể ngôn ngữ và trải nghiệm đọc, không nhồi từ khóa.', 'content'),
  ]
  const score = checks.reduce((sum, item) => sum + item.points, 0)
  return { score, label: score >= 80 ? 'Tốt' : score >= 50 ? 'Khá' : 'Cần cải thiện', checks }
}
