<script setup lang="ts">
import type { CartProduct } from '~/types'
import { formatPrice } from '~/utils/currency'

useHead({ title: 'Giỏ hàng | MIÊN Spa' })
const { lines, hydrated, hydrate, setQuantity, remove, replace } = useCart()
const products = ref<CartProduct[]>([])
const pending = ref(false)
const errorMessage = ref('')
const valid = computed(() => products.value.length > 0 && products.value.every(product => product.available))
const subtotal = computed(() => products.value.reduce((sum, product) => sum + product.price * product.requestedQuantity, 0))

function failureMessage(value: unknown) {
  const error = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return error.data?.statusMessage ?? error.statusMessage ?? error.message ?? 'Không thể kiểm tra giỏ hàng.'
}

async function syncCart() {
  if (!lines.value.length) { products.value = []; return }
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: CartProduct[] }>('/api/cart/validate', { method: 'POST', body: { items: lines.value } })
    products.value = response.data
  } catch (error) {
    errorMessage.value = failureMessage(error)
  } finally {
    pending.value = false
  }
}

function changeQuantity(product: CartProduct, quantity: number) {
  setQuantity(product.id, quantity)
  void syncCart()
}

function removeProduct(productId: number) {
  remove(productId)
  void syncCart()
}

function reconcile() {
  replace(products.value.filter(product => product.purchasableQuantity > 0).map(product => ({ productId: product.id, quantity: product.purchasableQuantity })))
  void syncCart()
}

onMounted(() => { hydrate(); void syncCart() })
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="px-5 pb-28 pt-12 md:px-10 md:pt-20 lg:px-14">
      <div class="mx-auto max-w-[1400px]">
        <div class="border-b border-[#78816f]/25 pb-10"><p class="section-label">Cửa hàng MIÊN</p><h1 class="mt-4 font-display text-5xl font-light tracking-[-0.045em] md:text-7xl">Giỏ hàng của bạn.</h1><p class="mt-5 max-w-xl text-sm leading-7 text-[#687064]">Sản phẩm trong giỏ chưa được giữ kho. MIÊN sẽ kiểm tra lại số lượng ngay trước khi đặt hàng.</p></div>

        <div v-if="pending && !products.length" class="grid gap-8 py-14 lg:grid-cols-[1fr_360px]"><div class="h-44 animate-pulse bg-[#e2ddd1]" /><div class="h-52 animate-pulse bg-[#e2ddd1]" /></div>
        <div v-else-if="errorMessage" class="my-10 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-sm text-[#784b43]">{{ errorMessage }} <button type="button" class="ml-3 underline" @click="syncCart">Thử lại</button></div>
        <div v-else-if="hydrated && !lines.length" class="py-20 text-center"><h2 class="font-display text-4xl font-light">Giỏ hàng đang trống.</h2><p class="mt-3 text-sm text-[#6d7469]">Chọn một sản phẩm để tiếp tục nghi thức chăm sóc tại nhà.</p><NuxtLink to="/san-pham" class="button-primary mt-7">Xem sản phẩm <AppIcon name="arrow" :size="16" /></NuxtLink></div>
        <div v-else class="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-20">
          <section class="divide-y divide-[#78816f]/20 border-y border-[#78816f]/20">
            <article v-for="product in products" :key="product.id" class="grid gap-5 py-6 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <NuxtLink :to="`/san-pham/${product.slug}`" class="aspect-[4/5] overflow-hidden rounded-sm bg-[#e2ddd1]"><img :src="product.image" :alt="product.name" class="h-full w-full scale-[1.4] object-cover" :style="{ objectPosition: product.imagePosition }"></NuxtLink>
              <div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#75806f]">{{ product.sku }}</p><h2 class="mt-2 font-display text-2xl font-light">{{ product.name }}</h2><p class="mt-2 text-xs text-[#687064]">{{ formatPrice(product.price) }}</p><p v-if="product.message" class="mt-3 text-xs font-medium text-[#8b5148]">{{ product.message }}</p><button type="button" class="mt-4 text-[0.68rem] font-semibold text-[#7a554d] underline underline-offset-4" @click="removeProduct(product.id)">Xóa khỏi giỏ</button></div>
              <div class="flex h-11 w-max items-center rounded-full border border-[#687461]/30 px-2"><button type="button" class="grid size-8 place-items-center" aria-label="Giảm số lượng" @click="changeQuantity(product, product.requestedQuantity - 1)">−</button><span class="w-8 text-center text-xs font-semibold">{{ product.requestedQuantity }}</span><button type="button" class="grid size-8 place-items-center disabled:cursor-not-allowed disabled:opacity-35" :disabled="product.requestedQuantity >= product.stock" aria-label="Tăng số lượng" @click="changeQuantity(product, product.requestedQuantity + 1)">+</button></div>
            </article>
          </section>

          <aside class="h-max border-t border-[#78816f]/25 pt-6 lg:sticky lg:top-28"><h2 class="text-sm font-semibold">Tóm tắt đơn hàng</h2><div class="mt-6 grid gap-4 text-xs"><div class="flex justify-between"><span>Tạm tính</span><strong>{{ formatPrice(subtotal) }}</strong></div><div class="flex justify-between text-[#737a70]"><span>Phí giao hàng</span><span>Tính tại bước tiếp theo</span></div></div><div class="mt-6 border-t border-[#78816f]/20 pt-5"><button v-if="!valid" type="button" class="button-primary w-full justify-center" :disabled="pending" @click="reconcile">Cập nhật theo tồn kho</button><NuxtLink v-else to="/thanh-toan" class="button-primary w-full justify-center">Tiếp tục đặt hàng <AppIcon name="arrow" :size="16" /></NuxtLink><p v-if="!valid" class="mt-3 text-xs leading-5 text-[#8b5148]">Hãy cập nhật các sản phẩm không còn đủ tồn trước khi tiếp tục.</p></div></aside>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
