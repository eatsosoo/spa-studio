import { and, desc, eq, isNull, ne } from 'drizzle-orm'
import { postCategories, posts, users } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { plainTextFromPost, sanitizePostContent } from '../../utils/post-content'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy bài viết.' })

  const db = useDatabase()
  const [post] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      content: posts.content,
      featuredImage: posts.featuredImageUrl,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      metaTitle: posts.metaTitle,
      metaDescription: posts.metaDescription,
      category: postCategories.name,
      author: users.username,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, 'published'), isNull(posts.deletedAt)))
    .limit(1)

  if (!post) throw createError({ statusCode: 404, statusMessage: 'Bài viết chưa được xuất bản hoặc không tồn tại.' })

  const related = await db
    .select({ slug: posts.slug, title: posts.title, featuredImage: posts.featuredImageUrl, publishedAt: posts.publishedAt })
    .from(posts)
    .where(and(eq(posts.status, 'published'), ne(posts.id, post.id), isNull(posts.deletedAt)))
    .orderBy(desc(posts.publishedAt))
    .limit(2)

  const content = sanitizePostContent(post.content)
  return {
    data: {
      ...post,
      content,
      excerpt: post.excerpt || plainTextFromPost(content).slice(0, 180),
      category: post.category ?? 'Chuyện từ MIÊN',
      author: post.author ?? 'MIÊN',
      related,
    },
  }
})
