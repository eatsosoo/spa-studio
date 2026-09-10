import { afterAll, describe, expect, it } from 'vitest'
import { rm, stat } from 'node:fs/promises'
import sharp from 'sharp'
import { mediaPath, optimizePostImage, safeFolder } from './post-media'

const folder = 'smoke-media-test'

afterAll(async () => { await rm(mediaPath(folder), { recursive: true, force: true }) })

describe('post media', () => {
  it('chuẩn hóa tên thư mục và chặn path traversal', () => {
    expect(safeFolder('Chăm sóc da')).toBe('cham-soc-da')
    expect(() => safeFolder('../private')).toThrow('Tên thư mục không hợp lệ')
  })

  it('chuyển ảnh sang WebP và tạo thumbnail', async () => {
    const original = await sharp({ create: { width: 2200, height: 1200, channels: 3, background: '#d9cbb7' } }).png().toBuffer()
    const result = await optimizePostImage(original, folder, 'Nghi thức chăm sóc.png')
    expect(result.filename).toMatch(/^nghi-thuc-cham-soc(?:-\d+)?\.webp$/)
    expect(result.width).toBe(1920)
    expect(result.optimizedBytes).toBeLessThan(result.originalBytes)
    await expect(stat(mediaPath(folder, result.filename))).resolves.toBeTruthy()
    await expect(stat(mediaPath(folder, '.thumbs', result.filename))).resolves.toBeTruthy()
  })
})
