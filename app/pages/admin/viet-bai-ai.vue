<script setup lang="ts">
import type { AiPostDraft, AiPostJob } from '~/types/ai-content'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Viết bài AI | MIÊN' })

const { jobs, hydrate, add, patch, remove } = useAiPostWorkspace()
const view = ref<'queue' | 'calendar'>('queue')
const importOpen = ref(false)
const scheduleOpen = ref(false)
const schedulingJob = ref<AiPostJob | null>(null)
const scheduleValue = ref('')
const busyIds = ref<string[]>([])
const notice = ref('')
const pageError = ref('')

onMounted(hydrate)

const counts = computed(() => ({
  waiting: jobs.value.filter(job => ['queued', 'scheduled'].includes(job.status)).length,
  generated: jobs.value.filter(job => ['generated', 'published'].includes(job.status)).length,
  scheduled: jobs.value.filter(job => job.scheduledAt).length,
}))

function addItems(items: Omit<AiPostJob, 'id' | 'createdAt' | 'status'>[]) {
  const count = add(items)
  notice.value = count ? `Đã thêm ${count} bài vào workspace.` : 'Không có tiêu đề mới để thêm.'
  importOpen.value = false
}

function errorMessage(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure?.data?.statusMessage ?? failure?.statusMessage ?? failure?.message ?? 'Không thể tạo bài. Vui lòng thử lại.'
}

async function generate(ids: string[]) {
  pageError.value = ''
  for (const id of ids) {
    const job = jobs.value.find(item => item.id === id)
    if (!job || !['queued', 'scheduled', 'error'].includes(job.status) || busyIds.value.includes(id)) continue
    busyIds.value.push(id)
    patch(id, { status: 'generating', error: undefined })
    try {
      const draft = await $fetch<AiPostDraft>('/api/admin/ai-posts-generate', { method: 'POST', body: job })
      await $fetch('/api/admin/posts', { method: 'POST', body: {
        title: draft.title,
        category: job.category,
        summary: draft.summary,
        content: draft.content,
        status: job.afterCreate === 'published' && !job.scheduledAt ? 'Đã xuất bản' : 'Bản nháp',
        focusKeyword: draft.focusKeyword,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
      } })
      patch(id, { status: job.afterCreate === 'published' && !job.scheduledAt ? 'published' : job.scheduledAt ? 'scheduled' : 'generated' })
      notice.value = `Đã tạo bài “${draft.title}”.`
    } catch (failure) {
      const message = errorMessage(failure)
      patch(id, { status: 'error', error: message })
      pageError.value = message
    } finally {
      busyIds.value = busyIds.value.filter(value => value !== id)
    }
  }
}

function openSchedule(job: AiPostJob) {
  schedulingJob.value = job
  scheduleValue.value = job.scheduledAt ? toLocalInput(job.scheduledAt) : toLocalInput(new Date(Date.now() + 86400000).toISOString())
  scheduleOpen.value = true
}

function toLocalInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function saveSchedule() {
  if (!schedulingJob.value || !scheduleValue.value) return
  patch(schedulingJob.value.id, { scheduledAt: new Date(scheduleValue.value).toISOString(), status: schedulingJob.value.status === 'generated' ? 'scheduled' : schedulingJob.value.status })
  scheduleOpen.value = false
  notice.value = 'Đã cập nhật lịch đăng.'
}
</script>

<template>
  <main class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="grid gap-7 border-b border-[#78816f]/20 pb-8 xl:grid-cols-[1fr_auto] xl:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Nội dung và kiến thức</p>
        <div class="mt-3 flex flex-wrap items-center gap-3"><h1 class="text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Viết bài AI</h1><span class="flex items-center gap-2 rounded-full border border-[#84907c]/25 bg-[#e6e9df] px-3 py-1 text-[0.63rem] font-semibold text-[#52604c]"><i class="size-1.5 animate-pulse rounded-full bg-[#66775e]" />OpenAI</span></div>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Chuẩn bị nhiều chủ đề, tạo bản nháp có cấu trúc và xếp lịch nội dung tại một nơi. Mỗi bài vẫn đi qua bước duyệt trước khi xuất bản.</p>
      </div>
      <div class="flex flex-wrap gap-3"><AppButton label="Lịch đăng" icon="calendar" :variant="view === 'calendar' ? 'primary' : 'secondary'" @click="view = view === 'calendar' ? 'queue' : 'calendar'" /><AppButton label="Import lịch" icon="upload" variant="secondary" @click="importOpen = true" /></div>
    </header>

    <section class="grid gap-px overflow-hidden rounded-xl border border-[#78816f]/20 bg-[#78816f]/20 sm:grid-cols-3 mt-7">
      <div class="bg-[#f3efe6] px-5 py-4"><p class="text-[0.62rem] uppercase tracking-[0.15em] text-[#7c8378]">Đang chờ</p><p class="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-[#34402f]">{{ counts.waiting }}</p></div>
      <div class="bg-[#f3efe6] px-5 py-4"><p class="text-[0.62rem] uppercase tracking-[0.15em] text-[#7c8378]">Đã tạo</p><p class="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-[#34402f]">{{ counts.generated }}</p></div>
      <div class="bg-[#f3efe6] px-5 py-4"><p class="text-[0.62rem] uppercase tracking-[0.15em] text-[#7c8378]">Có lịch đăng</p><p class="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-[#34402f]">{{ counts.scheduled }}</p></div>
    </section>

    <Transition name="fade"><div v-if="notice" class="mt-5 flex items-center justify-between gap-4 border-l-2 border-[#64735c] bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]" role="status"><span class="flex items-center gap-2"><AppIcon name="check" :size="16" />{{ notice }}</span><button class="grid size-7 place-items-center rounded-full hover:bg-[#d5ded0]" aria-label="Đóng thông báo" @click="notice = ''"><AppIcon name="close" :size="14" /></button></div></Transition>
    <Transition name="fade"><div v-if="pageError" class="mt-5 flex items-start gap-3 border-l-2 border-[#9a655b] bg-[#f0e2dd] px-4 py-3 text-xs leading-5 text-[#774b43]" role="alert"><AppIcon name="alert" :size="16" class="mt-0.5 shrink-0" /><div><strong>Chưa thể tạo bài.</strong><p>{{ pageError }}</p></div></div></Transition>

    <div v-if="view === 'queue'" class="mt-7 grid gap-8">
      <AiPostComposer @add="addItems" />
      <AiPostQueue :jobs="jobs" :busy-ids="busyIds" @generate="generate" @remove="remove" @schedule="openSchedule" />
    </div>
    <AiPostCalendar v-else class="mt-7" :jobs="jobs" />

    <AiImportModal :open="importOpen" @close="importOpen = false" @import="addItems" />
    <CommonModal :open="scheduleOpen" title="Xếp lịch đăng" :description="schedulingJob?.title" size="sm" @close="scheduleOpen = false">
      <label class="admin-field"><span>Ngày và giờ đăng</span><CommonInput v-model="scheduleValue" type="datetime-local" /><small class="font-normal leading-5 text-[#83897f]">Lịch dùng múi giờ của thiết bị quản trị.</small></label>
      <template #footer><div class="flex justify-end gap-3"><AppButton label="Hủy" variant="secondary" @click="scheduleOpen = false" /><AppButton label="Lưu lịch" icon="calendar" :disabled="!scheduleValue" @click="saveSchedule" /></div></template>
    </CommonModal>
  </main>
</template>
