import { like, or } from 'drizzle-orm'
import { aiPostJobs, posts, products } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { removeMediaFolder, safeMediaDirectory } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = safeMediaDirectory(query.path)
  const force = query.force === 'true'
  const prefix = `%/uploads/posts/${path}/%`
  const db = useDatabase()
  const [postRefs, productRefs, pendingJobs] = await Promise.all([
    db.select({ title: posts.title }).from(posts).where(or(like(posts.content, prefix), like(posts.featuredImageUrl, prefix))),
    db.select({ name: products.name }).from(products).where(like(products.imageUrl, prefix)),
    db.select({ title: aiPostJobs.title, imageSource: aiPostJobs.imageSource }).from(aiPostJobs),
  ])
  const jobRefs = pendingJobs.filter(job => job.imageSource?.kind === 'folder' && (job.imageSource.path === path || String(job.imageSource.path).startsWith(`${path}/`)))
  const references = [...postRefs.map(item => `Bài viết: ${item.title}`), ...productRefs.map(item => `Sản phẩm: ${item.name}`), ...jobRefs.map(item => `Bài AI đang chờ: ${item.title}`)]
  if (references.length && !force) throw createError({ statusCode: 409, statusMessage: `Thư mục đang được dùng tại ${references.length} nơi. Hãy xác nhận xóa toàn bộ dữ liệu.`, data: { references } })
  const summary = await removeMediaFolder(path)
  return { data: { removed: true, ...summary, references } }
})
