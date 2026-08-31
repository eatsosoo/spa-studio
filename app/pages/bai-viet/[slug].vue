<script setup lang="ts">
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
}

const route = useRoute()
const copied = ref(false)
const { data: response } = await useAsyncData(`post-${route.params.slug}`, () => $fetch<{ data: PostDetail }>(`/api/posts/${route.params.slug}`))
const post = computed(() => response.value!.data)

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1800)
}

useSeoMeta({
  title: () => post.value.metaTitle || `${post.value.title} | MIÊN Spa`,
  description: () => post.value.metaDescription || post.value.excerpt,
  ogTitle: () => post.value.metaTitle || post.value.title,
  ogDescription: () => post.value.metaDescription || post.value.excerpt,
  ogImage: () => post.value.featuredImage || undefined,
})
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main>
      <article>
        <header class="px-5 pb-12 pt-14 md:px-10 md:pb-16 md:pt-20 lg:px-14">
          <div class="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[0.34fr_1fr]">
            <div class="pt-2"><NuxtLink to="/bai-viet" class="admin-inline-link"><AppIcon name="arrow-left" :size="15" /> Tất cả bài viết</NuxtLink></div>
            <div class="max-w-[980px]">
              <div class="flex flex-wrap items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.17em] text-[#6c7666]"><span>{{ post.category }}</span><span class="h-px w-8 bg-[#78816f]/45" /><time>{{ formatDate(post.publishedAt) }}</time></div>
              <h1 class="mt-7 max-w-[940px] font-display text-[clamp(3.1rem,6vw,6.8rem)] font-light leading-[0.9] tracking-[-0.052em]">{{ post.title }}</h1>
              <p v-if="post.excerpt" class="mt-8 max-w-[64ch] text-base leading-8 text-[#656c61] md:text-lg">{{ post.excerpt }}</p>
              <div class="mt-9 flex items-center justify-between border-t border-[#78816f]/25 pt-5 text-xs text-[#71786d]"><span>Biên soạn bởi {{ post.author }}</span><button type="button" class="inline-flex items-center gap-2 font-semibold text-[#4b5945] transition hover:text-[#303c2b] active:translate-y-px" @click="copyLink"><AppIcon :name="copied ? 'check' : 'link'" :size="15" />{{ copied ? 'Đã sao chép' : 'Sao chép liên kết' }}</button></div>
            </div>
          </div>
        </header>

        <div v-if="post.featuredImage" class="mx-auto max-w-[1600px] px-0 md:px-10 lg:px-14"><img :src="post.featuredImage" :alt="post.title" class="max-h-[760px] w-full object-cover"></div>

        <div class="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[170px_minmax(0,720px)] lg:gap-[8vw] lg:px-14">
          <aside class="hidden border-t border-[#78816f]/25 pt-5 text-[0.66rem] leading-5 text-[#777e72] lg:block"><p class="font-semibold uppercase tracking-[0.14em] text-[#5f6b58]">Đọc chậm</p><p class="mt-3">Dành một khoảng không bị ngắt quãng cho bài viết này.</p></aside>
          <ArticleBody :content="post.content" />
        </div>
      </article>

      <section v-if="post.related.length" class="border-t border-[#78816f]/25 px-5 py-20 md:px-10 md:py-28 lg:px-14">
        <div class="mx-auto max-w-[1400px]"><div class="flex items-end justify-between gap-8"><div><p class="section-label">Đọc tiếp</p><h2 class="mt-4 font-display text-4xl font-light tracking-[-0.04em] md:text-5xl">Những ghi chép khác</h2></div><NuxtLink to="/bai-viet" class="text-link hidden sm:block">Xem tất cả</NuxtLink></div><div class="mt-10 grid gap-8 md:grid-cols-2"><NuxtLink v-for="item in post.related" :key="item.slug" :to="`/bai-viet/${item.slug}`" class="group grid gap-5 border-t border-[#78816f]/25 pt-6 sm:grid-cols-[160px_1fr] sm:items-center"><img :src="item.featuredImage || '/images/mien-spa-hero.png'" :alt="item.title" class="aspect-[4/3] w-full object-cover"><div><p class="text-[0.65rem] text-[#777e72]">{{ formatDate(item.publishedAt) }}</p><h3 class="mt-2 font-display text-3xl font-light leading-[1.08] tracking-[-0.035em] transition group-hover:text-[#596950]">{{ item.title }}</h3></div></NuxtLink></div></div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
