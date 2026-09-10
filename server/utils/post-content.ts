import sanitizeHtml from 'sanitize-html'

const allowedTags = [
  'p', 'h2', 'h3', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote',
  'hr', 'br', 'a', 'img', 'code', 'pre', 'div',
]

export function sanitizePostContent(content: string) {
  const value = content.trim()
  if (!value) return ''

  const html = /<[a-z][\s\S]*>/i.test(value)
    ? value
    : value
        .split(/\n{2,}/)
        .map(paragraph => `<p>${sanitizeHtml(paragraph, { allowedTags: [] }).replace(/\n/g, '<br>')}</p>`)
        .join('')

  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      div: ['class', 'data-product-id'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        const internal = href.startsWith('/') && !href.startsWith('//')
        const nextAttributes: Record<string, string> = internal ? { href } : { ...attribs, rel: 'noopener noreferrer' }
        return { tagName, attribs: nextAttributes }
      },
    },
  })
}

export function plainTextFromPost(content: string) {
  const withBlockSpacing = content.replace(/<\/(?:p|h[1-6]|li|blockquote|pre|div)>|<br\s*\/?>/gi, ' ')
  return sanitizeHtml(withBlockSpacing, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}
