<script setup lang="ts">
import type { CustomerAccount } from '~/composables/useCustomerAuth'
import type { CustomerOrderSummary } from '~/types'
import { formatPrice } from '~/utils/currency'

useSeoMeta({
  title: 'Đơn hàng của tôi | MIÊN Spa',
  description: 'Theo dõi lịch sử mua hàng và trạng thái đơn hàng tại MIÊN Spa.',
  robots: 'noindex, nofollow',
})

const { customer, loaded } = useCustomerAuth()
const { data: meResponse } = await useAsyncData('orders-customer-me', () => $fetch<{ data: CustomerAccount | null }>('/api/customer-auth/me'))
customer.value = meResponse.value?.data ?? null
loaded.value = true

if (!customer.value) {
  await navigateTo({ path: '/dang-nhap', query: { redirect: '/don-hang' } })
}

const { data: response, pending, error, refresh } = await useAsyncData(
  'customer-orders',
  () => customer.value
    ? $fetch<{ data: CustomerOrderSummary[] }>('/api/customer/orders')
    : Promise.resolve(null),
  { watch: [customer] },
)

const orders = computed(() => response.value?.data ?? [])
const totalItems = computed(() => orders.value.reduce((sum, order) => sum + order.itemCount, 0))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function itemSummary(order: CustomerOrderSummary) {
  if (!order.itemSummary.length) return `${order.itemCount} sản phẩm`
  return order.itemSummary.map(item => `${item.productName} × ${item.quantity}`).join(' · ')
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10 md:pt-16 lg:px-14">
      <template v-if="customer">
        <header class="flex flex-col gap-7 border-b border-[#78816f]/25 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="section-label">Tài khoản khách hàng</p>
            <h1 class="mt-3 font-display text-5xl font-light tracking-[-0.04em] md:text-6xl">Đơn hàng của tôi.</h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-[#687064]">Xem trạng thái thanh toán, giao hàng và toàn bộ sản phẩm trong từng đơn.</p>
          </div>
          <nav class="flex flex-wrap gap-3" aria-label="Khu vực tài khoản">
            <NuxtLink to="/tai-khoan" class="button-quiet">Hồ sơ</NuxtLink>
            <NuxtLink to="/lich-cua-toi" class="button-quiet">Lịch hẹn</NuxtLink>
            <NuxtLink to="/danh-gia" class="button-quiet">Đánh giá</NuxtLink>
          </nav>
        </header>

        <section class="mt-8 grid gap-4 sm:grid-cols-2">
          <article class="bg-[#e5dfd1] p-6">
            <p class="section-label">Đơn đã đặt</p>
            <p class="mt-3 text-3xl font-semibold tabular-nums">{{ orders.length }}</p>
          </article>
          <article class="bg-[#dfe4d7] p-6">
            <p class="section-label">Sản phẩm</p>
            <p class="mt-3 text-3xl font-semibold tabular-nums">{{ totalItems }}</p>
          </article>
        </section>

        <section class="mt-14" aria-labelledby="order-history-title">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="section-label">Lịch sử mua hàng</p>
              <h2 id="order-history-title" class="mt-3 text-2xl font-semibold">Các đơn gần đây</h2>
            </div>
            <button v-if="error" type="button" class="button-quiet" @click="refresh()">Thử lại</button>
          </div>

          <div v-if="pending" class="mt-6 grid gap-4" aria-live="polite" aria-label="Đang tải đơn hàng">
            <div v-for="index in 3" :key="index" class="h-44 animate-pulse bg-[#e5dfd1]" />
          </div>

          <div v-else-if="error" class="mt-6 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-5 text-sm text-[#784b43]" role="alert">
            Chưa thể tải lịch sử đơn hàng. Vui lòng thử lại sau.
          </div>

          <div v-else-if="orders.length" class="mt-6 grid gap-4">
            <article v-for="order in orders" :key="order.id" class="border border-[#78816f]/20 bg-[#f8f4eb] p-5 transition-colors hover:border-[#66745f]/40 md:p-7">
              <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-3">
                    <NuxtLink :to="`/don-hang/${order.reference}`" class="text-lg font-semibold tracking-[-0.02em] underline-offset-4 hover:underline">{{ order.reference }}</NuxtLink>
                    <StatusBadge :label="order.statusLabel" />
                    <StatusBadge :label="order.fulfillmentStatusLabel" />
                  </div>
                  <time :datetime="order.createdAt" class="mt-2 block text-xs text-[#747b70]">{{ formatDate(order.createdAt) }}</time>
                  <p class="mt-4 line-clamp-2 text-sm leading-6 text-[#5f675c]">{{ itemSummary(order) }}</p>
                </div>

                <div class="grid shrink-0 gap-4 border-t border-[#78816f]/15 pt-5 sm:grid-cols-3 lg:min-w-[440px] lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                  <div>
                    <p class="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#7a8176]">Số lượng</p>
                    <p class="mt-2 text-sm font-semibold tabular-nums">{{ order.itemCount }}</p>
                  </div>
                  <div>
                    <p class="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#7a8176]">Thanh toán</p>
                    <p class="mt-2 text-sm font-semibold">{{ order.paymentMethodLabel }}</p>
                    <p class="mt-1 text-xs text-[#747b70]">{{ order.paymentStatusLabel }}</p>
                  </div>
                  <div class="sm:text-right">
                    <p class="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#7a8176]">Tổng tiền</p>
                    <p class="mt-2 text-base font-semibold tabular-nums">{{ formatPrice(order.totalAmount) }}</p>
                    <NuxtLink :to="`/don-hang/${order.reference}`" class="mt-2 inline-flex text-xs font-semibold underline underline-offset-4">Xem chi tiết</NuxtLink>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="mt-6 border border-dashed border-[#78816f]/30 px-6 py-14 text-center">
            <h3 class="font-display text-3xl font-light">Chưa có đơn hàng.</h3>
            <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-[#70776c]">Những sản phẩm bạn đặt tại MIÊN sẽ được lưu ở đây để tiện theo dõi.</p>
            <NuxtLink to="/san-pham" class="button-primary mt-6">Khám phá sản phẩm</NuxtLink>
          </div>
        </section>
      </template>
    </main>
    <SiteFooter />
  </div>
</template>
