<script setup lang="ts">
import type { StoreOrder } from '~/types'
import { formatPrice } from '~/utils/currency'

const route = useRoute()
const token = ref(String(route.query.token ?? ''))
const order = ref<StoreOrder | null>(null)
const pending = ref(true)
const errorMessage = ref('')

async function loadOrder() {
  if (!token.value && import.meta.client) token.value = localStorage.getItem(`mien-order-${route.params.reference}`) ?? ''
  if (!token.value) { errorMessage.value = 'Liên kết tra cứu đơn hàng không hợp lệ.'; pending.value = false; return }
  try {
    const response = await $fetch<{ data: StoreOrder }>(`/api/orders/${route.params.reference}`, { query: { token: token.value } })
    order.value = response.data
  } catch {
    errorMessage.value = 'Không tìm thấy đơn hàng hoặc liên kết đã hết hiệu lực.'
  } finally {
    pending.value = false
  }
}

onMounted(loadOrder)
useHead({ title: () => order.value ? `${order.value.reference} | MIÊN Spa` : 'Đơn hàng | MIÊN Spa' })
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]"><SiteHeader compact /><main class="px-5 pb-28 pt-14 md:px-10 md:pt-20 lg:px-14"><div class="mx-auto max-w-[1000px]"><div v-if="pending" class="h-72 animate-pulse bg-[#e2ddd1]" /><div v-else-if="errorMessage" class="py-20 text-center"><h1 class="font-display text-4xl font-light">Không thể mở đơn hàng.</h1><p class="mt-4 text-sm text-[#785149]">{{ errorMessage }}</p><NuxtLink to="/san-pham" class="button-primary mt-7">Về cửa hàng</NuxtLink></div><template v-else-if="order"><div class="border-b border-[#78816f]/25 pb-10"><p class="section-label">Đã nhận đơn {{ order.reference }}</p><h1 class="mt-4 font-display text-5xl font-light tracking-[-0.045em] md:text-7xl">Cảm ơn bạn.</h1><p class="mt-5 max-w-xl text-sm leading-7 text-[#687064]">MIÊN đã giữ sản phẩm trong kho và sẽ liên hệ theo số {{ order.customerPhone }} để xác nhận giao hàng.</p></div><div class="grid gap-12 py-10 md:grid-cols-[1fr_300px]"><section><div class="flex flex-wrap gap-2"><StatusBadge :label="order.statusLabel" /><StatusBadge :label="order.fulfillmentStatusLabel" /><StatusBadge :label="order.paymentStatusLabel" /></div><div class="mt-8 divide-y divide-[#78816f]/18 border-y border-[#78816f]/18"><div v-for="item in order.items" :key="item.id" class="flex justify-between gap-6 py-5 text-sm"><span>{{ item.productName }} × {{ item.quantity }}<small class="mt-1 block text-[#747b70]">{{ item.sku }}</small></span><strong>{{ formatPrice(item.totalAmount) }}</strong></div></div></section><aside class="border-t border-[#78816f]/25 pt-5 text-xs leading-6"><h2 class="text-sm font-semibold">Giao đến</h2><p class="mt-3">{{ order.customerName }}<br>{{ order.shippingAddress }}</p><div class="mt-6 grid gap-2 border-t border-[#78816f]/20 pt-5"><div class="flex justify-between"><span>Tạm tính</span><span>{{ formatPrice(order.subtotal) }}</span></div><div class="flex justify-between"><span>Giao hàng</span><span>{{ order.shippingFee ? formatPrice(order.shippingFee) : 'Miễn phí' }}</span></div><div class="mt-2 flex justify-between text-sm"><strong>Tổng cộng</strong><strong>{{ formatPrice(order.totalAmount) }}</strong></div></div></aside></div></template></div></main><SiteFooter /></div>
</template>
