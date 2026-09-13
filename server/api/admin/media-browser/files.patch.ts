import { sql } from 'drizzle-orm'
import { posts, products } from '../../../database/schema'
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
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${renamed.url})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${renamed.url})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${renamed.url})` }),
  ])
  return { data: renamed }
})
