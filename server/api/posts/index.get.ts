import { and, desc, eq, isNull } from 'drizzle-orm'
import { postCategories, posts, users } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { plainTextFromPost } from '../../utils/post-content'
import { paginateRows } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  const rows = await useDatabase()
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      content: posts.content,
      featuredImage: posts.featuredImageUrl,
      publishedAt: posts.publishedAt,
      category: postCategories.name,
      author: users.username,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.status, 'published'), isNull(posts.deletedAt)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt))

  const data = rows.map(({ content, ...row }) => ({
      ...row,
      excerpt: row.excerpt || plainTextFromPost(content).slice(0, 180),
      category: row.category ?? 'Chuyện từ MIÊN',
      author: row.author ?? 'MIÊN',
    }))

  const query = getQuery(event)
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd')
  const search = normalize(String(query.q ?? '').trim().slice(0, 200))
  const filtered = data.filter(row => (!query.category || row.category === query.category) && (!search || normalize(row.title + ' ' + row.excerpt).includes(search)))
  return paginateRows(filtered, event, 7)
})
