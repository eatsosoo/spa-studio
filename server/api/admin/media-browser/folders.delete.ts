import { like, or } from 'drizzle-orm'
import { posts, products } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { removeMediaFolder, safeMediaDirectory } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = safeMediaDirectory(query.path)
  const force = query.force === 'true'
  const prefix = `%/uploads/posts/${path}/%`
  const db = useDatabase()
  const [postRefs, productRefs] = await Promise.all([
    db.select({ title: posts.title }).from(posts).where(or(like(posts.content, prefix), like(posts.featuredImageUrl, prefix))),
    db.select({ name: products.name }).from(products).where(like(products.imageUrl, prefix)),
  ])
  const references = [...postRefs.map(item => `Bài viết: ${item.title}`), ...productRefs.map(item => `Sản phẩm: ${item.name}`)]
  if (references.length && !force) throw createError({ statusCode: 409, statusMessage: `Thư mục đang được dùng tại ${references.length} nơi. Hãy xác nhận xóa toàn bộ dữ liệu.`, data: { references } })
  const summary = await removeMediaFolder(path)
  return { data: { removed: true, ...summary, references } }
})
