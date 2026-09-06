import { and, desc, eq, isNull } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { postCategories, posts, users } from '../../../database/schema'
import { sanitizePostContent } from '../../../utils/post-content'
import { dateVi, insertedId, reverseStatus, slugify, statusValue, textValue, type AdminResource } from '../shared'

const postStatuses = { 'Bản nháp': 'draft', 'Đã xuất bản': 'published', 'Lưu trữ': 'archived' } as const

async function categoryId(db: ReturnType<typeof useDatabase>, name: string) {
  const [found] = await db.select({ id: postCategories.id }).from(postCategories).where(eq(postCategories.name, name)).limit(1)
  if (found) return found.id
  const suffix = Date.now().toString(36)
  const [created] = await db.insert(postCategories).values({ name, slug: `${slugify(name)}-${suffix}` }).$returningId()
  return insertedId(created)
}

async function listPosts() {
  const db = useDatabase()
  const rows = await db.select({ id: posts.id, slug: posts.slug, title: posts.title, category: postCategories.name, author: users.username, summary: posts.excerpt, content: posts.content, featuredImage: posts.featuredImageUrl, metaTitle: posts.metaTitle, metaDescription: posts.metaDescription, postStatus: posts.status, updatedAt: posts.updatedAt }).from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id)).leftJoin(users, eq(posts.authorId, users.id))
    .where(isNull(posts.deletedAt)).orderBy(desc(posts.updatedAt))
  return rows.map(row => ({ ...row, category: row.category ?? 'Chưa phân loại', author: row.author ?? 'MIÊN', summary: row.summary ?? '', updatedAt: dateVi(row.updatedAt), status: reverseStatus(postStatuses, row.postStatus), postStatus: undefined }))
}

async function savePost(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const title = textValue(body, 'title')!
  const postStatus = statusValue(body, 'status', postStatuses, 'draft')
  const content = sanitizePostContent(textValue(body, 'content')!)
  if (!content) throw createError({ statusCode: 422, statusMessage: 'Nội dung bài viết là bắt buộc.' })
  const values = { title, categoryId: await categoryId(db, textValue(body, 'category')!), excerpt: textValue(body, 'summary', false), content, featuredImageUrl: textValue(body, 'featuredImage', false), metaTitle: textValue(body, 'metaTitle', false), metaDescription: textValue(body, 'metaDescription', false), status: postStatus }
  if (id) {
    const [existing] = await db.select({ publishedAt: posts.publishedAt }).from(posts).where(and(eq(posts.id, id), isNull(posts.deletedAt))).limit(1)
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy bài viết.' })
    await db.update(posts).set({ ...values, publishedAt: postStatus === 'published' ? existing.publishedAt ?? new Date() : null }).where(eq(posts.id, id))
  } else {
    await db.insert(posts).values({ ...values, slug: `${slugify(title)}-${Date.now().toString(36)}`, publishedAt: postStatus === 'published' ? new Date() : null })
  }
}

async function removePost(id: number) {
  return useDatabase().update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id))
}

export const postResource = { list: listPosts, save: savePost, remove: removePost } satisfies AdminResource
