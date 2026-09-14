<script setup lang="ts">
import type { AiPostJob } from '~/types/ai-content'
import { aiPostStatusLabels } from '~/types/ai-content'

const props = defineProps<{ jobs: AiPostJob[] }>()
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const title = computed(() => new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(month.value))
const monthJobs = computed(() => props.jobs.filter(job => job.scheduledAt && new Date(job.scheduledAt).getMonth() === month.value.getMonth() && new Date(job.scheduledAt).getFullYear() === month.value.getFullYear()))
const days = computed(() => {
  const first = new Date(month.value.getFullYear(), month.value.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first); start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return { date, current: date.getMonth() === month.value.getMonth() } })
})
function jobsFor(date: Date) { return props.jobs.filter(job => job.scheduledAt && new Date(job.scheduledAt).toDateString() === date.toDateString()) }
function move(value: number) { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + value, 1) }
const tone = (status: AiPostJob['status']) => status === 'published' ? 'border-[#78906f] bg-[#e2eadf]' : status === 'error' ? 'border-[#aa746c] bg-[#f1e3df]' : status === 'generating' ? 'border-[#ad9660] bg-[#eee7d4]' : 'border-[#8b9684] bg-[#f8f5ed]'
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-[#78816f]/20 bg-[#fbf9f3]">
    <header class="flex flex-col gap-5 border-b border-[#78816f]/20 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
      <div class="flex items-center gap-4"><div class="flex gap-2"><button class="grid size-10 place-items-center rounded-full border border-[#78816f]/25 transition hover:bg-[#e8e4da] active:scale-[0.97]" aria-label="Tháng trước" @click="move(-1)"><AppIcon name="chevron" class="rotate-180" :size="16" /></button><button class="grid size-10 place-items-center rounded-full border border-[#78816f]/25 transition hover:bg-[#e8e4da] active:scale-[0.97]" aria-label="Tháng sau" @click="move(1)"><AppIcon name="chevron" :size="16" /></button></div><div><h2 class="text-lg font-semibold capitalize tracking-[-0.03em] text-[#30392d]">{{ title }}</h2><p class="mt-1 text-xs text-[#798076]">{{ monthJobs.length }} bài hẹn trong tháng</p></div></div>
      <div class="flex flex-wrap gap-3 text-[0.64rem] text-[#737b70]"><span class="flex items-center gap-1.5"><i class="size-2 rounded-full bg-[#8b9684]" />Đã lên lịch</span><span class="flex items-center gap-1.5"><i class="size-2 rounded-full bg-[#78906f]" />Đã đăng</span><span class="flex items-center gap-1.5"><i class="size-2 rounded-full bg-[#aa746c]" />Lỗi</span></div>
    </header>
    <div class="overflow-x-auto"><div class="min-w-[980px]"><div class="grid grid-cols-7 border-b border-[#78816f]/15 bg-[#f0ece3]"><div v-for="day in weekdays" :key="day" class="px-3 py-3 text-center text-[0.65rem] font-semibold text-[#747c70]">{{ day }}</div></div><div class="grid grid-cols-7">
      <div v-for="day in days" :key="day.date.toISOString()" class="min-h-36 border-b border-r border-[#78816f]/12 p-2" :class="day.current ? 'bg-[#fffdf8]' : 'bg-[#f5f2eb] text-[#a3a69f]'">
        <span class="grid size-7 place-items-center rounded-full text-[0.68rem] tabular-nums" :class="day.date.toDateString() === new Date().toDateString() ? 'bg-[#35412f] text-[#f8f4eb]' : ''">{{ day.date.getDate() }}</span>
        <div class="mt-1 grid gap-1.5"><article v-for="job in jobsFor(day.date).slice(0, 3)" :key="job.id" class="rounded-md border-l-2 px-2 py-1.5 shadow-[0_5px_12px_rgba(54,64,50,0.05)]" :class="tone(job.status)"><p class="line-clamp-2 text-[0.63rem] font-medium leading-4 text-[#3d4738]"><span class="tabular-nums">{{ new Date(job.scheduledAt!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }}</span> {{ job.title }}</p><span class="mt-1 block text-[0.56rem] text-[#7a8177]">{{ aiPostStatusLabels[job.status] }}</span></article><span v-if="jobsFor(day.date).length > 3" class="px-1 text-[0.6rem] text-[#6c7567]">+{{ jobsFor(day.date).length - 3 }} bài khác</span></div>
      </div>
    </div></div></div>
  </section>
</template>
