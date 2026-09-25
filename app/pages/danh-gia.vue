<script setup lang="ts">
import type { CustomerAccount } from '~/composables/useCustomerAuth'
import type { CustomerFeedback, CustomerFeedbackEligibility } from '~/types'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})
const route = useRoute()

if (!props.embedded && route.path === '/danh-gia') {
  await navigateTo(
    { path: '/tai-khoan', query: { tab: 'danh-gia' } },
    { replace: true },
  )
}

useSeoMeta({
  title: 'Đánh giá của tôi | MIÊN Spa',
  description: 'Gửi đánh giá cho sản phẩm và liệu trình đã trải nghiệm tại MIÊN Spa.',
  robots: 'noindex, nofollow',
})

type FeedbackOptions = {
  eligible: CustomerFeedbackEligibility[]
  feedback: CustomerFeedback[]
}

const { customer, loaded } = useCustomerAuth()
const { data: meResponse } = await useAsyncData('feedback-customer-me', () => $fetch<{ data: CustomerAccount | null }>('/api/customer-auth/me'))
customer.value = meResponse.value?.data ?? null
loaded.value = true

if (!customer.value && props.embedded) {
  await navigateTo({ path: '/dang-nhap', query: { redirect: '/tai-khoan?tab=danh-gia' } })
}

const { data: response, pending, error, refresh } = await useAsyncData(
  'customer-feedback-options',
  () => customer.value
    ? $fetch<{ data: FeedbackOptions }>('/api/customer/feedback/options')
    : Promise.resolve(null),
  { watch: [customer] },
)

const eligible = computed(() => response.value?.data.eligible ?? [])
const feedback = computed(() => response.value?.data.feedback ?? [])
const selected = ref<CustomerFeedbackEligibility | null>(null)
const rating = ref(0)
const content = ref('')
const submitting = ref(false)
const submitError = ref('')
const successMessage = ref('')

function typeLabel(type: CustomerFeedbackEligibility['type']) {
  return type === 'service' ? 'Liệu trình' : 'Sản phẩm'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function openForm(item: CustomerFeedbackEligibility) {
  selected.value = item
  rating.value = 0
  content.value = ''
  submitError.value = ''
  successMessage.value = ''
}

function closeForm() {
  if (submitting.value) return
  selected.value = null
  submitError.value = ''
}

function failureMessage(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Chưa thể gửi đánh giá lúc này.'
}

async function submitFeedback() {
  if (!selected.value) return
  if (rating.value < 1 || rating.value > 5) {
    submitError.value = 'Vui lòng chọn số sao cho trải nghiệm.'
    return
  }
  const message = content.value.trim()
  if (message.length < 10) {
    submitError.value = 'Nội dung đánh giá cần có ít nhất 10 ký tự.'
    return
  }

  submitting.value = true
  submitError.value = ''
  try {
    await $fetch('/api/customer/feedback', {
      method: 'POST',
      body: {
        type: selected.value.type,
        rating: rating.value,
        content: message,
        appointmentId: selected.value.appointmentId,
        serviceId: selected.value.serviceId,
        orderId: selected.value.orderId,
        productId: selected.value.productId,
      },
    })
    const subjectName = selected.value.name
    selected.value = null
    successMessage.value = `Cảm ơn bạn. Đánh giá cho ${subjectName} đã được gửi và đang chờ duyệt.`
    await refresh()
  } catch (failure) {
    submitError.value = failureMessage(failure)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div :class="embedded ? 'contents' : 'min-h-[100dvh] bg-[#f3efe5] text-[#293126]'">
    <SiteHeader v-if="!embedded" compact />
    <component :is="embedded ? 'div' : 'main'" :class="embedded ? 'pt-0' : 'mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10 md:pt-16 lg:px-14'">
      <template v-if="customer">
        <header v-if="!embedded" class="flex flex-col gap-7 border-b border-[#78816f]/25 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="section-label">Chia sẻ cùng MIÊN</p>
            <h1 class="mt-3 font-display text-5xl font-light tracking-[-0.04em] md:text-6xl">Đánh giá của tôi.</h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-[#687064]">Bạn chỉ có thể đánh giá sản phẩm đã nhận hoặc liệu trình đã hoàn tất.</p>
          </div>
          <CustomerAccountTabs />
        </header>

        <p v-if="successMessage" class="mt-6 border-l-2 border-[#617657] bg-[#e4e8dc] px-5 py-4 text-sm text-[#40523a]" role="status">{{ successMessage }}</p>

        <div v-if="pending" class="mt-8 grid gap-4" aria-live="polite" aria-label="Đang tải đánh giá">
          <div class="h-32 animate-pulse bg-[#e5dfd1]" />
          <div class="h-52 animate-pulse bg-[#e5dfd1]" />
        </div>

        <section v-else-if="error" class="mt-8 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-5 text-sm text-[#784b43]" role="alert">
          <p>Chưa thể tải danh sách đánh giá.</p>
          <button type="button" class="mt-3 font-semibold underline underline-offset-4" @click="refresh()">Thử lại</button>
        </section>

        <template v-else>
          <section class="mt-12" aria-labelledby="eligible-feedback-title">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="section-label">Có thể đánh giá</p>
                <h2 id="eligible-feedback-title" class="mt-3 text-2xl font-semibold">Trải nghiệm đang chờ bạn chia sẻ</h2>
              </div>
              <span class="text-xs text-[#737a70]">{{ eligible.length }} mục</span>
            </div>

            <div v-if="eligible.length" class="mt-6 grid gap-4 md:grid-cols-2">
              <article v-for="item in eligible" :key="`${item.type}-${item.appointmentId ?? item.orderId}-${item.serviceId ?? item.productId}`" class="flex min-h-48 flex-col justify-between border border-[#78816f]/20 bg-[#f8f4eb] p-6">
                <div>
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="section-label">{{ typeLabel(item.type) }}</span>
                    <span class="text-xs text-[#777e73]">{{ item.reference }}</span>
                  </div>
                  <h3 class="mt-4 text-xl font-semibold tracking-[-0.02em]">{{ item.name }}</h3>
                  <p class="mt-2 text-xs text-[#747b70]">Hoàn tất {{ formatDate(item.completedAt) }}</p>
                </div>
                <button type="button" class="button-primary mt-7 self-start" @click="openForm(item)">Viết đánh giá</button>
              </article>
            </div>

            <div v-else class="mt-6 border border-dashed border-[#78816f]/30 px-6 py-12 text-center">
              <h3 class="font-display text-3xl font-light">Bạn đã chia sẻ hết rồi.</h3>
              <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#70776c]">Các sản phẩm đã nhận và liệu trình hoàn tất mới sẽ xuất hiện tại đây.</p>
            </div>
          </section>

          <section class="mt-16" aria-labelledby="submitted-feedback-title">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="section-label">Đã gửi</p>
                <h2 id="submitted-feedback-title" class="mt-3 text-2xl font-semibold">Lịch sử đánh giá</h2>
              </div>
              <span class="text-xs text-[#737a70]">{{ feedback.length }} đánh giá</span>
            </div>

            <div v-if="feedback.length" class="mt-6 divide-y divide-[#78816f]/18 border-y border-[#78816f]/18">
              <article v-for="item in feedback" :key="item.id" class="grid gap-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div>
                  <div class="flex flex-wrap items-center gap-3">
                    <h3 class="font-semibold">{{ item.subjectName }}</h3>
                    <StatusBadge :label="item.statusLabel" />
                  </div>
                  <p class="mt-2 text-xs text-[#737a70]">{{ typeLabel(item.type) }} · {{ item.reference }} · {{ formatDate(item.createdAt) }}</p>
                  <p class="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-[#596157]">{{ item.content }}</p>
                </div>
                <p class="text-lg tracking-[0.12em] text-[#7a6b36]" :aria-label="`${item.rating} trên 5 sao`">
                  <span aria-hidden="true">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5 - item.rating) }}</span>
                </p>
              </article>
            </div>
            <p v-else class="mt-6 text-sm text-[#737a70]">Bạn chưa gửi đánh giá nào.</p>
          </section>
        </template>
      </template>
    </component>
    <SiteFooter v-if="!embedded" />

    <CommonModal :open="Boolean(selected)" title="Chia sẻ trải nghiệm" :description="selected ? `${typeLabel(selected.type)} · ${selected.name}` : ''" size="sm" :close-on-backdrop="!submitting" @close="closeForm">
      <form class="grid gap-6" @submit.prevent="submitFeedback">
        <fieldset>
          <legend class="text-xs font-semibold text-[#4d5548]">Mức độ hài lòng</legend>
          <div class="mt-3 flex gap-2" role="radiogroup" aria-label="Chọn từ 1 đến 5 sao">
            <label v-for="star in 5" :key="star" class="cursor-pointer">
              <CommonInput
                :id="`feedback-rating-${star}`"
                type="radio"
                name="feedback-rating"
                :value="star"
                :model-value="rating"
                class="peer sr-only"
                :disabled="submitting"
                @update:model-value="rating = star"
              />
              <span class="grid size-11 place-items-center rounded-full border border-[#78816f]/25 text-xl text-[#a5a294] transition hover:border-[#766c48] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#65745e]" :class="star <= rating ? 'border-[#766c48] bg-[#ece4ca] text-[#78672f]' : ''" aria-hidden="true">★</span>
              <span class="sr-only">{{ star }} sao</span>
            </label>
          </div>
        </fieldset>

        <label class="field-block">
          <span>Nội dung đánh giá</span>
          <CommonTextarea v-model="content" rows="5" maxlength="2000" placeholder="Điều gì khiến bạn hài lòng hoặc MIÊN có thể làm tốt hơn?" :disabled="submitting" />
          <small>{{ content.trim().length }}/2000 ký tự</small>
        </label>

        <p v-if="submitError" class="text-sm text-[#8b5148]" role="alert">{{ submitError }}</p>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton label="Để sau" variant="secondary" :disabled="submitting" @click="closeForm" />
          <AppButton :label="submitting ? 'Đang gửi…' : 'Gửi đánh giá'" :disabled="submitting || !rating || content.trim().length < 10" @click="submitFeedback" />
        </div>
      </template>
    </CommonModal>
  </div>
</template>
