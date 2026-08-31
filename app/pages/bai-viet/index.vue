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

const page = ref(1)
const pageSize = ref(7)
const listing = ref<HTMLElement | null>(null)
const emptyMeta: PaginationMeta = { page: 1, pageSize: 7, total: 0, totalPages: 1, from: 0, to: 0 }
const { data: response, pending, error, refresh } = await useAsyncData(
  'public-posts',
  () => $fetch<PaginatedResponse<PostSummary>>('/api/posts', { query: { page: page.value, pageSize: pageSize.value } }),
  { watch: [page, pageSize] },
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

function selectPageSize(value: number) {
  page.value = 1
  pageSize.value = value
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

useSeoMeta({
  title: 'Bài viết | MIÊN Spa',
  description: 'Những ghi chép từ MIÊN về chăm sóc cơ thể, làn da và cách tạo một khoảng nghỉ vừa đủ trong ngày.',
})
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main>
      <section class="px-5 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24 lg:px-14">
        <div class="mx-auto grid max-w-[1400px] gap-12 border-b border-[#78816f]/25 pb-14 lg:grid-cols-[0.42fr_1fr] lg:items-end">
          <p class="section-label">Ghi chép từ MIÊN</p>
          <div>
            <h1 class="max-w-[840px] font-display text-5xl font-light leading-[0.94] tracking-[-0.045em] md:text-7xl">Đọc chậm một chút,<br><span class="italic text-[#66715d]">để hiểu cơ thể hơn.</span></h1>
            <p class="mt-7 max-w-[58ch] text-sm leading-7 text-[#666d62]">Những hướng dẫn có thể thực hành tại nhà, kiến thức chăm sóc vừa đủ và câu chuyện phía sau không gian MIÊN.</p>
          </div>
        </div>
      </section>

      <section ref="listing" class="scroll-mt-6 px-5 pb-24 md:px-10 md:pb-32 lg:px-14">
        <div v-if="pending" class="mx-auto grid max-w-[1400px] animate-pulse gap-10 lg:grid-cols-[1.15fr_0.85fr]"><div class="aspect-[16/11] bg-[#e3ded2]" /><div class="space-y-5 py-8"><div class="h-3 w-28 bg-[#ddd8cc]" /><div class="h-28 bg-[#ddd8cc]" /><div class="h-16 bg-[#ddd8cc]" /></div></div>

        <div v-else-if="error" class="mx-auto max-w-lg py-20 text-center"><p class="font-display text-3xl font-light">Chưa thể mở trang bài viết.</p><p class="mt-3 text-sm leading-6 text-[#6b7167]">Kết nối đang gián đoạn. Bạn có thể thử tải lại sau ít phút.</p><button type="button" class="button-primary mt-7" @click="() => refresh()">Thử lại</button></div>

        <div v-else-if="!leadPost" class="mx-auto max-w-xl py-20 text-center"><p class="section-label">Đang chuẩn bị</p><h2 class="mt-5 font-display text-4xl font-light">Những bài viết đầu tiên sắp được mở.</h2><p class="mt-4 text-sm leading-6 text-[#6b7167]">MIÊN đang biên tập những ghi chép đủ hữu ích để bạn có thể mang về và thực hành.</p></div>

        <div v-else class="mx-auto max-w-[1400px]">
          <NuxtLink :to="`/bai-viet/${leadPost.slug}`" class="group grid gap-9 border-b border-[#78816f]/25 pb-16 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-[7vw]">
            <div class="aspect-[16/11] overflow-hidden bg-[#dcd7ca]"><img :src="leadPost.featuredImage || '/images/mien-spa-hero.png'" :alt="leadPost.title" class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"></div>
            <div class="lg:pr-[3vw]">
              <div class="flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#717a6c]"><span>{{ leadPost.category }}</span><span class="h-px w-7 bg-[#78816f]/45" /><time>{{ formatDate(leadPost.publishedAt) }}</time></div>
              <h2 class="mt-6 font-display text-4xl font-light leading-[1.02] tracking-[-0.04em] md:text-6xl">{{ leadPost.title }}</h2>
              <p class="mt-6 max-w-[50ch] text-sm leading-7 text-[#676e63]">{{ leadPost.excerpt }}</p>
              <span class="mt-8 inline-flex items-center gap-3 border-b border-[#66715d]/45 pb-2 text-xs font-semibold transition-all duration-300 group-hover:gap-5">Đọc bài viết <AppIcon name="arrow" :size="15" /></span>
            </div>
          </NuxtLink>

          <div class="grid gap-x-10 lg:grid-cols-2">
            <NuxtLink v-for="post in remainingPosts" :key="post.id" :to="`/bai-viet/${post.slug}`" class="group grid gap-6 border-b border-[#78816f]/25 py-10 sm:grid-cols-[180px_1fr] sm:items-center md:py-12">
              <div class="aspect-[4/3] overflow-hidden bg-[#ddd8cc]"><img :src="post.featuredImage || '/images/mien-spa-hero.png'" :alt="post.title" class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"></div>
              <div><p class="text-[0.63rem] font-semibold uppercase tracking-[0.15em] text-[#737b6e]">{{ post.category }} · {{ formatDate(post.publishedAt) }}</p><h2 class="mt-3 font-display text-3xl font-light leading-[1.08] tracking-[-0.035em]">{{ post.title }}</h2><p class="mt-3 line-clamp-2 text-xs leading-6 text-[#6d7369]">{{ post.excerpt }}</p></div>
            </NuxtLink>
          </div>
          <AppPagination class="mt-12" :meta="pagination" :page-sizes="[7, 14, 28]" @update:page="selectPage" @update:page-size="selectPageSize" />
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
