import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { ensureMediaRoot, mediaPath } from '../../../utils/post-media'

const mimeTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export default defineEventHandler(async (event) => {
  await ensureMediaRoot()
  const filename = getRouterParam(event, 'filename') ?? ''
  const match = filename.match(/^(?:[a-z0-9][a-z0-9-]*\.webp|[0-9a-f-]{36}\.(?:jpg|png|gif))$/i)
  if (!match) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' })
  const path = mediaPath(filename)
  try {
    await stat(path)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' })
  }

  const extension = filename.split('.').at(-1)?.toLowerCase() ?? ''
  setResponseHeader(event, 'Content-Type', mimeTypes[extension] ?? 'application/octet-stream')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(path))
})
