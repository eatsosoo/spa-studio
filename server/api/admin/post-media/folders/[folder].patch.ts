import { renameFolder, safeFolder } from '../../../../utils/post-media'
import { sql } from 'drizzle-orm'
import { posts, products } from '../../../../database/schema'
import { useDatabase } from '../../../../database/client'

export default defineEventHandler(async (event) => {
  const folder = safeFolder(getRouterParam(event, 'folder'))
  const body = await readBody<{ name?: string }>(event)
  const target = safeFolder(body.name)
  if (folder === 'chung') throw createError({ statusCode: 422, statusMessage: 'Không thể đổi tên thư mục gốc.' })
  await renameFolder(folder, target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EEXIST') throw createError({ statusCode: 409, statusMessage: 'Tên thư mục mới đã tồn tại.' })
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy thư mục.' })
  })
  const from = `/uploads/posts/${folder}/`
  const to = `/uploads/posts/${target}/`
  const db = useDatabase()
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${to})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${to})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${to})` }),
  ])
  return { data: { name: target } }
})
