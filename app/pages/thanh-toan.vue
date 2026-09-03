<script setup lang="ts">
import type { CartProduct } from '~/types'
import { formatPrice } from '~/utils/currency'

useHead({ title: 'Thanh toán | MIÊN Spa' })
const router = useRouter()
const { lines, hydrated, hydrate, clear } = useCart()
const products = ref<CartProduct[]>([])
const checking = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ customerName: '', customerPhone: '', customerEmail: '', shippingAddressLine: '', shippingWard: '', shippingDistrict: '', shippingProvince: 'TP. Hồ Chí Minh', customerNote: '', paymentMethod: 'cod' as 'cod' | 'bank_transfer' })
const idempotencyKey = ref('')
const accessToken = ref('')
const validCart = computed(() => products.value.length > 0 && products.value.every(product => product.available))
const subtotal = computed(() => products.value.reduce((sum, product) => sum + product.price * product.requestedQuantity, 0))
const shippingFee = computed(() => subtotal.value >= 1_200_000 ? 0 : 40_000)
const total = computed(() => subtotal.value + shippingFee.value)

function failureMessage(value: unknown) {
  const error = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return error.data?.statusMessage ?? error.statusMessage ?? error.message ?? 'Không thể đặt hàng. Vui lòng thử lại.'
}

async function validateCart() {
  checking.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: CartProduct[] }>('/api/cart/validate', { method: 'POST', body: { items: lines.value } })
    products.value = response.data
  } catch (error) {
    errorMessage.value = failureMessage(error)
  } finally {
    checking.value = false
  }
}

async function submitOrder() {
  if (!validCart.value || submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: { reference: string; accessToken: string } }>('/api/orders', { method: 'POST', body: { ...form, items: lines.value, idempotencyKey: idempotencyKey.value, accessToken: accessToken.value } })
    localStorage.setItem(`mien-order-${response.data.reference}`, response.data.accessToken)
    clear()
    await router.push({ path: `/don-hang/${response.data.reference}`, query: { token: response.data.accessToken } })
  } catch (error) {
    errorMessage.value = failureMessage(error)
    await validateCart()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  hydrate()
  idempotencyKey.value = crypto.randomUUID().replaceAll('-', '')
  accessToken.value = crypto.randomUUID().replaceAll('-', '')
  void validateCart()
})
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="px-5 pb-28 pt-12 md:px-10 md:pt-20 lg:px-14"><div class="mx-auto max-w-[1300px]"><div class="border-b border-[#78816f]/25 pb-9"><p class="section-label">Thông tin giao hàng</p><h1 class="mt-4 font-display text-5xl font-light tracking-[-0.045em] md:text-7xl">Hoàn tất đơn hàng.</h1></div>
      <div v-if="checking" class="my-14 h-64 animate-pulse bg-[#e2ddd1]" />
      <div v-else-if="!hydrated || !lines.length" class="py-20 text-center"><p class="text-sm text-[#6d7469]">Giỏ hàng đang trống.</p><NuxtLink to="/san-pham" class="button-primary mt-6">Chọn sản phẩm</NuxtLink></div>
      <div v-else class="grid gap-14 py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-24">
        <form id="checkout-form" class="grid gap-8" @submit.prevent="submitOrder">
          <div v-if="errorMessage" class="border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-xs leading-6 text-[#784b43]">{{ errorMessage }}</div>
          <div v-if="!validCart" class="border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-xs leading-6 text-[#784b43]">Tồn kho đã thay đổi. Vui lòng quay lại giỏ hàng để cập nhật số lượng.</div>
          <fieldset class="grid gap-5 sm:grid-cols-2"><legend class="mb-5 text-sm font-semibold">Người nhận</legend><label class="field-block sm:col-span-2">Họ và tên<input v-model.trim="form.customerName" required minlength="2" autocomplete="name"></label><label class="field-block">Số điện thoại<input v-model.trim="form.customerPhone" required type="tel" autocomplete="tel" placeholder="090 000 0000"></label><label class="field-block">Email <i>Không bắt buộc</i><input v-model.trim="form.customerEmail" type="email" autocomplete="email"></label></fieldset>
          <fieldset class="grid gap-5 sm:grid-cols-2"><legend class="mb-5 text-sm font-semibold">Địa chỉ giao hàng</legend><label class="field-block sm:col-span-2">Số nhà, tên đường<input v-model.trim="form.shippingAddressLine" required autocomplete="address-line1"></label><label class="field-block">Phường / xã<input v-model.trim="form.shippingWard" autocomplete="address-level3"></label><label class="field-block">Quận / huyện<input v-model.trim="form.shippingDistrict" required autocomplete="address-level2"></label><label class="field-block sm:col-span-2">Tỉnh / thành phố<input v-model.trim="form.shippingProvince" required autocomplete="address-level1"></label><label class="field-block sm:col-span-2">Ghi chú <i>Không bắt buộc</i><textarea v-model.trim="form.customerNote" rows="3" /></label></fieldset>
          <fieldset><legend class="mb-5 text-sm font-semibold">Thanh toán</legend><div class="grid gap-3"><label class="flex cursor-pointer gap-3 border border-[#78816f]/25 p-4 text-sm"><input v-model="form.paymentMethod" type="radio" value="cod">Thanh toán khi nhận hàng</label><label class="flex cursor-pointer gap-3 border border-[#78816f]/25 p-4 text-sm"><input v-model="form.paymentMethod" type="radio" value="bank_transfer">Chuyển khoản ngân hàng</label></div></fieldset>
        </form>
        <aside class="h-max border-t border-[#78816f]/25 pt-6 lg:sticky lg:top-28"><h2 class="text-sm font-semibold">Đơn hàng</h2><div class="mt-5 divide-y divide-[#78816f]/15 border-y border-[#78816f]/15"><div v-for="product in products" :key="product.id" class="flex justify-between gap-5 py-4 text-xs"><span>{{ product.name }} × {{ product.requestedQuantity }}<small v-if="product.message" class="mt-1 block text-[#8b5148]">{{ product.message }}</small></span><strong>{{ formatPrice(product.price * product.requestedQuantity) }}</strong></div></div><div class="mt-5 grid gap-3 text-xs"><div class="flex justify-between"><span>Tạm tính</span><span>{{ formatPrice(subtotal) }}</span></div><div class="flex justify-between"><span>Phí giao hàng</span><span>{{ shippingFee ? formatPrice(shippingFee) : 'Miễn phí' }}</span></div><div class="flex justify-between border-t border-[#78816f]/25 pt-4 text-base"><strong>Tổng cộng</strong><strong>{{ formatPrice(total) }}</strong></div></div><button form="checkout-form" type="submit" class="button-primary mt-7 w-full justify-center" :disabled="submitting || !validCart">{{ submitting ? 'Đang giữ hàng…' : 'Đặt hàng' }} <AppIcon v-if="!submitting" name="arrow" :size="16" /></button><NuxtLink v-if="!validCart" to="/gio-hang" class="text-link mt-4 block text-center">Quay lại giỏ hàng</NuxtLink><p class="mt-4 text-[0.66rem] leading-5 text-[#737a70]">Khi đặt hàng thành công, số lượng sẽ được giữ trong 24 giờ để MIÊN xử lý đơn.</p></aside>
      </div>
    </div></main>
    <SiteFooter />
  </div>
</template>
