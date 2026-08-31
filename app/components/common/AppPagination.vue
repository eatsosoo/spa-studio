<script setup lang="ts">
import type { PaginationMeta } from '~/types'

const props = defineProps<{ meta: PaginationMeta; pageSizes?: number[] }>()
const emit = defineEmits<{ 'update:page': [page: number]; 'update:pageSize': [pageSize: number] }>()
const sizes = computed(() => props.pageSizes ?? [10, 20, 50])

const visiblePages = computed<Array<number | 'ellipsis-left' | 'ellipsis-right'>>(() => {
  const total = props.meta.totalPages
  const current = props.meta.page
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const ordered = [...pages].filter(page => page > 0 && page <= total).sort((a, b) => a - b)
  const result: Array<number | 'ellipsis-left' | 'ellipsis-right'> = []
  ordered.forEach((page, index) => {
    const previous = ordered[index - 1]
    if (previous && page - previous > 1) result.push(previous === 1 ? 'ellipsis-left' : 'ellipsis-right')
    result.push(page)
  })
  return result
})

function changePageSize(event: Event) {
  emit('update:pageSize', Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <nav v-if="meta.total" class="flex flex-col gap-4 border-t border-[#78816f]/15 pt-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Phân trang">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] text-[#747c70]">
      <span>Hiển thị <strong class="font-semibold tabular-nums text-[#455140]">{{ meta.from }}–{{ meta.to }}</strong> trong {{ meta.total }}</span>
      <label class="flex items-center gap-2">
        <span>Mỗi trang</span>
        <select :value="meta.pageSize" class="rounded-full border border-[#78816f]/25 bg-[#f8f5ed] px-2.5 py-1.5 text-[0.68rem] text-[#455140] outline-none transition focus:border-[#61705a]" aria-label="Số dòng mỗi trang" @change="changePageSize">
          <option v-for="size in sizes" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
    </div>

    <div v-if="meta.totalPages > 1" class="flex items-center gap-1">
      <button type="button" class="grid size-8 place-items-center rounded-full border border-[#78816f]/20 text-[#596653] transition hover:bg-[#e4e6dd] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Trang trước" :disabled="meta.page <= 1" @click="emit('update:page', meta.page - 1)">
        <AppIcon name="chevron" :size="14" class="rotate-180" />
      </button>
      <template v-for="item in visiblePages" :key="item">
        <span v-if="typeof item !== 'number'" class="grid size-8 place-items-center text-[0.68rem] text-[#959a92]">…</span>
        <button v-else type="button" class="grid size-8 place-items-center rounded-full text-[0.68rem] font-medium tabular-nums transition active:scale-95" :class="item === meta.page ? 'bg-[#52634b] text-[#fbf8f0]' : 'text-[#66705f] hover:bg-[#e4e6dd]'" :aria-current="item === meta.page ? 'page' : undefined" :aria-label="`Trang ${item}`" @click="emit('update:page', item)">{{ item }}</button>
      </template>
      <button type="button" class="grid size-8 place-items-center rounded-full border border-[#78816f]/20 text-[#596653] transition hover:bg-[#e4e6dd] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Trang sau" :disabled="meta.page >= meta.totalPages" @click="emit('update:page', meta.page + 1)">
        <AppIcon name="chevron" :size="14" />
      </button>
    </div>
  </nav>
</template>
