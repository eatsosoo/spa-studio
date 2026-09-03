<script setup lang="ts">
import type { Product } from '~/types'
import { formatPrice } from '~/utils/currency'

defineProps<{ product: Product; index?: number }>()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="product-card group">
    <div class="relative aspect-[4/5] overflow-hidden rounded-[0.35rem] bg-[#e5dfd2]">
      <img :src="product.image" :alt="product.name" class="h-full w-full scale-[1.48] object-cover transition duration-700 ease-out group-hover:scale-[1.54]" :style="{ objectPosition: product.imagePosition }">
      <span class="absolute left-5 top-5 rounded-full border border-[#f5f0e5]/45 bg-[#f5f0e5]/75 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#465140] backdrop-blur-md">{{ product.category }}</span>
      <span v-if="product.stock === 0" class="absolute inset-x-5 bottom-5 rounded-sm bg-[#30392d]/88 px-3 py-2 text-center text-[0.65rem] font-semibold text-[#f5f0e6] backdrop-blur-md">Tạm hết hàng</span>
      <span v-else class="absolute bottom-5 right-5 grid size-11 place-items-center rounded-full bg-[#46573f] text-[#f5f0e6] transition duration-500 group-hover:rotate-[-45deg] group-hover:bg-[#33412f]"><AppIcon name="arrow" :size="17" /></span>
    </div>
    <div class="grid grid-cols-[1fr_auto] gap-4 pt-5">
      <div>
        <h2 class="font-display text-3xl font-light tracking-[-0.035em] text-[#313a2e]">{{ product.name }}</h2>
        <p class="mt-2 max-w-[40ch] text-xs leading-5 text-[#6c7368]">{{ product.shortDescription }}</p>
      </div>
      <p class="pt-1 text-xs font-semibold tabular-nums text-[#3e4938]">{{ formatPrice(product.price) }}</p>
    </div>
  </NuxtLink>
</template>
