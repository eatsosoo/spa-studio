export function useStoreSeo(title: string, description: string, path: string) {
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')
  const url = `${siteUrl}${path}`
  useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url, ogType: 'website', ogImage: `${siteUrl}/images/mien-spa-hero.png`, twitterCard: 'summary_large_image' })
  useHead({ link: [{ rel: 'canonical', href: url }] })
}
