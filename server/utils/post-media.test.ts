import { afterAll, describe, expect, it } from 'vitest'
import { rm, stat } from 'node:fs/promises'
import sharp from 'sharp'
import { createMediaFolder, listMediaDirectory, mediaPath, optimizePostImage, safeFolder, safeMediaDirectory } from './post-media'

const folder = 'smoke-media-test'
const treeFolder = 'smoke-tree-test'

afterAll(async () => {
  await Promise.all([
    rm(mediaPath(folder), { recursive: true, force: true }),
    rm(mediaPath(treeFolder), { recursive: true, force: true }),
  ])
})

describe('post media', () => {
  it('chuẩn hóa tên thư mục và chặn path traversal', () => {
    expect(safeFolder('Chăm sóc da')).toBe('cham-soc-da')
    expect(() => safeFolder('../private')).toThrow('Tên thư mục không hợp lệ')
    expect(safeMediaDirectory('bai-viet/2026/thang-09')).toBe('bai-viet/2026/thang-09')
    expect(() => safeMediaDirectory('bai-viet/../../private')).toThrow('Đường dẫn thư mục không hợp lệ')
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

  it('tạo thư mục nhiều tầng và chặn tên trùng ở cùng cấp', async () => {
    await createMediaFolder('', treeFolder)
    await createMediaFolder(treeFolder, 'Ảnh thư mục con')
    await expect(createMediaFolder(treeFolder, 'Ảnh thư mục con')).rejects.toThrow('Thư mục cùng tên đã tồn tại')
    const directory = await listMediaDirectory(treeFolder)
    expect(directory.folders.map(item => item.name)).toEqual(['anh-thu-muc-con'])
  })
})
