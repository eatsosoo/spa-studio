import { and, desc, eq, isNull } from 'drizzle-orm'
import { posts } from '../database/schema'
import { useDatabase } from '../database/client'

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const rows = await useDatabase().select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts)
    .where(and(eq(posts.status, 'published'), isNull(posts.deletedAt))).orderBy(desc(posts.updatedAt))
  const urls = [`<url><loc>${escapeXml(siteUrl)}</loc></url>`, `<url><loc>${escapeXml(`${siteUrl}/bai-viet`)}</loc></url>`, ...rows.map(row => `<url><loc>${escapeXml(`${siteUrl}/bai-viet/${row.slug}`)}</loc><lastmod>${new Date(row.updatedAt).toISOString()}</lastmod></url>`)]
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=900')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
})
