<script setup lang="ts">
import type { Product } from '~/types'
import { articleReading } from '~/utils/articleReading'
type RelatedPost = { slug: string; title: string; featuredImage: string | null; publishedAt: string | null }
type PostDetail = {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  featuredImage: string | null
  publishedAt: string | null
  updatedAt: string | null
  metaTitle: string | null
  metaDescription: string | null
  category: string
  author: string
  related: RelatedPost[]
  relatedProducts: Product[]
  relatedProductsSource: 'selected' | 'bestsellers'
}

const route = useRoute()
const copied = ref(false)
const { openBooking } = useBookingDrawer()
const { data: response, error: fetchError } = await useAsyncData(`post-${route.params.slug}`, () => $fetch<{ data: PostDetail }>(`/api/posts/${route.params.slug}`))
if (!response.value?.data) throw createError({ statusCode: fetchError.value?.statusCode || 404, statusMessage: fetchError.value?.statusCode === 404 ? 'Không tìm thấy bài viết.' : 'Chưa thể tải bài viết. Vui lòng thử lại.' })
const post = computed(() => response.value!.data)
const reading = computed(() => articleReading(post.value.content))
const shareError = ref('')
let shareTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(shareTimer))
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
const canonical = computed(() => `${siteUrl}/bai-viet/${post.value.slug}`)
const absoluteImage = computed(() => post.value.featuredImage ? new URL(post.value.featuredImage, `${siteUrl}/`).href : undefined)

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

async function copyLink() {
  shareError.value = ''
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    clearTimeout(shareTimer)
    shareTimer = setTimeout(() => { copied.value = false }, 1800)
  } catch { shareError.value = 'Không thể sao chép tự động. Bạn có thể sao chép địa chỉ trên thanh trình duyệt.' }
}

useSeoMeta({
  title: () => post.value.metaTitle || `${post.value.title} | MIÊN Spa`,
  description: () => post.value.metaDescription || post.value.excerpt,
  ogTitle: () => post.value.metaTitle || post.value.title,
  ogDescription: () => post.value.metaDescription || post.value.excerpt,
  ogImage: () => absoluteImage.value,
  ogUrl: () => canonical.value,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: () => post.value.metaTitle || post.value.title,
  twitterDescription: () => post.value.metaDescription || post.value.excerpt,
  twitterImage: () => absoluteImage.value,
  articlePublishedTime: () => post.value.publishedAt || undefined,
  articleModifiedTime: () => post.value.updatedAt || undefined,
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.value.title, description: post.value.metaDescription || post.value.excerpt, image: absoluteImage.value ? [absoluteImage.value] : undefined, datePublished: post.value.publishedAt, dateModified: post.value.updatedAt, author: { '@type': 'Person', name: post.value.author, url: `${siteUrl}/bai-viet` }, mainEntityOfPage: canonical.value }).replace(/</g, '\\u003c') },
    { type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'Bài viết', item: `${siteUrl}/bai-viet` }, { '@type': 'ListItem', position: 3, name: post.value.title, item: canonical.value }] }).replace(/</g, '\\u003c') },
  ],
}))
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main>
      <p v-if="shareError" role="status" class="mx-auto max-w-3xl px-5 py-4 text-sm">{{ shareError }}</p>
      <article>
        <header class="px-5 pb-12 pt-14 md:px-10 md:pb-16 md:pt-20 lg:px-14">
          <div class="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[0.34fr_1fr]">
            <div class="pt-2"><NuxtLink to="/bai-viet" class="admin-inline-link"><AppIcon name="arrow-left" :size="15" /> Tất cả bài viết</NuxtLink></div>
            <div class="max-w-[980px]">
              <div class="flex flex-wrap items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.17em] text-[#6c7666]"><span>{{ post.category }}</span><span class="h-px w-8 bg-[#78816f]/45" /><time :datetime="post.publishedAt || undefined">{{ formatDate(post.publishedAt) }}</time><span>Khoảng {{ reading.minutes }} phút đọc</span></div>
              <h1 class="mt-7 max-w-[940px] font-display text-[clamp(2.5rem,4.5vw,5rem)] font-light leading-[0.9] tracking-[-0.052em]">{{ post.title }}</h1>
              <p v-if="post.excerpt" class="mt-8 max-w-[64ch] text-base leading-8 text-[#656c61] md:text-lg">{{ post.excerpt }}</p>
              <div class="mt-9 flex items-center justify-between border-t border-[#78816f]/25 pt-5 text-xs text-[#71786d]"><span>Biên soạn bởi {{ post.author }}</span><button type="button" class="inline-flex items-center gap-2 font-semibold text-[#4b5945] transition hover:text-[#303c2b] active:translate-y-px" @click="copyLink"><AppIcon :name="copied ? 'check' : 'link'" :size="15" />{{ copied ? 'Đã sao chép' : 'Sao chép liên kết' }}</button></div>
            </div>
          </div>
        </header>

        <div v-if="post.featuredImage" class="mx-auto max-w-[1600px] px-0 md:px-10 lg:px-14"><img :src="post.featuredImage" :alt="post.title" class="max-h-[760px] w-full object-cover"></div>

        <div class="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[150px_minmax(0,720px)_minmax(230px,300px)] lg:gap-[5vw] lg:px-14">
          <aside class="self-start border-t border-[#78816f]/25 pt-5 text-xs leading-6 lg:sticky lg:top-8"><nav v-if="reading.headings.length" aria-label="Mục lục bài viết"><p class="section-label">Trong bài viết</p><a v-for="heading in reading.headings" :key="heading.id" :href="'#' + heading.id" class="mt-3 block hover:underline" :class="heading.level === 3 ? 'pl-3' : 'font-semibold'">{{ heading.title }}</a></nav><NuxtLink to="/bai-viet" class="text-link mt-6 block">Tất cả bài viết</NuxtLink></aside>
          <div class="min-w-0"><ArticleBody :content="reading.html" /><div class="mt-12 border-t border-[#78816f]/25 pt-8"><p class="section-label">Bước chăm sóc tiếp theo</p><h2 class="mt-3 font-display text-3xl">Chọn điều phù hợp với bạn.</h2><div class="mt-5 flex flex-wrap gap-3"><NuxtLink to="/san-pham" class="button-primary">Xem sản phẩm chăm sóc</NuxtLink><button type="button" class="button-quiet" @click="openBooking()">Đặt lịch tư vấn</button></div></div></div>
          <ArticleRelatedProducts :products="post.relatedProducts" :source="post.relatedProductsSource" />
        </div>
      </article>

      <section v-if="post.related.length" class="border-t border-[#78816f]/25 px-5 py-20 md:px-10 md:py-28 lg:px-14">
        <div class="mx-auto max-w-[1400px]"><div class="flex items-end justify-between gap-8"><div><p class="section-label">Đọc tiếp</p><h2 class="mt-4 font-display text-4xl font-light tracking-[-0.04em] md:text-5xl">Những ghi chép khác</h2></div><NuxtLink to="/bai-viet" class="text-link hidden sm:block">Xem tất cả</NuxtLink></div><div class="mt-10 grid gap-8 md:grid-cols-2"><NuxtLink v-for="item in post.related" :key="item.slug" :to="`/bai-viet/${item.slug}`" class="group grid gap-5 border-t border-[#78816f]/25 pt-6 sm:grid-cols-[160px_1fr] sm:items-center"><img :src="item.featuredImage || '/images/mien-spa-hero.png'" :alt="item.title" class="aspect-[4/3] w-full object-cover"><div><p class="text-[0.65rem] text-[#777e72]">{{ formatDate(item.publishedAt) }}</p><h3 class="mt-2 font-display text-3xl font-light leading-[1.08] tracking-[-0.035em] transition group-hover:text-[#596950]">{{ item.title }}</h3></div></NuxtLink></div></div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
