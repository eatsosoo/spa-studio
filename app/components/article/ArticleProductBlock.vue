<script setup lang="ts">
import type { Product } from '~/types'

const props = withDefaults(defineProps<{ productId: number; interactive?: boolean }>(), { interactive: true })
const added = ref(false)
const { add } = useCart()
const { data, pending } = useAsyncData(`article-product-${props.productId}`, () => $fetch<{ data: Product[] }>(`/api/products?ids=${props.productId}`))
const product = computed(() => data.value?.data[0])

function addProduct() {
  if (!product.value || !props.interactive) return
  added.value = add(product.value)
  if (added.value) window.setTimeout(() => { added.value = false }, 1800)
}
</script>

<template>
  <div class="article-product-block" contenteditable="false">
    <div v-if="pending" class="article-product-skeleton" aria-label="Đang tải sản phẩm" />
    <div v-else-if="product" class="grid gap-5 sm:grid-cols-[148px_minmax(0,1fr)_auto] sm:items-center">
      <img :src="product.image" :alt="product.name" class="aspect-square w-full object-cover" :style="{ objectPosition: product.imagePosition }">
      <div>
        <p class="article-product-eyebrow">Chọn từ MIÊN · {{ product.status }}</p>
        <h3>{{ product.name }}</h3>
        <p class="article-product-description">{{ product.shortDescription }}</p>
        <p class="article-product-price">{{ new Intl.NumberFormat('vi-VN').format(product.price) }}₫</p>
      </div>
      <div class="flex gap-2 sm:flex-col">
        <NuxtLink :to="`/san-pham/${product.slug}`" class="app-action app-action--secondary whitespace-nowrap">Xem sản phẩm</NuxtLink>
        <button v-if="interactive" type="button" class="app-action app-action--primary whitespace-nowrap" :disabled="product.stock <= 0" @click="addProduct">
          {{ added ? 'Đã thêm' : product.stock > 0 ? 'Thêm vào giỏ' : 'Tạm hết hàng' }}
        </button>
      </div>
    </div>
    <div v-else class="py-6 text-sm text-[#7b8176]">Sản phẩm này hiện không còn được bán. Bài viết vẫn được giữ nguyên.</div>
  </div>
</template>
