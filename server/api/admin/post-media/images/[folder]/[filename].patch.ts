import { moveImage, renameImage, safeFilename, safeFolder } from '../../../../../utils/post-media'
import { sql } from 'drizzle-orm'
import { posts, products } from '../../../../../database/schema'
import { useDatabase } from '../../../../../database/client'

export default defineEventHandler(async (event) => {
  const folder = safeFolder(getRouterParam(event, 'folder'))
  const filename = safeFilename(getRouterParam(event, 'filename'))
  const body = await readBody<{ folder?: string; filename?: string }>(event)
  if (!body.folder && !body.filename) throw createError({ statusCode: 422, statusMessage: 'Chưa có thay đổi nào được gửi.' })
  const changed = body.filename
    ? await renameImage(folder, filename, body.filename)
    : await moveImage(folder, filename, safeFolder(body.folder))
  const from = `/uploads/posts/${folder}/${filename}`
  const db = useDatabase()
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${changed.url})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${changed.url})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${changed.url})` }),
  ])
  return { data: changed }
})
