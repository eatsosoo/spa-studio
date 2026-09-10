import { rm } from 'node:fs/promises'
import { or, like } from 'drizzle-orm'
import { posts, products } from '../../../../../database/schema'
import { useDatabase } from '../../../../../database/client'
import { mediaPath, safeFilename, safeFolder } from '../../../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const folder = safeFolder(getRouterParam(event, 'folder'))
  const filename = safeFilename(getRouterParam(event, 'filename'))
  const url = `/uploads/posts/${folder}/${filename}`
  const force = getQuery(event).force === 'true'
  const db = useDatabase()
  const [postRefs, productRefs] = await Promise.all([
    db.select({ id: posts.id, title: posts.title }).from(posts).where(or(like(posts.content, `%${url}%`), like(posts.featuredImageUrl, `%${url}%`))),
    db.select({ id: products.id, name: products.name }).from(products).where(like(products.imageUrl, `%${url}%`)),
  ])
  const references = [...postRefs.map(item => `Bài viết: ${item.title}`), ...productRefs.map(item => `Sản phẩm: ${item.name}`)]
  if (references.length && !force) throw createError({ statusCode: 409, statusMessage: `Ảnh đang được sử dụng tại ${references.length} nơi.`, data: { references } })
  await Promise.all([rm(mediaPath(folder, filename), { maxRetries: 5, retryDelay: 120 }), rm(mediaPath(folder, '.thumbs', filename), { force: true, maxRetries: 5, retryDelay: 120 })])
  return { data: { removed: true, references } }
})
