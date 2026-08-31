import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

const mimeTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') ?? ''
  const match = filename.match(/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/)
  if (!match) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' })

  const path = join(process.cwd(), '.data', 'uploads', 'posts', filename)
  try {
    await stat(path)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy ảnh.' })
  }

  setResponseHeader(event, 'Content-Type', mimeTypes[match[1]!] ?? 'application/octet-stream')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(path))
})
