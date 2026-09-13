export function articleReading(content: string) {
  const headings: { id: string; title: string; level: number }[] = []
  const html = content.replace(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, body: string) => {
    const id = `reading-section-${headings.length + 1}`
    headings.push({ id, title: body.replace(/<[^>]*>/g, ''), level: Number(level) })
    return `<h${level} id="${id}">${body}</h${level}>`
  })
  const minutes = Math.max(1, Math.ceil(content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length / 200))
  return { html, headings, minutes }
}
