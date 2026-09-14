import { describe, expect, it } from 'vitest'
import { attachMissingFolderImages } from './ai-post-images'

describe('attachMissingFolderImages', () => {
  it('gắn tối đa ba ảnh chưa có trong nội dung', () => {
    const content = '<h2>Chăm sóc</h2><p>Nội dung.</p><img src="/uploads/posts/da/anh-1.webp" alt="Ảnh 1">'
    const result = attachMissingFolderImages(content, [
      { url: '/uploads/posts/da/anh-1.webp', filename: 'anh-1.webp' },
      { url: '/uploads/posts/da/anh-2.webp', filename: 'cham-soc-da.webp' },
      { url: '/uploads/posts/da/anh-3.webp', filename: 'thu-gian.webp' },
      { url: '/uploads/posts/da/anh-4.webp', filename: 'khong-duoc-dung.webp' },
    ], 'Chăm sóc da')

    expect(result.match(/<img /g)).toHaveLength(3)
    expect(result).toContain('/uploads/posts/da/anh-2.webp')
    expect(result).not.toContain('anh-4.webp')
  })

  it('thoát ký tự nguy hiểm trong thuộc tính ảnh', () => {
    const result = attachMissingFolderImages('<p>Nội dung.</p>', [{ url: '/uploads/posts/da/a.webp', filename: 'da-"dep".webp' }], 'Ảnh')
    expect(result).toContain('alt="da &quot;dep&quot;"')
  })
})
