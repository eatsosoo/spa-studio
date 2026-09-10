import { moveImage, safeFilename, safeFolder } from '../../../../../utils/post-media'
import { sql } from 'drizzle-orm'
import { posts, products } from '../../../../../database/schema'
import { useDatabase } from '../../../../../database/client'

export default defineEventHandler(async (event) => {
  const folder = safeFolder(getRouterParam(event, 'folder'))
  const filename = safeFilename(getRouterParam(event, 'filename'))
  const body = await readBody<{ folder?: string }>(event)
  const target = safeFolder(body.folder)
  const moved = await moveImage(folder, filename, target)
  const from = `/uploads/posts/${folder}/${filename}`
  const db = useDatabase()
  await Promise.all([
    db.update(posts).set({ content: sql`replace(${posts.content}, ${from}, ${moved.url})`, featuredImageUrl: sql`replace(${posts.featuredImageUrl}, ${from}, ${moved.url})` }),
    db.update(products).set({ imageUrl: sql`replace(${products.imageUrl}, ${from}, ${moved.url})` }),
  ])
  return { data: moved }
})
