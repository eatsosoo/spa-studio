import { and, desc, eq, isNull, ne } from 'drizzle-orm'
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
  const rows = await db.select({ id: posts.id, slug: posts.slug, title: posts.title, category: postCategories.name, author: users.username, summary: posts.excerpt, content: posts.content, featuredImage: posts.featuredImageUrl, metaTitle: posts.metaTitle, metaDescription: posts.metaDescription, focusKeyword: posts.focusKeyword, secondaryKeywords: posts.secondaryKeywords, postStatus: posts.status, updatedAt: posts.updatedAt, publishedAt: posts.publishedAt }).from(posts)
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
  const secondaryKeywords = String(body.secondaryKeywords ?? '').split(',').map(item => item.trim()).filter(Boolean).slice(0, 8)
  const values = { title, categoryId: await categoryId(db, textValue(body, 'category')!), excerpt: textValue(body, 'summary', false), content, featuredImageUrl: textValue(body, 'featuredImage', false), metaTitle: textValue(body, 'metaTitle', false), metaDescription: textValue(body, 'metaDescription', false), focusKeyword: textValue(body, 'focusKeyword', false), secondaryKeywords, status: postStatus }
  if (id) {
    const [existing] = await db.select({ publishedAt: posts.publishedAt, slug: posts.slug }).from(posts).where(and(eq(posts.id, id), isNull(posts.deletedAt))).limit(1)
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy bài viết.' })
    const requestedSlug = slugify(String(body.slug ?? title))
    const nextSlug = existing.publishedAt ? existing.slug : requestedSlug || existing.slug
    const [duplicate] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.slug, nextSlug), ne(posts.id, id))).limit(1)
    if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Slug bài viết đã tồn tại. Vui lòng chọn đường dẫn khác.' })
    await db.update(posts).set({ ...values, slug: nextSlug, publishedAt: postStatus === 'published' ? existing.publishedAt ?? new Date() : null }).where(eq(posts.id, id))
  } else {
    const requestedSlug = slugify(String(body.slug ?? title))
    const nextSlug = requestedSlug || `${slugify(title)}-${Date.now().toString(36)}`
    const [duplicate] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, nextSlug)).limit(1)
    if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Slug bài viết đã tồn tại. Vui lòng chọn đường dẫn khác.' })
    await db.insert(posts).values({ ...values, slug: nextSlug, publishedAt: postStatus === 'published' ? new Date() : null })
  }
}

async function removePost(id: number) {
  return useDatabase().update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id))
}

export const postResource = { list: listPosts, save: savePost, remove: removePost } satisfies AdminResource
