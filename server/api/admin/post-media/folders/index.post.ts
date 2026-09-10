import { mkdir, stat } from 'node:fs/promises'
import { ensureMediaRoot, mediaPath, safeFolder } from '../../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string }>(event)
  const folder = safeFolder(body.name)
  await ensureMediaRoot()
  try { await stat(mediaPath(folder)); throw createError({ statusCode: 409, statusMessage: 'Thư mục này đã tồn tại.' }) } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) throw error
  }
  await mkdir(mediaPath(folder, '.thumbs'), { recursive: true })
  return { data: { name: folder } }
})
