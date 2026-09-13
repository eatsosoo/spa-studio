import { sql } from 'drizzle-orm'
import { posts, products } from '../../../database/schema'
import { useDatabase } from '../../../database/client'
import { renameMediaFolder } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: string; name?: string }>(event)
  const renamed = await renameMediaFolder(body.path, body.name)
  const from = `/uploads/posts/${renamed.previousPath}/`
  const to = `/uploads/posts/${renamed.path}/`
  const db = useDatabase()
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${to})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${to})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${to})` }),
  ])
  return { data: renamed }
})
