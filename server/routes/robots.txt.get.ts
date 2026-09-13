export default defineEventHandler(event => {
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl).replace(/\/$/, '')
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /gio-hang\nDisallow: /thanh-toan\nDisallow: /don-hang/\nSitemap: ${siteUrl}/sitemap.xml\n`
})
