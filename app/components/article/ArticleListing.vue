<script setup lang="ts">
import type { PaginatedResponse, PaginationMeta } from '~/types'

type PostSummary = {
  id: number
  slug: string
  title: string
  excerpt: string
  featuredImage: string | null
  publishedAt: string | null
  category: string
  author: string
}

const route = useRoute()
const router = useRouter()
const search = ref(String(route.query.q || ''))
const submittedSearch = computed(() => String(route.query.q || ''))
const page = computed({ get: () => Math.max(1, Math.floor(Number(route.query.page) || 1)), set: value => { router.push({ query: { ...route.query, page: value > 1 ? String(value) : undefined } }) } })
function searchPosts() { router.push({ query: { q: search.value.trim() || undefined } }) }
useStoreSeo('Bài viết chăm sóc da và cơ thể | MIÊN Spa', 'Hướng dẫn chăm sóc da và cơ thể, câu chuyện từ MIÊN cùng các sản phẩm liên quan.', '/bai-viet')
const pageSize = computed({ get: () => [7, 14, 28].includes(Number(route.query.pageSize)) ? Number(route.query.pageSize) : 7, set: value => { router.push({ query: { ...route.query, page: undefined, pageSize: value === 7 ? undefined : String(value) } }) } })
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')
useHead(() => ({ link: [{ rel: 'canonical', href: siteUrl + '/bai-viet' + (page.value > 1 ? '?page=' + page.value : '') + (pageSize.value !== 7 ? (page.value > 1 ? '&' : '?') + 'pageSize=' + pageSize.value : '') }] }))
useSeoMeta({ robots: () => submittedSearch.value ? 'noindex, follow' : 'index, follow' })
const listing = ref<HTMLElement | null>(null)
const emptyMeta: PaginationMeta = { page: 1, pageSize: 7, total: 0, totalPages: 1, from: 0, to: 0 }
const { data: response, pending, error, refresh } = await useAsyncData(
  'public-posts',
  () => $fetch<PaginatedResponse<PostSummary>>('/api/posts', { query: { page: page.value, pageSize: pageSize.value, q: submittedSearch.value } }),
  { watch: [page, pageSize, submittedSearch] },
)
const posts = computed(() => response.value?.data ?? [])
const pagination = computed(() => response.value?.meta ?? { ...emptyMeta, pageSize: pageSize.value })
const leadPost = computed(() => posts.value[0])
const remainingPosts = computed(() => posts.value.slice(1))

watch(() => response.value?.meta.page, resolvedPage => {
  if (resolvedPage && resolvedPage !== page.value) page.value = resolvedPage
})

function selectPage(value: number) {
  page.value = value
  nextTick(() => listing.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function selectPageSize(value: number) { pageSize.value = value }

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main>
      <SitePageHero
        eyebrow="Ghi chép từ MIÊN"
        title="Đọc chậm một chút,"
        accent-title="để hiểu cơ thể hơn."
        description="Những hướng dẫn có thể thực hành tại nhà, kiến thức chăm sóc vừa đủ và câu chuyện phía sau không gian MIÊN."
        :breadcrumbs="[{ label: 'Trang chủ', to: '/' }, { label: 'Bài viết' }]"
      />

      <form class="mx-auto mb-12 grid max-w-[1400px] gap-4 px-5 sm:grid-cols-[1fr_auto] sm:items-end md:px-10" @submit.prevent="searchPosts"><label class="field-block">Tìm bài viết<CommonInput v-model="search" type="search" placeholder="Nhập chủ đề bạn muốn đọc" /></label><button class="button-primary justify-center" type="submit">Tìm bài viết</button></form>
      <section ref="listing" class="scroll-mt-6 px-5 pb-24 md:px-10 md:pb-32 lg:px-14">
        <div v-if="pending" class="mx-auto grid max-w-[1400px] animate-pulse gap-10 lg:grid-cols-[1.15fr_0.85fr]"><div class="aspect-[16/11] bg-[#e3ded2]" /><div class="space-y-5 py-8"><div class="h-3 w-28 bg-[#ddd8cc]" /><div class="h-28 bg-[#ddd8cc]" /><div class="h-16 bg-[#ddd8cc]" /></div></div>

        <div v-else-if="error" class="mx-auto max-w-lg py-20 text-center"><p class="font-display text-3xl font-light">Chưa thể mở trang bài viết.</p><p class="mt-3 text-sm leading-6 text-[#6b7167]">Kết nối đang gián đoạn. Bạn có thể thử tải lại sau ít phút.</p><button type="button" class="button-primary mt-7" @click="() => refresh()">Thử lại</button></div>

        <div v-else-if="!leadPost" class="mx-auto max-w-xl py-20 text-center"><p class="section-label">Đang chuẩn bị</p><h2 class="mt-5 font-display text-4xl font-light">{{ submittedSearch ? 'Chưa có bài viết phù hợp.' : 'Những bài viết đầu tiên sắp được mở.' }}</h2><p class="mt-4 text-sm leading-6 text-[#6b7167]">Bạn có thể tìm chủ đề khác hoặc quay lại sau. MIÊN đang biên tập những ghi chép đủ hữu ích để bạn có thể mang về và thực hành.</p></div>

        <div v-else class="mx-auto max-w-[1400px]">
          <NuxtLink :to="`/bai-viet/${leadPost.slug}`" class="group grid gap-9 border-b border-[#78816f]/25 pb-16 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-[7vw]">
            <div class="aspect-[16/11] overflow-hidden bg-[#dcd7ca]"><img :src="leadPost.featuredImage || '/images/mien-spa-hero.png'" :alt="leadPost.title" class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"></div>
            <div class="lg:pr-[3vw]">
              <div class="flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#717a6c]"><span>{{ leadPost.category }}</span><span class="h-px w-7 bg-[#78816f]/45" /><time :datetime="leadPost.publishedAt || undefined">{{ formatDate(leadPost.publishedAt) }}</time></div>
              <h2 class="mt-6 font-display text-4xl font-light leading-[1.02] tracking-[-0.04em] md:text-6xl">{{ leadPost.title }}</h2>
              <p class="mt-6 max-w-[50ch] text-sm leading-7 text-[#676e63]">{{ leadPost.excerpt }}</p>
              <span class="mt-8 inline-flex items-center gap-3 border-b border-[#66715d]/45 pb-2 text-xs font-semibold transition-all duration-300 group-hover:gap-5">Đọc bài viết <AppIcon name="arrow" :size="15" /></span>
            </div>
          </NuxtLink>

          <div class="grid gap-x-10 lg:grid-cols-2">
            <NuxtLink v-for="post in remainingPosts" :key="post.id" :to="`/bai-viet/${post.slug}`" class="group grid gap-6 border-b border-[#78816f]/25 py-10 sm:grid-cols-[180px_1fr] sm:items-center md:py-12">
              <div class="aspect-[4/3] overflow-hidden bg-[#ddd8cc]"><img loading="lazy" decoding="async" :src="post.featuredImage || '/images/mien-spa-hero.png'" :alt="post.title" class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"></div>
              <div><p class="text-[0.63rem] font-semibold uppercase tracking-[0.15em] text-[#737b6e]">{{ post.category }} · {{ formatDate(post.publishedAt) }}</p><h2 class="mt-3 font-display text-3xl font-light leading-[1.08] tracking-[-0.035em]">{{ post.title }}</h2><p class="mt-3 line-clamp-2 text-xs leading-6 text-[#6d7369]">{{ post.excerpt }}</p></div>
            </NuxtLink>
          </div>
          <nav class="mt-8 flex justify-between gap-5 text-sm" aria-label="Liên kết trang bài viết"><NuxtLink v-if="pagination.page > 1" :to="{ query: { ...route.query, page: pagination.page - 1 } }" class="text-link" rel="prev">Trang trước</NuxtLink><NuxtLink v-if="pagination.page < pagination.totalPages" :to="{ query: { ...route.query, page: pagination.page + 1 } }" class="text-link ml-auto" rel="next">Trang tiếp theo</NuxtLink></nav>
          <AppPagination class="mt-12" :meta="pagination" :page-sizes="[7, 14, 28]" @update:page="selectPage" @update:page-size="selectPageSize" />
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
