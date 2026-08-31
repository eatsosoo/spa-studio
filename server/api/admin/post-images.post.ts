import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const image = parts?.find(part => part.name === 'image' && part.filename)

  if (!image?.type || !extensions[image.type]) {
    throw createError({ statusCode: 422, statusMessage: 'Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.' })
  }
  if (image.data.byteLength > 5 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Ảnh phải nhỏ hơn 5 MB.' })
  }

  const directory = join(process.cwd(), '.data', 'uploads', 'posts')
  const filename = `${randomUUID()}.${extensions[image.type]}`
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, filename), image.data)

  return { data: { url: `/uploads/posts/${filename}` } }
})
