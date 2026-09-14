type FolderImage = { url: string; filename: string }

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function attachMissingFolderImages(content: string, images: FolderImage[], fallbackAlt: string) {
  const blocks = images.slice(0, 3).filter(image => !content.includes(image.url)).map(image => {
    const filenameAlt = image.filename.replace(/\.webp$/i, '').replaceAll('-', ' ').trim()
    return `<p><img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(filenameAlt || fallbackAlt)}"></p>`
  })
  return blocks.length ? `${content.trim()}${blocks.join('')}` : content
}
