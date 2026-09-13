import { rm } from 'node:fs/promises'
import { like, or } from 'drizzle-orm'
import { posts, products } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { mediaPath, safeFilename, safeMediaDirectory } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = safeMediaDirectory(query.path)
  const filename = safeFilename(query.filename)
  const prefix = path ? `${path}/` : ''
  const url = `/uploads/posts/${prefix}${filename}`
  const force = query.force === 'true'
  const db = useDatabase()
  const [postRefs, productRefs] = await Promise.all([
    db.select({ title: posts.title }).from(posts).where(or(like(posts.content, `%${url}%`), like(posts.featuredImageUrl, `%${url}%`))),
    db.select({ name: products.name }).from(products).where(like(products.imageUrl, `%${url}%`)),
  ])
  const references = [...postRefs.map(item => `Bài viết: ${item.title}`), ...productRefs.map(item => `Sản phẩm: ${item.name}`)]
  if (references.length && !force) throw createError({ statusCode: 409, statusMessage: `Ảnh đang được dùng tại ${references.length} nơi.`, data: { references } })
  const parts = path ? path.split('/') : []
  await Promise.all([
    rm(mediaPath(...parts, filename), { force: true }),
    rm(mediaPath(...parts, '.thumbs', filename), { force: true }),
  ])
  return { data: { removed: true, references } }
})
