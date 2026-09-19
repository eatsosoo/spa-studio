import Busboy from 'busboy'
import type { H3Event } from 'h3'
import { POST_MEDIA_MAX_BYTES } from './post-media'

type UploadedImage = { filename: string; data: Buffer }
type MediaUpload = { path: string; folder: string; images: UploadedImage[] }

const MAX_MULTIPART_OVERHEAD = 8 * 1024 * 1024

export async function readMediaUpload(event: H3Event, fieldName: string, maxFiles: number): Promise<MediaUpload> {
  const maxRequestBytes = maxFiles * POST_MEDIA_MAX_BYTES + MAX_MULTIPART_OVERHEAD
  const contentLength = Number(getRequestHeader(event, 'content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    throw createError({ statusCode: 413, statusMessage: 'Yêu cầu tải ảnh quá lớn.' })
  }

  return new Promise<MediaUpload>((resolve, reject) => {
    const request = event.node.req
    let parser: ReturnType<typeof Busboy>
    try {
      parser = Busboy({
        headers: request.headers,
        limits: { fileSize: POST_MEDIA_MAX_BYTES, files: maxFiles, fields: 1, parts: maxFiles + 1, fieldSize: 1024, headerPairs: 100 },
      })
    } catch {
      reject(createError({ statusCode: 400, statusMessage: 'Dữ liệu tải ảnh không hợp lệ.' }))
      return
    }

    const images: UploadedImage[] = []
    let path = ''
    let folder = 'chung'
    let totalBytes = 0
    let problem: Error | null = null
    let settled = false
    const fail = (error: Error) => { if (!problem) problem = error }
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      request.off('data', countBytes)
      request.off('error', onError)
      if (error || problem) reject(error ?? problem)
      else resolve({ path, folder, images })
    }
    const onError = () => finish(createError({ statusCode: 400, statusMessage: 'Kết nối tải ảnh bị gián đoạn.' }))
    const countBytes = (chunk: Buffer) => {
      totalBytes += chunk.length
      if (totalBytes > maxRequestBytes) {
        finish(createError({ statusCode: 413, statusMessage: 'Yêu cầu tải ảnh quá lớn.' }))
        request.unpipe(parser)
        parser.destroy()
        request.destroy()
      }
    }

    parser.on('field', (name, value, info) => {
      if (info.valueTruncated || !['path', 'folder'].includes(name)) fail(createError({ statusCode: 422, statusMessage: 'Đường dẫn thư mục không hợp lệ.' }))
      else if (name === 'path') path = value
      else folder = value
    })
    parser.on('file', (name, file, info) => {
      if (name !== fieldName || !info.filename) fail(createError({ statusCode: 422, statusMessage: 'Tệp tải lên không hợp lệ.' }))
      const chunks: Buffer[] = []
      file.on('limit', () => fail(createError({ statusCode: 413, statusMessage: 'Mỗi ảnh phải nhỏ hơn 8 MB.' })))
      file.on('data', (chunk: Buffer) => { if (!problem) chunks.push(chunk) })
      file.on('end', () => {
        if (!problem && !file.truncated) images.push({ filename: info.filename, data: Buffer.concat(chunks) })
      })
    })
    parser.on('filesLimit', () => fail(createError({ statusCode: 422, statusMessage: `Chỉ được tải tối đa ${maxFiles} ảnh mỗi lần.` })))
    parser.on('fieldsLimit', () => fail(createError({ statusCode: 422, statusMessage: 'Yêu cầu tải ảnh có quá nhiều trường.' })))
    parser.on('partsLimit', () => fail(createError({ statusCode: 422, statusMessage: 'Yêu cầu tải ảnh có quá nhiều phần.' })))
    parser.on('error', () => finish(createError({ statusCode: 400, statusMessage: 'Dữ liệu tải ảnh không hợp lệ.' })))
    parser.on('close', () => finish())
    request.on('data', countBytes)
    request.on('error', onError)
    request.pipe(parser)
  })
}
