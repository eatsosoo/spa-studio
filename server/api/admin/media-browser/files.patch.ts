import { eq, sql } from 'drizzle-orm'
import { aiPostJobs, posts, products } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { renameImage, safeFilename, safeMediaDirectory } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: string; filename?: string; name?: string }>(event)
  const path = safeMediaDirectory(body.path)
  const filename = safeFilename(body.filename)
  const renamed = await renameImage(path, filename, body.name)
  const prefix = path ? `${path}/` : ''
  const from = `/uploads/posts/${prefix}${filename}`
  const db = useDatabase()
  const pendingJobs = await db.select({ id: aiPostJobs.id, imageSource: aiPostJobs.imageSource }).from(aiPostJobs)
  const affectedJobs = pendingJobs.filter(job => job.imageSource?.kind === 'image' && job.imageSource.folder === path && job.imageSource.filename === filename)
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${renamed.url})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${renamed.url})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${renamed.url})` }),
    ...affectedJobs.map(job => db.update(aiPostJobs).set({ imageSource: { ...job.imageSource!, filename: renamed.filename, url: renamed.url, thumbnailUrl: renamed.url.replace(`/${renamed.filename}`, `/.thumbs/${renamed.filename}`) } }).where(eq(aiPostJobs.id, job.id))),
  ])
  return { data: renamed }
})
