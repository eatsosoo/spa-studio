<script setup lang="ts">
import type { Product } from '~/types'
import { formatPrice } from '~/utils/currency'

const route = useRoute()
const { data: productResponse, error } = await useAsyncData(`store-product-${route.params.slug}`, () => $fetch<{ data: Product }>(`/api/products/${route.params.slug}`))
const product = computed(() => productResponse.value?.data)

if (error.value || !product.value) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm.' })

const { data: productsResponse } = await useAsyncData('store-products', () => $fetch<{ data: Product[] }>('/api/products'))
const relatedProducts = computed(() => (productsResponse.value?.data ?? []).filter(item => item.id !== product.value?.id).slice(0, 4))

useHead({ title: () => `${product.value?.name ?? 'Sản phẩm'} | MIÊN Spa` })
useSeoMeta({ description: () => product.value?.shortDescription ?? '' })

const quantity = ref(1)
const added = ref(false)
const { add } = useCart()
let addedTimer: number | undefined

function addToBag() {
  if (!product.value || !add(product.value, quantity.value)) return
  added.value = true
  if (addedTimer) clearTimeout(addedTimer)
  addedTimer = window.setTimeout(() => { added.value = false }, 2200)
}
onBeforeUnmount(() => { if (addedTimer) clearTimeout(addedTimer) })
</script>

<template>
  <div v-if="product" class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="px-5 pb-28 pt-10 md:px-10 md:pt-16 lg:px-14">
      <div class="mx-auto max-w-[1400px]">
        <NuxtLink to="/san-pham" class="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-[#6b7465] transition hover:text-[#35412f]">
          <span class="rotate-180"><AppIcon name="arrow" :size="14" /></span> Trở lại cửa hàng
        </NuxtLink>

        <section class="mt-8 grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
          <div class="relative min-h-[58vh] overflow-hidden rounded-[0.35rem] bg-[#e5dfd2] lg:min-h-[720px]">
            <img :src="product.image" :alt="product.name" class="absolute inset-0 h-full w-full scale-[1.28] object-cover" :style="{ objectPosition: product.imagePosition }">
            <span class="absolute left-6 top-6 rounded-full border border-[#f5f0e5]/50 bg-[#f5f0e5]/75 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#465140] backdrop-blur-md">{{ product.category }}</span>
          </div>

          <div class="self-center lg:pr-[5vw]">
            <p class="section-label">{{ product.size }} · {{ product.sku }}</p>
            <h1 class="mt-6 font-display text-[clamp(3.7rem,6.5vw,7rem)] font-light leading-[0.86] tracking-[-0.055em]">{{ product.name }}</h1>
            <p class="mt-8 max-w-[50ch] text-sm leading-7 text-[#62695f]">{{ product.description }}</p>
            <p class="mt-8 text-xl font-semibold tabular-nums tracking-[-0.025em]">{{ formatPrice(product.price) }}</p>

            <div class="mt-9 flex items-center gap-3">
              <div class="flex h-12 items-center rounded-full border border-[#687461]/30 px-2">
                <button type="button" class="grid size-8 place-items-center rounded-full transition hover:bg-[#e2ded3]" aria-label="Giảm số lượng" @click="quantity = Math.max(1, quantity - 1)">−</button>
                <span class="w-8 text-center text-xs font-semibold tabular-nums">{{ quantity }}</span>
                <button type="button" class="grid size-8 place-items-center rounded-full transition hover:bg-[#e2ded3] disabled:cursor-not-allowed disabled:opacity-35" aria-label="Tăng số lượng" :disabled="quantity >= product.stock" @click="quantity = Math.min(product.stock, quantity + 1)">+</button>
              </div>
              <button type="button" class="button-primary min-h-12 flex-1 justify-center" :disabled="product.stock === 0" @click="addToBag">
                <template v-if="product.stock === 0">Tạm hết hàng</template>
                <template v-else-if="added"><AppIcon name="check" :size="16" /> Đã thêm vào giỏ</template>
                <template v-else>Thêm vào giỏ <AppIcon name="arrow" :size="16" /></template>
              </button>
            </div>
            <p v-if="product.stock > 0 && product.stock <= 10" class="mt-3 text-[0.68rem] font-medium text-[#8a5e4e]">Chỉ còn {{ product.stock }} sản phẩm khả dụng.</p>
            <p class="mt-4 text-[0.68rem] text-[#777e73]">Miễn phí giao hàng tại TP. Hồ Chí Minh cho đơn từ 1.200.000đ.</p>

            <div class="mt-11 divide-y divide-[#78816f]/22 border-y border-[#78816f]/22">
              <details open class="product-detail-section">
                <summary>Điều sản phẩm mang lại <AppIcon name="plus" :size="16" /></summary>
                <ul class="grid gap-2 pb-5 text-xs leading-6 text-[#666e63]">
                  <li v-for="benefit in product.benefits" :key="benefit" class="flex gap-3"><span class="mt-2.5 size-1 rounded-full bg-[#61705a]" />{{ benefit }}</li>
                </ul>
              </details>
              <details class="product-detail-section">
                <summary>Thành phần chính <AppIcon name="plus" :size="16" /></summary>
                <p class="pb-5 text-xs leading-6 text-[#666e63]">{{ product.ingredients }}</p>
              </details>
              <details class="product-detail-section">
                <summary>Cách sử dụng <AppIcon name="plus" :size="16" /></summary>
                <p class="pb-5 text-xs leading-6 text-[#666e63]">{{ product.usage }}</p>
              </details>
            </div>
          </div>
        </section>

        <section class="mt-28 border-t border-[#78816f]/25 pt-12 md:mt-36">
          <div class="mb-12 flex items-end justify-between gap-5">
            <div>
              <p class="section-label">Dùng cùng nhau</p>
              <h2 class="mt-4 font-display text-4xl font-light tracking-[-0.035em] md:text-5xl">Một chu trình vừa đủ.</h2>
            </div>
            <NuxtLink to="/san-pham" class="text-link hidden sm:block">Xem tất cả</NuxtLink>
          </div>
          <div class="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><ProductCard v-for="item in relatedProducts" :key="item.id" :product="item" /></div>
        </section>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
