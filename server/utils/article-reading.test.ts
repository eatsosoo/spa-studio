import { describe, expect, it } from 'vitest'
import { articleReading } from '../../app/utils/articleReading'

describe('article reading navigation', () => {
  it('creates distinct anchors for repeated headings and preserves inline markup', () => {
    const result = articleReading('<h2>Cách <em>chăm sóc</em></h2><h3>Cách chăm sóc</h3>')
    expect(result.headings).toEqual([
      { id: 'reading-section-1', title: 'Cách chăm sóc', level: 2 },
      { id: 'reading-section-2', title: 'Cách chăm sóc', level: 3 },
    ])
    expect(result.html).toContain('<h2 id="reading-section-1">Cách <em>chăm sóc</em></h2>')
  })
  it('keeps embedded product blocks intact and supports articles without headings', () => {
    const content = '<p>Nội dung</p><div data-product-id="12"></div>'
    expect(articleReading(content)).toEqual({ html: content, headings: [], minutes: 1 })
  })
  it('rounds reading time up', () => {
    expect(articleReading(`<p>${'chăm '.repeat(401)}</p>`).minutes).toBe(3)
  })
})
