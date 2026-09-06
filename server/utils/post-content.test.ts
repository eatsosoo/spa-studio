import { describe, expect, it } from 'vitest'
import { plainTextFromPost, sanitizePostContent } from './post-content'

describe('post content utilities', () => {
  it('converts plain text paragraphs into safe HTML', () => {
    expect(sanitizePostContent('Đoạn một\n\nĐoạn hai\ndòng mới')).toBe('<p>Đoạn một</p><p>Đoạn hai<br />dòng mới</p>')
  })

  it('removes scripts, event handlers and unsafe URLs', () => {
    const result = sanitizePostContent('<p onclick="evil()">Nội dung</p><script>alert(1)</script><a href="javascript:evil()">Link</a><img src="data:image/png;base64,bad">')
    expect(result).toContain('<p>Nội dung</p>')
    expect(result).not.toContain('script')
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('data:image')
  })

  it('adds link isolation attributes', () => {
    const result = sanitizePostContent('<a href="https://example.com" target="_blank">Xem thêm</a>')
    expect(result).toContain('rel="noopener noreferrer"')
    expect(result).toContain('href="https://example.com"')
  })

  it('returns clean plain text for excerpts', () => {
    expect(plainTextFromPost('<h2>Chăm sóc da</h2><p>Dịu nhẹ <strong>mỗi ngày</strong></p>')).toBe('Chăm sóc da Dịu nhẹ mỗi ngày')
  })

  it('returns an empty string for blank content', () => {
    expect(sanitizePostContent('   ')).toBe('')
  })
})
