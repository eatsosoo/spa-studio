import { eq, sql } from 'drizzle-orm'
import { aiPostJobs, posts, products } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { renameMediaFolder } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: string; name?: string }>(event)
  const renamed = await renameMediaFolder(body.path, body.name)
  const from = `/uploads/posts/${renamed.previousPath}/`
  const to = `/uploads/posts/${renamed.path}/`
  const db = useDatabase()
  const pendingJobs = await db.select({ id: aiPostJobs.id, imageSource: aiPostJobs.imageSource }).from(aiPostJobs)
  const affectedJobs = pendingJobs.filter(job => job.imageSource?.kind === 'folder' && (job.imageSource.path === renamed.previousPath || String(job.imageSource.path).startsWith(`${renamed.previousPath}/`)))
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${to})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${to})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${to})` }),
    ...affectedJobs.map(job => {
      const source = job.imageSource!
      const path = String(source.path).replace(renamed.previousPath, renamed.path)
      return db.update(aiPostJobs).set({ imageSource: { ...source, path, name: path.split('/').at(-1) } }).where(eq(aiPostJobs.id, job.id))
    }),
  ])
  return { data: renamed }
})
