<script setup lang="ts">
import type { CustomerOrderDetail, StoreOrder } from '~/types'
import { siteInfo } from '~/data/site'
import { formatPrice } from '~/utils/currency'

useSeoMeta({ robots: 'noindex, nofollow' })

const route = useRoute()
const order = ref<CustomerOrderDetail | null>(null)
const source = ref<'session' | 'guest' | null>(null)
const pending = ref(true)
const errorMessage = ref('')

function normalizeGuestOrder(value: StoreOrder): CustomerOrderDetail {
  return {
    ...value,
    id: 0,
    itemCount: value.items.reduce((sum, item) => sum + item.quantity, 0),
    itemSummary: value.items.map(item => ({ productName: item.productName, quantity: item.quantity })),
    paymentMethod: '',
    paymentMethodLabel: 'Xác nhận cùng MIÊN',
    customerEmail: '',
    customerNote: null,
    shippingAddressLine: null,
    shippingWard: null,
    shippingDistrict: null,
    shippingProvince: null,
    discountAmount: 0,
    items: value.items.map(item => ({ ...item, discountAmount: 0 })),
    history: [],
  }
}

function errorText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Không tìm thấy đơn hàng hoặc liên kết đã hết hiệu lực.'
}

async function loadOrder() {
  const reference = String(route.params.reference ?? '')
  order.value = null
  source.value = null
  pending.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: CustomerOrderDetail }>(`/api/customer/orders/${encodeURIComponent(reference)}`)
    order.value = response.data
    source.value = 'session'
    return
  } catch (sessionError) {
    const token = localStorage.getItem(`mien-order-${reference}`) ?? ''
    if (!token) {
      errorMessage.value = errorText(sessionError)
      return
    }

    try {
      const response = await $fetch<{ data: StoreOrder }>(`/api/orders/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      order.value = normalizeGuestOrder(response.data)
      source.value = 'guest'
    } catch (guestError) {
      errorMessage.value = errorText(guestError)
    }
  } finally {
    pending.value = false
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

onMounted(loadOrder)
watch(() => route.params.reference, loadOrder)
useHead({ title: () => order.value ? `${order.value.reference} | MIÊN Spa` : 'Đơn hàng | MIÊN Spa' })
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="px-5 pb-28 pt-10 md:px-10 md:pt-16 lg:px-14">
      <CheckoutSteps v-if="source === 'guest'" :current="3" />
      <div class="mx-auto max-w-[1050px]">
        <NuxtLink v-if="source === 'session'" to="/don-hang" class="button-quiet mb-7 inline-flex items-center gap-2">
          <AppIcon name="arrow-left" :size="15" /> Đơn hàng của tôi
        </NuxtLink>

        <div v-if="pending" class="grid gap-4" aria-live="polite" aria-label="Đang tải đơn hàng">
          <div class="h-40 animate-pulse bg-[#e2ddd1]" />
          <div class="h-72 animate-pulse bg-[#e2ddd1]" />
        </div>

        <div v-else-if="errorMessage" class="py-20 text-center">
          <h1 class="font-display text-4xl font-light">Không thể mở đơn hàng.</h1>
          <p class="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#785149]">{{ errorMessage }}</p>
          <div class="mt-7 flex flex-wrap justify-center gap-3">
            <NuxtLink to="/dang-nhap?redirect=/don-hang" class="button-quiet">Đăng nhập để xem đơn</NuxtLink>
            <NuxtLink to="/san-pham" class="button-primary">Về cửa hàng</NuxtLink>
          </div>
        </div>

        <template v-else-if="order">
          <header class="border-b border-[#78816f]/25 pb-10">
            <p class="section-label">Đơn hàng {{ order.reference }}</p>
            <h1 class="mt-4 font-display text-5xl font-light tracking-[-0.045em] md:text-7xl">{{ source === 'guest' ? 'Cảm ơn bạn.' : 'Chi tiết đơn hàng.' }}</h1>
            <p class="mt-5 max-w-2xl text-sm leading-7 text-[#687064]">
              Đặt lúc {{ formatDate(order.createdAt) }}. MIÊN sẽ liên hệ theo số {{ order.customerPhone }} khi cần xác nhận thêm thông tin.
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              <StatusBadge :label="order.statusLabel" />
              <StatusBadge :label="order.fulfillmentStatusLabel" />
              <StatusBadge :label="order.paymentStatusLabel" />
            </div>
          </header>

          <div class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <section aria-labelledby="ordered-products-title">
                <p class="section-label">Sản phẩm</p>
                <h2 id="ordered-products-title" class="mt-3 text-2xl font-semibold">{{ order.itemCount }} sản phẩm trong đơn</h2>
                <div class="mt-6 divide-y divide-[#78816f]/18 border-y border-[#78816f]/18">
                  <article v-for="item in order.items" :key="item.id" class="grid grid-cols-[1fr_auto] gap-5 py-5 text-sm">
                    <div>
                      <h3 class="font-semibold">{{ item.productName }}</h3>
                      <p class="mt-1 text-xs text-[#747b70]">{{ item.sku }} · {{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</p>
                      <p v-if="item.discountAmount" class="mt-1 text-xs text-[#65745e]">Giảm {{ formatPrice(item.discountAmount) }}</p>
                    </div>
                    <strong class="tabular-nums">{{ formatPrice(item.totalAmount) }}</strong>
                  </article>
                </div>
              </section>

              <section v-if="order.history.length" class="mt-12" aria-labelledby="order-history-title">
                <p class="section-label">Tiến trình</p>
                <h2 id="order-history-title" class="mt-3 text-2xl font-semibold">Lịch sử trạng thái</h2>
                <ol class="mt-6 border-y border-[#78816f]/18">
                  <li v-for="entry in order.history" :key="entry.id" class="grid gap-2 border-b border-[#78816f]/15 py-5 last:border-b-0 sm:grid-cols-[170px_1fr]">
                    <time :datetime="entry.createdAt" class="text-xs text-[#777e73]">{{ formatDate(entry.createdAt) }}</time>
                    <div>
                      <p class="text-sm font-semibold">{{ entry.statusLabel }}</p>
                      <p v-if="entry.note" class="mt-1 text-xs leading-5 text-[#6c7368]">{{ entry.note }}</p>
                    </div>
                  </li>
                </ol>
              </section>
            </div>

            <aside class="space-y-8 border-t border-[#78816f]/25 pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <section>
                <h2 class="text-sm font-semibold">Thông tin nhận hàng</h2>
                <p class="mt-3 text-xs leading-6">
                  {{ order.customerName }}<br>
                  <a :href="`tel:${order.customerPhone}`" class="text-link">{{ order.customerPhone }}</a><br>
                  <a v-if="order.customerEmail" :href="`mailto:${order.customerEmail}`" class="text-link">{{ order.customerEmail }}</a>
                </p>
                <p class="mt-3 text-xs leading-6 text-[#626a5f]">{{ order.shippingAddress }}</p>
                <p v-if="order.customerNote" class="mt-3 text-xs italic leading-5 text-[#737a70]">“{{ order.customerNote }}”</p>
              </section>

              <section class="border-t border-[#78816f]/20 pt-6">
                <h2 class="text-sm font-semibold">Thanh toán</h2>
                <p class="mt-2 text-xs text-[#737a70]">{{ order.paymentMethodLabel }} · {{ order.paymentStatusLabel }}</p>
                <dl class="mt-5 grid gap-2 text-xs">
                  <div class="flex justify-between gap-4"><dt>Tạm tính</dt><dd>{{ formatPrice(order.subtotal) }}</dd></div>
                  <div v-if="order.discountAmount" class="flex justify-between gap-4 text-[#65745e]"><dt>Giảm giá</dt><dd>−{{ formatPrice(order.discountAmount) }}</dd></div>
                  <div class="flex justify-between gap-4"><dt>Giao hàng</dt><dd>{{ order.shippingFee ? formatPrice(order.shippingFee) : 'Miễn phí' }}</dd></div>
                  <div class="mt-2 flex justify-between gap-4 border-t border-[#78816f]/20 pt-3 text-sm"><dt class="font-semibold">Tổng thanh toán</dt><dd class="font-semibold">{{ formatPrice(order.totalAmount) }}</dd></div>
                </dl>
              </section>

              <section class="border-t border-[#78816f]/20 pt-6">
                <h2 class="text-sm font-semibold">Cần MIÊN hỗ trợ?</h2>
                <p class="mt-2 text-xs leading-5 text-[#737a70]">Liên hệ MIÊN và cung cấp mã {{ order.reference }} để được hỗ trợ nhanh hơn.</p>
                <div class="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                  <a :href="siteInfo.phoneHref" class="text-link">{{ siteInfo.phone }}</a>
                  <a :href="siteInfo.emailHref" class="text-link">Gửi email</a>
                </div>
              </section>

              <NuxtLink v-if="source === 'session'" to="/danh-gia" class="button-primary w-full justify-center">Đánh giá trải nghiệm</NuxtLink>
            </aside>
          </div>
        </template>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
