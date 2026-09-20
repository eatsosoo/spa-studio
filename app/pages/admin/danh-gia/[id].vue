<script setup lang="ts">
import type { AdminFeedback, FeedbackStatus } from '~/types'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { can } = useAdminAuth()
const { data: response, pending, error, refresh } = await useAsyncData(
  `admin-feedback-${route.params.id}`,
  () => $fetch<{ data: AdminFeedback }>(`/api/admin/feedback/${route.params.id}`),
)
const feedback = computed(() => response.value?.data)
const status = ref<FeedbackStatus>('pending')
const moderationNote = ref('')
const mutating = ref(false)
const mutationError = ref('')
const successMessage = ref('')
const deleteOpen = ref(false)

watch(feedback, (value) => {
  if (!value) return
  status.value = value.status
  moderationNote.value = value.moderationNote ?? ''
}, { immediate: true })

useHead({ title: () => feedback.value ? `Đánh giá #${feedback.value.id} | MIÊN Admin` : 'Chi tiết đánh giá | MIÊN Admin' })

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function failureMessage(value: unknown, fallback: string) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? fallback
}

async function saveModeration() {
  if (!feedback.value || !can('feedback.update')) return
  mutating.value = true
  mutationError.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/admin/feedback/${feedback.value.id}`, {
      method: 'PATCH',
      body: { status: status.value, moderationNote: moderationNote.value.trim() || undefined },
    })
    successMessage.value = 'Trạng thái đánh giá đã được cập nhật.'
    await refresh()
  } catch (failure) {
    mutationError.value = failureMessage(failure, 'Không thể cập nhật đánh giá.')
  } finally {
    mutating.value = false
  }
}

async function removeFeedback() {
  if (!feedback.value || !can('feedback.delete')) return
  mutating.value = true
  mutationError.value = ''
  try {
    await $fetch(`/api/admin/feedback/${feedback.value.id}`, { method: 'DELETE' })
    await navigateTo('/admin/danh-gia')
  } catch (failure) {
    deleteOpen.value = false
    mutationError.value = failureMessage(failure, 'Không thể xóa đánh giá.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <NuxtLink to="/admin/danh-gia" class="admin-inline-link"><AppIcon name="arrow-left" :size="15" /> Danh sách feedback</NuxtLink>

    <div v-if="pending" class="mt-8 grid gap-4" aria-live="polite" aria-label="Đang tải đánh giá">
      <div class="h-36 animate-pulse bg-[#e3dfd5]" />
      <div class="h-72 animate-pulse bg-[#e3dfd5]" />
    </div>

    <div v-else-if="error || !feedback" class="mt-8 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-xs text-[#784b43]" role="alert">
      Không thể tải chi tiết đánh giá.
    </div>

    <template v-else>
      <header class="mt-7 flex flex-col gap-6 border-b border-[#78816f]/20 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">{{ feedback.type === 'service' ? 'Liệu trình' : 'Sản phẩm' }} · {{ feedback.reference }}</p>
          <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] md:text-4xl">{{ feedback.subjectName }}</h1>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge :label="feedback.statusLabel" />
            <span class="text-xl tracking-[0.12em] text-[#78672f]" :aria-label="`${feedback.rating} trên 5 sao`"><span aria-hidden="true">{{ '★'.repeat(feedback.rating) }}{{ '☆'.repeat(5 - feedback.rating) }}</span></span>
          </div>
        </div>
        <button v-if="can('feedback.delete')" type="button" class="inline-flex items-center gap-2 self-start text-xs font-semibold text-[#8b5148] underline underline-offset-4 lg:self-auto" @click="deleteOpen = true">
          <AppIcon name="trash" :size="15" /> Xóa feedback
        </button>
      </header>

      <p v-if="mutationError" class="mt-6 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-xs text-[#784b43]" role="alert">{{ mutationError }}</p>
      <p v-else-if="successMessage" class="mt-6 border-l-2 border-[#617657] bg-[#e4e8dc] px-5 py-4 text-xs text-[#40523a]" role="status">{{ successMessage }}</p>

      <div class="grid gap-12 py-9 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <section>
            <p class="text-[0.63rem] font-semibold uppercase tracking-[0.16em] text-[#73806d]">Nội dung khách chia sẻ</p>
            <blockquote class="mt-5 whitespace-pre-line border-l-2 border-[#687763] pl-6 font-display text-2xl font-light leading-relaxed text-[#394334] md:text-3xl">{{ feedback.content }}</blockquote>
            <p class="mt-5 text-xs text-[#747b70]">Gửi lúc {{ formatDate(feedback.createdAt) }}</p>
          </section>

          <section class="mt-12 border-y border-[#78816f]/18 py-7">
            <h2 class="text-sm font-semibold">Thông tin liên quan</h2>
            <dl class="mt-5 grid gap-4 text-xs sm:grid-cols-2">
              <div><dt class="text-[#7b8277]">Loại</dt><dd class="mt-1 font-semibold">{{ feedback.type === 'service' ? 'Liệu trình' : 'Sản phẩm' }}</dd></div>
              <div><dt class="text-[#7b8277]">Mã tham chiếu</dt><dd class="mt-1 font-semibold">{{ feedback.reference }}</dd></div>
              <div v-if="feedback.appointmentId"><dt class="text-[#7b8277]">Mã lịch hẹn</dt><dd class="mt-1 font-semibold">#{{ feedback.appointmentId }}</dd></div>
              <div v-if="feedback.orderId"><dt class="text-[#7b8277]">Mã đơn nội bộ</dt><dd class="mt-1 font-semibold">#{{ feedback.orderId }}</dd></div>
            </dl>
          </section>
        </div>

        <aside class="space-y-8 border-t border-[#78816f]/20 pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <section>
            <h2 class="text-sm font-semibold">Người gửi</h2>
            <p class="mt-3 text-xs leading-6">
              {{ feedback.customerName }}<br>
              <a :href="`tel:${feedback.customerPhone}`" class="admin-inline-link">{{ feedback.customerPhone }}</a><br>
              <a v-if="feedback.customerEmail" :href="`mailto:${feedback.customerEmail}`" class="admin-inline-link">{{ feedback.customerEmail }}</a>
            </p>
          </section>

          <section class="border-t border-[#78816f]/20 pt-7">
            <h2 class="text-sm font-semibold">Kiểm duyệt</h2>
            <template v-if="can('feedback.update')">
              <label class="admin-field mt-5">
                Trạng thái
                <CommonSelect v-model="status" :disabled="mutating">
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đang hiển thị</option>
                  <option value="hidden">Đã ẩn</option>
                </CommonSelect>
              </label>
              <label class="admin-field mt-4">
                Ghi chú nội bộ
                <CommonTextarea v-model="moderationNote" rows="4" maxlength="500" placeholder="Lý do duyệt, ẩn hoặc thông tin cần theo dõi" :disabled="mutating" />
              </label>
              <AppButton class="mt-5 w-full" :label="mutating ? 'Đang lưu…' : 'Lưu kiểm duyệt'" icon="check" :disabled="mutating" @click="saveModeration" />
            </template>
            <div v-else class="mt-4 text-xs leading-6 text-[#70776c]">
              <p>{{ feedback.moderationNote || 'Không có ghi chú kiểm duyệt.' }}</p>
              <p v-if="feedback.moderatedAt" class="mt-2">Cập nhật {{ formatDate(feedback.moderatedAt) }}</p>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <CommonModal :open="deleteOpen" title="Xóa feedback?" description="Thao tác này sẽ xóa đánh giá khỏi hệ thống và không thể hoàn tác." size="sm" :close-on-backdrop="!mutating" @close="deleteOpen = false">
      <p class="text-sm leading-6 text-[#687061]">Chỉ xóa khi nội dung không còn phù hợp để lưu trữ. Nếu chỉ không muốn hiển thị, hãy chuyển trạng thái sang “Đã ẩn”.</p>
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton label="Giữ lại" variant="secondary" :disabled="mutating" @click="deleteOpen = false" />
          <AppButton :label="mutating ? 'Đang xóa…' : 'Xóa feedback'" :disabled="mutating" @click="removeFeedback" />
        </div>
      </template>
    </CommonModal>
  </section>
</template>
