import sanitizeHtml from 'sanitize-html'

const allowedTags = [
  'p', 'h2', 'h3', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote',
  'hr', 'br', 'a', 'img', 'code', 'pre',
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
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
  })
}

export function plainTextFromPost(content: string) {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}
