<script setup lang="ts">
import type { AiPostJob } from '~/types/ai-content'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; import: [items: Omit<AiPostJob, 'id' | 'createdAt' | 'status'>[]] }>()
const rows = ref<Omit<AiPostJob, 'id' | 'createdAt' | 'status'>[]>([])
const fileName = ref('')
const error = ref('')
const reading = ref(false)
const clean = (value: unknown) => String(value ?? '').trim()

function isoDate(dateValue: unknown, timeValue: unknown) {
  if (!dateValue) return null
  const date = typeof dateValue === 'number'
    ? new Date(1899, 11, 30 + Math.floor(dateValue))
    : dateValue instanceof Date ? new Date(dateValue) : new Date(String(dateValue))
  if (Number.isNaN(date.getTime())) return null
  if (timeValue instanceof Date) date.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0)
  else if (typeof timeValue === 'number') {
    const minutes = Math.round((timeValue % 1) * 24 * 60)
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  } else {
    const time = clean(timeValue).match(/(\d{1,2}):(\d{2})/)
    if (time) date.setHours(Number(time[1]), Number(time[2]), 0, 0)
  }
  return date.toISOString()
}

async function selectFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  reading.value = true
  error.value = ''
  rows.value = []
  fileName.value = file.name
  try {
    const module = await import('xlsx')
    const XLSX = module.default ?? module
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? '']
    if (!sheet) throw new Error('Không tìm thấy trang tính trong tệp.')
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    const headerIndex = matrix.findIndex((row) => {
      const cells = row.map(cell => clean(cell).toLocaleLowerCase('vi'))
      const hasTitle = cells.some(cell => /chủ đề|tiêu đề/.test(cell))
      const supportingColumns = cells.filter(cell => /^(stt|ngày đăng|giờ đăng|từ khóa|cụm nội dung|loại bài|số từ|trạng thái)/.test(cell)).length
      return hasTitle && supportingColumns >= 2
    })
    if (headerIndex < 0) throw new Error('Không tìm thấy cột “Chủ đề/tiêu đề” trong tệp.')
    const headers = matrix[headerIndex]!.map(value => clean(value).toLocaleLowerCase('vi'))
    const column = (pattern: RegExp) => headers.findIndex(value => pattern.test(value))
    const titleCol = column(/chủ đề|tiêu đề/)
    const dateCol = column(/ngày đăng|ngày/)
    const timeCol = column(/giờ đăng|giờ/)
    const keywordCol = column(/từ khóa/)
    const clusterCol = column(/cụm nội dung|chuyên mục/)
    const typeCol = column(/loại bài|dạng bài/)
    const wordsCol = column(/số từ|độ dài/)
    const targetCol = column(/trang đích|hành động|cta/)
    rows.value = matrix.slice(headerIndex + 1).map(row => ({
      title: clean(row[titleCol]), category: 'Chăm sóc tại nhà', keyword: keywordCol >= 0 ? clean(row[keywordCol]) : '', cluster: clusterCol >= 0 ? clean(row[clusterCol]) : '',
      articleType: typeCol >= 0 ? clean(row[typeCol]) : 'Hướng dẫn', wordRange: wordsCol >= 0 ? clean(row[wordsCol]) : '900–1.200',
      targetUrl: targetCol >= 0 ? (clean(row[targetCol]).match(/https?:\/\/\S+/)?.[0] ?? clean(row[targetCol])) : '', scheduledAt: dateCol >= 0 ? isoDate(row[dateCol], timeCol >= 0 ? row[timeCol] : '') : null,
    })).filter(row => row.title).slice(0, 500)
    if (!rows.value.length) throw new Error('Tệp không có dòng nội dung hợp lệ.')
  } catch (failure) { error.value = failure instanceof Error ? failure.message : 'Không thể đọc tệp Excel.' } finally { reading.value = false }
}

function confirm() { if (rows.value.length) { emit('import', rows.value); rows.value = []; fileName.value = '' } }
</script>

<template>
  <CommonModal :open="open" title="Import lịch nội dung" description="Đọc tệp .xlsx hoặc .xls, kiểm tra dữ liệu trước khi thêm vào hàng chờ." size="lg" @close="$emit('close')">
    <div class="mb-5 flex flex-col gap-3 rounded-xl border border-[#78816f]/20 bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <strong class="text-sm text-[#35402f]">Lần đầu import lịch?</strong>
        <p class="mt-1 text-xs leading-5 text-[#747c70]">Tải file mẫu, thay nội dung ví dụ rồi tải lại tại đây.</p>
      </div>
      <a href="/templates/mau-import-lich-noi-dung-ai.xlsx" download class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#596b50]/25 bg-[#edf1e9] px-4 text-xs font-semibold text-[#465440] transition hover:border-[#596b50]/45 hover:bg-[#e4eadf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#596b50]">
        <AppIcon name="download" :size="17" />
        Tải file Excel mẫu
      </a>
    </div>
    <label class="group grid cursor-pointer place-items-center rounded-xl border border-dashed border-[#78816f]/35 bg-[#f2eee4] px-6 py-10 text-center transition hover:border-[#52614b] hover:bg-[#ece8dd]">
      <CommonInput type="file" accept=".xlsx,.xls" class="sr-only" @change="selectFile" />
      <span class="grid size-11 place-items-center rounded-full bg-[#dde3d8] text-[#465440]"><AppIcon name="upload" :size="20" /></span>
      <strong class="mt-4 text-sm text-[#35402f]">{{ reading ? 'Đang đọc tệp…' : fileName || 'Chọn tệp Excel' }}</strong>
      <span class="mt-2 text-xs text-[#7b8277]">Nhận diện các cột tiêu đề, ngày, giờ, từ khóa, cụm nội dung, loại bài và trang đích.</span>
    </label>
    <p v-if="error" class="mt-4 border-l-2 border-[#9a655b] bg-[#f0e2dd] px-4 py-3 text-xs text-[#774b43]" role="alert">{{ error }}</p>
    <div v-if="rows.length" class="mt-5 overflow-hidden rounded-lg border border-[#78816f]/20">
      <div class="flex items-center justify-between bg-[#ebe7dc] px-4 py-3"><strong class="text-xs text-[#394433]">{{ rows.length }} dòng hợp lệ</strong><span class="text-[0.66rem] text-[#788075]">Xem trước 5 dòng đầu</span></div>
      <div class="divide-y divide-[#78816f]/15 bg-[#fffdf8]"><div v-for="row in rows.slice(0, 5)" :key="row.title" class="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><p class="truncate text-xs font-medium text-[#394333]">{{ row.title }}</p><p class="text-[0.64rem] tabular-nums text-[#7d8479]">{{ row.scheduledAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.scheduledAt)) : 'Chưa xếp lịch' }}</p></div></div>
    </div>
    <template #footer><div class="flex justify-end gap-3"><AppButton label="Hủy" variant="secondary" @click="$emit('close')" /><AppButton :label="rows.length ? `Import ${rows.length} dòng` : 'Import lịch'" icon="upload" :disabled="!rows.length || reading" @click="confirm" /></div></template>
  </CommonModal>
</template>
