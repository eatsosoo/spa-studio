import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { mediaPath } from '../../../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const folder = getRouterParam(event, 'folder') ?? ''
  const filename = getRouterParam(event, 'filename') ?? ''
  if (!/^[a-z0-9-]+$/.test(folder) || !/^[a-z0-9][a-z0-9-]*\.webp$/.test(filename)) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' })
  const path = mediaPath(folder, '.thumbs', filename)
  try { await stat(path) } catch { throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' }) }
  setResponseHeader(event, 'Content-Type', 'image/webp')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(path))
})
