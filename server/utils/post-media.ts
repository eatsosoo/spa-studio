import { randomBytes } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'
import sharp, { type Metadata } from 'sharp'

export const POST_MEDIA_ROOT = resolve(process.cwd(), 'public', 'uploads', 'posts')
const LEGACY_POST_MEDIA_ROOT = resolve(process.cwd(), '.data', 'uploads', 'posts')
export const POST_MEDIA_MAX_BYTES = 8 * 1024 * 1024
export const POST_MEDIA_MAX_FILES = 12
const ROOT_FOLDER = 'chung'
let legacyMigrationChecked = false

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

export function safeMediaDirectory(value: unknown) {
  const raw = String(value ?? '').trim().replaceAll('\\', '/')
  if (!raw) return ''
  if (raw.includes('..') || raw.startsWith('/') || raw.endsWith('/')) throw createError({ statusCode: 422, statusMessage: 'Đường dẫn thư mục không hợp lệ.' })
  const parts = raw.split('/')
  if (parts.some(part => !/^[a-z0-9][a-z0-9-]*$/.test(part))) throw createError({ statusCode: 422, statusMessage: 'Đường dẫn thư mục không hợp lệ.' })
  return parts.join('/')
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
  await mkdir(POST_MEDIA_ROOT, { recursive: true })
  if (!legacyMigrationChecked) {
    legacyMigrationChecked = true
    try { await cp(LEGACY_POST_MEDIA_ROOT, POST_MEDIA_ROOT, { recursive: true, force: false, errorOnExist: false }) } catch { /* Không có dữ liệu cũ để chuyển. */ }
  }
  await mkdir(mediaPath(ROOT_FOLDER, '.thumbs'), { recursive: true })
}

function directoryParts(directory: string) {
  return directory ? safeMediaDirectory(directory).split('/') : []
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

export async function optimizeBrowserImage(data: Buffer, directoryValue: unknown, nameValue: unknown) {
  if (data.byteLength > POST_MEDIA_MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Mỗi ảnh phải nhỏ hơn 8 MB.' })
  const directory = safeMediaDirectory(directoryValue)
  const image = sharp(data, { animated: true, failOn: 'error' })
  let metadata: Metadata
  try { metadata = await image.metadata() } catch { throw createError({ statusCode: 422, statusMessage: 'Tệp tải lên không phải ảnh hợp lệ.' }) }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw createError({ statusCode: 422, statusMessage: 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP không chuyển động.' })
  const filename = await uniqueName(directory, String(nameValue || 'anh-bai-viet').replace(/\.[^.]+$/, '').trim())
  await mkdir(mediaPath(...directoryParts(directory), '.thumbs'), { recursive: true })
  const optimized = await sharp(data).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: Number(process.env.POST_IMAGE_WEBP_QUALITY ?? 83), effort: 4 }).toBuffer()
  const thumbnail = await sharp(optimized).resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  await Promise.all([
    sharp(optimized).toFile(mediaPath(...directoryParts(directory), filename)),
    sharp(thumbnail).toFile(mediaPath(...directoryParts(directory), '.thumbs', filename)),
  ])
  const result = await sharp(optimized).metadata()
  const prefix = directory ? `${directory}/` : ''
  return { folder: directory, filename, url: `/uploads/posts/${prefix}${filename}`, thumbnailUrl: `/uploads/posts/${prefix}.thumbs/${filename}`, bytes: optimized.byteLength, width: result.width ?? 0, height: result.height ?? 0, reductionPercent: Math.round((1 - optimized.byteLength / data.byteLength) * 100) }
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

async function summarizeDirectory(directory: string): Promise<{ count: number; bytes: number }> {
  const entries = await readdir(mediaPath(...directoryParts(directory)), { withFileTypes: true })
  let count = 0
  let bytes = 0
  for (const entry of entries) {
    if (entry.name === '.thumbs') continue
    const relative = directory ? `${directory}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      const nested = await summarizeDirectory(relative)
      count += nested.count
      bytes += nested.bytes
    } else if (entry.isFile() && entry.name.endsWith('.webp')) {
      count += 1
      bytes += (await stat(mediaPath(...directoryParts(directory), entry.name))).size
    }
  }
  return { count, bytes }
}

export async function listMediaDirectory(directoryValue: unknown, searchValue: unknown = '') {
  await ensureMediaRoot()
  const directory = safeMediaDirectory(directoryValue)
  const search = mediaSlug(String(searchValue ?? ''), '')
  let entries
  try {
    entries = await readdir(mediaPath(...directoryParts(directory)), { withFileTypes: true })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy thư mục.' })
  }
  const folderEntries = entries.filter(entry => entry.isDirectory() && entry.name !== '.thumbs')
  const folders = await Promise.all(folderEntries.map(async (entry) => {
    const path = directory ? `${directory}/${entry.name}` : entry.name
    return { name: entry.name, path, ...(await summarizeDirectory(path)) }
  }))
  const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.webp') && (!search || entry.name.includes(search)))
  const images = await Promise.all(files.map(async (entry) => {
    const filePath = mediaPath(...directoryParts(directory), entry.name)
    const [details, metadata] = await Promise.all([stat(filePath), sharp(filePath).metadata()])
    const prefix = directory ? `${directory}/` : ''
    return { folder: directory, filename: entry.name, url: `/uploads/posts/${prefix}${entry.name}`, thumbnailUrl: `/uploads/posts/${prefix}.thumbs/${entry.name}`, bytes: details.size, width: metadata.width ?? 0, height: metadata.height ?? 0, updatedAt: details.mtime }
  }))
  return { path: directory, folders: folders.sort((a, b) => a.name.localeCompare(b.name)), images: images.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) }
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

export async function renameImage(folder: string, filename: string, preferred: unknown) {
  const stem = mediaSlug(String(preferred ?? '').replace(/\.webp$/i, ''), '')
  if (!stem) throw createError({ statusCode: 422, statusMessage: 'Tên ảnh không hợp lệ.' })
  const target = `${stem}.webp`
  const prefix = folder ? `${folder}/` : ''
  if (target === filename) return { folder, filename, url: `/uploads/posts/${prefix}${filename}` }
  try {
    await stat(mediaPath(folder, target))
    throw createError({ statusCode: 409, statusMessage: 'Tên ảnh này đã tồn tại trong thư mục.' })
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) throw error
  }
  await Promise.all([
    rename(mediaPath(folder, filename), mediaPath(folder, target)),
    rename(mediaPath(folder, '.thumbs', filename), mediaPath(folder, '.thumbs', target)).catch(() => undefined),
  ])
  return { folder, filename: target, url: `/uploads/posts/${prefix}${target}` }
}

async function assertFolderNameAvailable(parent: string, name: string, currentName = '') {
  const entries = await readdir(mediaPath(...directoryParts(parent)), { withFileTypes: true })
  const duplicate = entries.some(entry => entry.isDirectory() && entry.name !== '.thumbs' && entry.name !== currentName && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Thư mục cùng tên đã tồn tại ở cấp này.' })
}

export async function createMediaFolder(parentValue: unknown, nameValue: unknown) {
  await ensureMediaRoot()
  const parent = safeMediaDirectory(parentValue)
  const name = mediaSlug(String(nameValue ?? ''), '')
  if (!name) throw createError({ statusCode: 422, statusMessage: 'Tên thư mục không hợp lệ.' })
  await assertFolderNameAvailable(parent, name)
  const path = parent ? `${parent}/${name}` : name
  try {
    await mkdir(mediaPath(...directoryParts(path)))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw createError({ statusCode: 409, statusMessage: 'Thư mục cùng tên đã tồn tại ở cấp này.' })
    throw error
  }
  await mkdir(mediaPath(...directoryParts(path), '.thumbs'))
  return { name, path }
}

export async function renameMediaFolder(pathValue: unknown, nameValue: unknown) {
  const path = safeMediaDirectory(pathValue)
  if (!path) throw createError({ statusCode: 422, statusMessage: 'Không thể đổi tên thư mục gốc.' })
  const parts = directoryParts(path)
  const currentName = parts.at(-1) ?? ''
  const parent = parts.slice(0, -1).join('/')
  const name = mediaSlug(String(nameValue ?? ''), '')
  if (!name) throw createError({ statusCode: 422, statusMessage: 'Tên thư mục không hợp lệ.' })
  if (name === currentName) return { name, path, previousPath: path }
  await assertFolderNameAvailable(parent, name, currentName)
  const target = parent ? `${parent}/${name}` : name
  try {
    await rename(mediaPath(...parts), mediaPath(...directoryParts(target)))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw createError({ statusCode: 409, statusMessage: 'Thư mục cùng tên đã tồn tại ở cấp này.' })
    throw error
  }
  return { name, path: target, previousPath: path }
}

export async function removeMediaFolder(pathValue: unknown) {
  const path = safeMediaDirectory(pathValue)
  if (!path) throw createError({ statusCode: 422, statusMessage: 'Không thể xóa thư mục gốc.' })
  const summary = await summarizeDirectory(path)
  await rm(mediaPath(...directoryParts(path)), { recursive: true, force: false, maxRetries: 5, retryDelay: 120 })
  return summary
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
