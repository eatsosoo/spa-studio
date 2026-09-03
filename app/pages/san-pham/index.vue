<script setup lang="ts">
import type { Product } from '~/types'

useHead({ title: 'Sản phẩm chăm sóc | MIÊN Spa' })
useSeoMeta({ description: 'Các sản phẩm chăm sóc da và cơ thể được MIÊN chọn để tiếp tục nghi thức nghỉ ngơi tại nhà.' })

const { data: response, pending, error, refresh } = await useAsyncData('store-products', () => $fetch<{ data: Product[] }>('/api/products'))
const products = computed(() => response.value?.data ?? [])
const categories = computed(() => ['Tất cả', ...new Set(products.value.map(product => product.category))])
const activeCategory = ref('Tất cả')
const visibleProducts = computed(() => activeCategory.value === 'Tất cả' ? products.value : products.value.filter(product => product.category === activeCategory.value))
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main>
      <section class="px-5 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24 lg:px-14">
        <div class="mx-auto grid max-w-[1400px] gap-12 border-b border-[#78816f]/25 pb-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <p class="section-label">Nghi thức tại nhà</p>
          <div>
            <h1 class="max-w-[900px] font-display text-[clamp(3.5rem,7vw,7.4rem)] font-light leading-[0.88] tracking-[-0.055em]">
              Chăm sóc tiếp,<br><span class="italic text-[#66715d]">sau khi rời MIÊN.</span>
            </h1>
            <p class="mt-9 max-w-[55ch] text-sm leading-7 text-[#62695f]">Những công thức dịu, ít mùi hương và vừa đủ để bạn giữ lại cảm giác thư thái trong những ngày ở nhà.</p>
          </div>
        </div>
      </section>

      <section class="px-5 pb-28 md:px-10 md:pb-36 lg:px-14">
        <div class="mx-auto max-w-[1400px]">
          <div class="mb-12 flex max-w-full gap-2 overflow-x-auto border-b border-[#78816f]/20 pb-5">
            <button v-for="category in categories" :key="category" type="button" class="store-filter" :class="activeCategory === category ? 'store-filter--active' : ''" @click="activeCategory = category">{{ category }}</button>
          </div>

          <div v-if="pending" class="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Đang tải sản phẩm">
            <div v-for="index in 4" :key="index"><div class="aspect-[4/5] animate-pulse rounded-[0.35rem] bg-[#e2ddd1]" /><div class="mt-5 h-5 w-2/3 animate-pulse rounded-full bg-[#ddd8cc]" /></div>
          </div>
          <div v-else-if="error" class="border-y border-[#94685f]/25 py-12 text-center"><p class="text-sm font-semibold text-[#754b43]">Không thể tải danh sách sản phẩm.</p><button type="button" class="text-link mt-4" @click="() => refresh()">Thử lại</button></div>
          <TransitionGroup v-else-if="visibleProducts.length" name="product-list" tag="div" class="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProductCard v-for="(product, index) in visibleProducts" :key="product.id" :product="product" :index="index" />
          </TransitionGroup>
          <p v-else class="border-y border-[#78816f]/20 py-12 text-center text-sm text-[#6c7368]">Chưa có sản phẩm trong nhóm này.</p>
        </div>
      </section>

      <section class="bg-[#34412f] px-5 py-20 text-[#f1ecdf] md:px-10 md:py-28 lg:px-14">
        <div class="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <h2 class="max-w-[760px] font-display text-5xl font-light leading-[0.95] tracking-[-0.04em] md:text-7xl">Chưa biết làn da đang cần gì?</h2>
          <div>
            <p class="max-w-[44ch] text-sm leading-7 text-[#cdd4c8]">Ghé MIÊN để được quan sát da và chọn một chu trình ngắn, không mua thừa những bước không cần thiết.</p>
            <NuxtLink to="/?dat-lich=1" class="mt-7 inline-flex items-center gap-4 rounded-full border border-[#dbe1d5]/35 px-5 py-3.5 text-xs font-semibold transition hover:bg-[#f0ece2] hover:text-[#34412f] active:scale-[0.98]">Đặt lịch tư vấn <AppIcon name="arrow" :size="16" /></NuxtLink>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
