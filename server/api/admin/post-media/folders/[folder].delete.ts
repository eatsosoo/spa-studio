import { listMedia, removeFolder, safeFolder } from '../../../../utils/post-media'
import { like, or } from 'drizzle-orm'
import { posts, products } from '../../../../database/schema'
import { useDatabase } from '../../../../database/client'

export default defineEventHandler(async (event) => {
  const folder = safeFolder(getRouterParam(event, 'folder'))
  const force = getQuery(event).force === 'true'
  const media = await listMedia()
  const found = media.folders.find(item => item.name === folder)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy thư mục.' })
  const prefix = `%/uploads/posts/${folder}/%`
  const db = useDatabase()
  const [postRefs, productRefs] = await Promise.all([
    db.select({ title: posts.title }).from(posts).where(or(like(posts.content, prefix), like(posts.featuredImageUrl, prefix))),
    db.select({ name: products.name }).from(products).where(like(products.imageUrl, prefix)),
  ])
  const references = [...postRefs.map(item => `Bài viết: ${item.title}`), ...productRefs.map(item => `Sản phẩm: ${item.name}`)]
  if ((found.count || references.length) && !force) throw createError({ statusCode: 409, statusMessage: `Thư mục có ${found.count} ảnh${references.length ? ` và đang được dùng tại ${references.length} nơi` : ''}. Hãy xác nhận xóa toàn bộ dữ liệu.`, data: { count: found.count, references } })
  await removeFolder(folder)
  return { data: { removed: true, count: found.count, references } }
})
