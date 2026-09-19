import { PassThrough } from 'node:stream'
import type { H3Event } from 'h3'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readMediaUpload } from './media-upload'

async function upload(form: FormData, maxFiles = 12) {
  const response = new Response(form)
  const body = Buffer.from(await response.arrayBuffer())
  const request = new PassThrough() as PassThrough & { headers: Record<string, string> }
  request.headers = {
    'content-type': response.headers.get('content-type') ?? '',
    'content-length': String(body.length),
  }
  const event = { node: { req: request } } as unknown as H3Event
  const result = readMediaUpload(event, 'images', maxFiles)
  request.end(body)
  return result
}

describe('bounded media upload', () => {
  beforeEach(() => {
    vi.stubGlobal('getRequestHeader', (event: H3Event, name: string) => event.node.req.headers[name])
  })
  afterAll(() => vi.unstubAllGlobals())

  it('reads a valid folder path and image', async () => {
    const form = new FormData()
    form.append('path', 'chien-dich')
    form.append('images', new Blob(['photo']), 'anh.jpg')
    const result = await upload(form)
    expect(result.path).toBe('chien-dich')
    expect(result.images).toEqual([{ filename: 'anh.jpg', data: Buffer.from('photo') }])
  })

  it('rejects an image larger than 8 MiB while streaming', async () => {
    const form = new FormData()
    form.append('images', new Blob([Buffer.alloc(8 * 1024 * 1024 + 1)]), 'big.jpg')
    await expect(upload(form)).rejects.toMatchObject({ statusCode: 413 })
  })

  it('rejects more files than the endpoint allows', async () => {
    const form = new FormData()
    form.append('images', new Blob(['one']), 'one.jpg')
    form.append('images', new Blob(['two']), 'two.jpg')
    await expect(upload(form, 1)).rejects.toMatchObject({ statusCode: 422 })
  })
})
