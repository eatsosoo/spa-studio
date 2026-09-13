import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { ensureMediaRoot, mediaPath } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  await ensureMediaRoot()
  const raw = String(getRouterParam(event, 'path') ?? '')
  const parts = raw.split('/').filter(Boolean)
  const valid = parts.length >= 2 && parts.every((part, index) => {
    if (part === '.thumbs') return index === parts.length - 2
    if (index === parts.length - 1) return /^[a-z0-9][a-z0-9-]*\.webp$/i.test(part)
    return /^[a-z0-9][a-z0-9-]*$/.test(part)
  })
  if (!valid) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' })
  const path = mediaPath(...parts)
  try { await stat(path) } catch { throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' }) }
  setResponseHeader(event, 'Content-Type', 'image/webp')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(path))
})
