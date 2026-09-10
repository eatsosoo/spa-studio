import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'
import sharp, { type Metadata } from 'sharp'

export const POST_MEDIA_ROOT = resolve(process.cwd(), '.data', 'uploads', 'posts')
export const POST_MEDIA_MAX_BYTES = 8 * 1024 * 1024
export const POST_MEDIA_MAX_FILES = 12
const ROOT_FOLDER = 'chung'

export function mediaSlug(value: string, fallback = ROOT_FOLDER) {
  const slug = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
  return slug || fallback
}

export function safeFolder(value: unknown) {
  const raw = String(value ?? ROOT_FOLDER).trim()
  const slug = mediaSlug(raw)
  if (raw.includes('..') || raw.includes('/') || raw.includes('\\')) throw createError({ statusCode: 422, statusMessage: 'Tên thư mục không hợp lệ.' })
  return slug
}

export function safeFilename(value: unknown) {
  const filename = basename(String(value ?? ''))
  if (!/^[a-z0-9][a-z0-9-]*\.(?:webp)$/i.test(filename) || filename !== String(value)) {
    throw createError({ statusCode: 422, statusMessage: 'Tên ảnh không hợp lệ.' })
  }
  return filename
}

export function mediaPath(...parts: string[]) {
  const target = resolve(POST_MEDIA_ROOT, ...parts)
  if (target !== POST_MEDIA_ROOT && !target.startsWith(`${POST_MEDIA_ROOT}${sep}`)) {
    throw createError({ statusCode: 422, statusMessage: 'Đường dẫn ảnh không hợp lệ.' })
  }
  return target
}

export async function ensureMediaRoot() {
  await mkdir(mediaPath(ROOT_FOLDER, '.thumbs'), { recursive: true })
}

async function uniqueName(folder: string, preferred: string) {
  const base = mediaSlug(preferred, `anh-${randomBytes(3).toString('hex')}`)
  let filename = `${base}.webp`
  let suffix = 2
  while (true) {
    try {
      await stat(mediaPath(folder, filename))
      filename = `${base}-${suffix++}.webp`
    } catch {
      return filename
    }
  }
}

export async function optimizePostImage(data: Buffer, folderValue: unknown, nameValue: unknown) {
  if (data.byteLength > POST_MEDIA_MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Mỗi ảnh phải nhỏ hơn 8 MB.' })
  const folder = safeFolder(folderValue)
  const image = sharp(data, { animated: true, failOn: 'error' })
  let metadata: Metadata
  try { metadata = await image.metadata() } catch {
    throw createError({ statusCode: 422, statusMessage: 'Tệp tải lên không phải ảnh hợp lệ.' })
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
    const message = metadata.format === 'gif'
      ? 'GIF động chưa được hỗ trợ vì chuyển đổi có thể làm mất animation.'
      : 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.'
    throw createError({ statusCode: 422, statusMessage: message })
  }
  if ((metadata.pages ?? 1) > 1) throw createError({ statusCode: 422, statusMessage: 'Ảnh động chưa được hỗ trợ.' })

  const filename = await uniqueName(folder, String(nameValue || 'anh-bai-viet').replace(/\.[^.]+$/, ''))
  await mkdir(mediaPath(folder, '.thumbs'), { recursive: true })
  const optimized = await sharp(data).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Number(process.env.POST_IMAGE_WEBP_QUALITY ?? 83), effort: 4 }).toBuffer()
  const thumbnail = await sharp(optimized).resize({ width: 420, height: 300, fit: 'cover' }).webp({ quality: 74 }).toBuffer()
  await Promise.all([
    sharp(optimized).toFile(mediaPath(folder, filename)),
    sharp(thumbnail).toFile(mediaPath(folder, '.thumbs', filename)),
  ])
  const outputMeta = await sharp(optimized).metadata()
  return {
    folder,
    filename,
    url: `/uploads/posts/${folder}/${filename}`,
    thumbnailUrl: `/uploads/posts/${folder}/.thumbs/${filename}`,
    width: outputMeta.width ?? 0,
    height: outputMeta.height ?? 0,
    originalBytes: data.byteLength,
    optimizedBytes: optimized.byteLength,
    reductionPercent: Math.max(0, Math.round((1 - optimized.byteLength / data.byteLength) * 100)),
  }
}

export async function listMedia(search = '') {
  await ensureMediaRoot()
  const entries = await readdir(POST_MEDIA_ROOT, { withFileTypes: true })
  const folders = [] as Array<{ name: string; count: number; bytes: number }>
  const images = [] as Array<{ folder: string; filename: string; url: string; thumbnailUrl: string; bytes: number; width: number; height: number; updatedAt: Date }>
  for (const directory of entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))) {
    const files = await readdir(mediaPath(directory.name), { withFileTypes: true })
    const valid = files.filter(file => file.isFile() && file.name.endsWith('.webp') && (!search || file.name.includes(mediaSlug(search, ''))))
    let total = 0
    for (const file of valid) {
      const path = mediaPath(directory.name, file.name)
      const [info, fileBuffer] = await Promise.all([stat(path), readFile(path)])
      const metadata = await sharp(fileBuffer).metadata()
      total += info.size
      images.push({ folder: directory.name, filename: file.name, url: `/uploads/posts/${directory.name}/${file.name}`, thumbnailUrl: `/uploads/posts/${directory.name}/.thumbs/${file.name}`, bytes: info.size, width: metadata.width ?? 0, height: metadata.height ?? 0, updatedAt: info.mtime })
    }
    folders.push({ name: directory.name, count: files.filter(file => file.isFile() && file.name.endsWith('.webp')).length, bytes: total })
  }
  return { folders: folders.sort((a, b) => a.name.localeCompare(b.name)), images: images.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) }
}

export async function moveImage(folder: string, filename: string, targetFolder: string) {
  const nextName = await uniqueName(targetFolder, filename.replace(/\.webp$/, ''))
  await mkdir(mediaPath(targetFolder, '.thumbs'), { recursive: true })
  await Promise.all([
    rename(mediaPath(folder, filename), mediaPath(targetFolder, nextName)),
    rename(mediaPath(folder, '.thumbs', filename), mediaPath(targetFolder, '.thumbs', nextName)).catch(() => undefined),
  ])
  return { url: `/uploads/posts/${targetFolder}/${nextName}`, filename: nextName, folder: targetFolder }
}

export async function removeFolder(folder: string) {
  if (folder === ROOT_FOLDER) throw createError({ statusCode: 422, statusMessage: 'Không thể xóa thư mục gốc.' })
  await rm(mediaPath(folder), { recursive: true, force: false, maxRetries: 5, retryDelay: 120 })
}

export async function renameFolder(folder: string, target: string) {
  await rename(mediaPath(folder), mediaPath(target))
}

export function mediaRelativePath(path: string) {
  return relative(POST_MEDIA_ROOT, path).replaceAll(sep, '/')
}
