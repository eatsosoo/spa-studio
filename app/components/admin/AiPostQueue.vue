<script setup lang="ts">
import type { AiPostJob, AiPostStatus } from '~/types/ai-content'
import { aiPostStatusLabels } from '~/types/ai-content'

const props = defineProps<{ jobs: AiPostJob[]; busyIds: string[] }>()
const emit = defineEmits<{ generate: [ids: string[]]; remove: [id: string]; schedule: [job: AiPostJob]; edit: [job: AiPostJob] }>()
const selected = ref<string[]>([])
const search = ref('')
const status = ref<'all' | AiPostStatus>('all')

const visible = computed(() => props.jobs.filter(job => {
  const matchesStatus = status.value === 'all' || job.status === status.value
  const term = search.value.trim().toLocaleLowerCase('vi')
  return matchesStatus && (!term || `${job.title} ${job.category} ${job.keyword}`.toLocaleLowerCase('vi').includes(term))
}))
const actionable = computed(() => visible.value.filter(job => ['queued', 'scheduled', 'error'].includes(job.status)))
const allSelected = computed(() => actionable.value.length > 0 && actionable.value.every(job => selected.value.includes(job.id)))

watch(() => props.jobs.map(job => `${job.id}:${job.status}`), () => {
  selected.value = selected.value.filter(id => props.jobs.some(job => job.id === id && ['queued', 'scheduled', 'error'].includes(job.status)))
})

function toggleAll() { selected.value = allSelected.value ? selected.value.filter(id => !actionable.value.some(job => job.id === id)) : [...new Set([...selected.value, ...actionable.value.map(job => job.id)])] }
function toggle(id: string) { selected.value = selected.value.includes(id) ? selected.value.filter(value => value !== id) : [...selected.value, id] }
function generateSelected() { const ids = selected.value.filter(id => props.jobs.some(job => job.id === id && ['queued', 'scheduled', 'error'].includes(job.status))); if (ids.length) emit('generate', ids) }
</script>

<template>
  <section>
    <div class="flex flex-col gap-4 border-b border-[#78816f]/20 pb-5 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex max-w-full gap-1 overflow-x-auto pb-1">
        <button v-for="item in [{ value: 'all', label: 'Tất cả' }, { value: 'queued', label: 'Chờ viết' }, { value: 'scheduled', label: 'Đã lên lịch' }, { value: 'generated', label: 'Đã tạo' }, { value: 'error', label: 'Lỗi' }]" :key="item.value" type="button" class="filter-tab" :class="status === item.value ? 'filter-tab--active' : ''" @click="status = item.value as typeof status">{{ item.label }}</button>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="admin-search"><AppIcon name="search" :size="16" /><CommonInput v-model="search" type="search" placeholder="Tìm tiêu đề, từ khóa" /></label>
        <AppButton :label="selected.length ? `Tạo ${selected.length} bài` : 'Chọn bài để tạo'" icon="sparkles" :disabled="!selected.length" @click="generateSelected" />
      </div>
    </div>

    <div v-if="jobs.length" class="mt-2 overflow-x-auto">
      <table class="w-full min-w-[980px] border-collapse text-left">
        <thead><tr class="border-b border-[#78816f]/20">
          <th class="w-10 py-3 pr-3"><input type="checkbox" class="size-4 accent-[#4c5d43]" :checked="allSelected" aria-label="Chọn tất cả bài có thể tạo" @change="toggleAll"></th>
          <th class="px-3 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#7b8277]">Tiêu đề</th>
          <th class="px-3 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#7b8277]">Thiết lập</th>
          <th class="px-3 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#7b8277]">Lịch đăng</th>
          <th class="px-3 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#7b8277]">Trạng thái</th><th class="w-32" />
        </tr></thead>
        <tbody>
          <tr v-for="job in visible" :key="job.id" class="group border-b border-[#78816f]/15 transition-colors hover:bg-[#ebe7dd]/55">
            <td class="py-4 pr-3 align-top"><input type="checkbox" class="mt-0.5 size-4 accent-[#4c5d43]" :checked="selected.includes(job.id)" :disabled="!['queued', 'scheduled', 'error'].includes(job.status)" :aria-label="`Chọn ${job.title}`" @change="toggle(job.id)"></td>
            <td class="max-w-xl px-3 py-4 align-top"><p class="text-xs font-semibold leading-5 text-[#313a2e]">{{ job.title }}</p><p v-if="job.keyword" class="mt-1.5 text-[0.66rem] text-[#7b8277]">Từ khóa: {{ job.keyword }}</p><p v-if="job.error" class="mt-2 text-[0.66rem] leading-4 text-[#8b5148]">{{ job.error }}</p></td>
            <td class="px-3 py-4 align-top text-[0.68rem] leading-5 text-[#646c60]"><p>{{ job.category }}</p><p>{{ job.articleType }} · {{ job.wordRange }} từ</p><p v-if="job.imageSource" class="flex items-center gap-1 text-[#75806f]"><AppIcon :name="job.imageSource.kind === 'folder' ? 'folder' : 'image'" :size="12" />{{ job.imageSource.kind === 'folder' ? job.imageSource.path : job.imageSource.filename }}</p><p v-if="job.targetAction" class="mt-0.5 truncate text-[#75806f]">CTA: {{ job.targetAction }}</p></td>
            <td class="px-3 py-4 align-top text-[0.68rem] tabular-nums text-[#646c60]">{{ job.scheduledAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(job.scheduledAt)) : 'Chưa xếp lịch' }}</td>
            <td class="px-3 py-4 align-top"><StatusBadge :label="aiPostStatusLabels[job.status]" /></td>
            <td class="py-3 text-right align-top"><div class="flex justify-end gap-1 opacity-100 transition md:opacity-55 md:group-hover:opacity-100">
              <button v-if="['queued', 'scheduled', 'error'].includes(job.status)" type="button" class="grid size-8 place-items-center rounded-full text-[#53604e] transition hover:bg-[#dce2d7]" :disabled="busyIds.includes(job.id)" aria-label="Tạo bài" @click="$emit('generate', [job.id])"><AppIcon name="sparkles" :size="15" /></button>
              <button type="button" class="grid size-8 place-items-center rounded-full text-[#6c7566] transition hover:bg-[#dcd8cd]" aria-label="Xếp lịch" @click="$emit('schedule', job)"><AppIcon name="calendar" :size="15" /></button>
              <button type="button" class="grid size-8 place-items-center rounded-full text-[#866158] transition hover:bg-[#ead8d3]" aria-label="Xóa khỏi hàng chờ" @click="$emit('remove', job.id)"><AppIcon name="trash" :size="15" /></button>
            </div></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!visible.length" class="py-14 text-center text-xs text-[#7b8277]">Không có bài phù hợp với bộ lọc.</div>
    </div>
    <AdminEmptyState v-else class="mt-5" title="Hàng chờ đang trống" description="Nhập danh sách tiêu đề hoặc import lịch Excel để bắt đầu." />
  </section>
</template>
