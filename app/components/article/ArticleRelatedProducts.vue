<script setup lang="ts">
import type { Product } from '~/types'
import { formatPrice } from '~/utils/currency'

defineProps<{ products: Product[]; source: 'selected' | 'bestsellers' }>()
const { add } = useCart()
const addedId = ref<number | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
function addProduct(product: Product) {
  if (!add(product)) return
  addedId.value = product.id
  clearTimeout(timer)
  timer = setTimeout(() => { addedId.value = null }, 1800)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <aside v-if="products.length" class="self-start border-t border-[#78816f]/25 pt-5 lg:sticky lg:top-8">
    <p class="section-label">{{ source === 'selected' ? 'Sản phẩm liên quan' : 'Được mua nhiều' }}</p>
    <p class="mt-2 text-xs leading-5 text-[#777e72]">{{ source === 'selected' ? 'Được chọn riêng cho bài viết này.' : 'Gợi ý từ những sản phẩm đang bán chạy.' }}</p>
    <div class="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
      <article v-for="product in products" :key="product.id" class="group border-b border-[#78816f]/20 pb-6">
        <NuxtLink :to="`/san-pham/${product.slug}`" class="block overflow-hidden bg-[#e2ddd1]"><img loading="lazy" :src="product.image" :alt="product.name" class="aspect-[4/3] w-full scale-[1.25] object-cover transition duration-500 group-hover:scale-[1.3]" :style="{ objectPosition: product.imagePosition }"></NuxtLink>
        <div class="mt-3 flex items-start justify-between gap-3"><NuxtLink :to="`/san-pham/${product.slug}`" class="font-display text-xl leading-tight">{{ product.name }}</NuxtLink><span class="shrink-0 text-[0.68rem] font-semibold">{{ formatPrice(product.price) }}</span></div>
        <button type="button" class="text-link mt-3 min-h-10" :disabled="product.stock <= 0" @click="addProduct(product)">{{ addedId === product.id ? 'Đã thêm vào giỏ' : product.stock > 0 ? 'Thêm vào giỏ' : 'Tạm hết hàng' }}</button>
      </article>
    </div>
  </aside>
</template>
