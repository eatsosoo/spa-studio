<script setup lang="ts">
import type { Product } from '~/types'
import { formatPrice } from '~/utils/currency'

const props = defineProps<{ product: Product; index?: number }>()
const { add } = useCart()
const added = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
function quickAdd() {
  if (!add(props.product)) return
  added.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { added.value = false }, 2400)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <article>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="product-card group">
    <div class="relative aspect-[4/5] overflow-hidden rounded-[0.35rem] bg-[#e5dfd2]">
      <img loading="lazy" decoding="async" width="480" height="600" :src="product.image" :alt="product.name" class="h-full w-full scale-[1.48] object-cover transition duration-700 ease-out group-hover:scale-[1.54]" :style="{ objectPosition: product.imagePosition }">
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
  <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#78816f]/20 pt-4"><button type="button" class="text-link min-h-11 disabled:opacity-50" :disabled="product.stock <= 0" :aria-label="'Thêm ' + product.name + ' vào giỏ'" @click="quickAdd">{{ product.stock <= 0 ? 'Tạm hết hàng' : added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ' }}</button><NuxtLink v-if="added" to="/gio-hang" class="text-link" role="status">Xem giỏ hàng</NuxtLink><span v-else class="text-xs text-[#62695f]">{{ product.size }}</span></div>
  </article>
</template>
