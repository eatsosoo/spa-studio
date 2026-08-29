<script setup lang="ts">
import type { AdminColumn, AdminRow } from '~/types'

const props = withDefaults(defineProps<{ columns: AdminColumn[]; rows: AdminRow[]; loading?: boolean; actions?: boolean }>(), { actions: true })
defineEmits<{ edit: [row: AdminRow]; remove: [row: AdminRow] }>()
const sortKey = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  const column = props.columns.find(item => item.key === sortKey.value)
  if (!column) return props.rows
  const multiplier = sortDirection.value === 'asc' ? 1 : -1
  return props.rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => compareValues(left.row[column.key], right.row[column.key], column.type) * multiplier || left.index - right.index)
    .map(item => item.row)
})

function dateValue(value: string | number) {
  const text = String(value)
  const vietnameseDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (vietnameseDate) return Date.UTC(Number(vietnameseDate[3]), Number(vietnameseDate[2]) - 1, Number(vietnameseDate[1]))
  const timestamp = Date.parse(text)
  return Number.isNaN(timestamp) ? null : timestamp
}

function compareValues(left: string | number | undefined, right: string | number | undefined, type?: AdminColumn['type']) {
  if (left === undefined || left === '') return right === undefined || right === '' ? 0 : 1
  if (right === undefined || right === '') return -1
  if (type === 'number' || type === 'money') return Number(left) - Number(right)
  if (type === 'date') {
    const leftDate = dateValue(left)
    const rightDate = dateValue(right)
    if (leftDate !== null && rightDate !== null) return leftDate - rightDate
  }
  return String(left).localeCompare(String(right), 'vi', { numeric: true, sensitivity: 'base' })
}

function toggleSort(key: string) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
}

function formatCell(value: string | number | undefined, type?: AdminColumn['type']) {
  if (value === undefined) return '—'
  if (type === 'money' && typeof value === 'number') return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
  if (type === 'number' && typeof value === 'number') return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
  if (type === 'date') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('vi-VN', String(value).includes('T') ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }).format(date)
  }
  return value
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[760px] border-collapse text-left">
      <thead>
        <tr class="border-b border-[#78816f]/20">
          <th v-for="column in columns" :key="column.key" :aria-sort="sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'" class="px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#7b8277] first:pl-0" :class="column.align === 'right' ? 'text-right' : ''">
            <button type="button" class="group/sort inline-flex min-h-8 items-center gap-1.5 rounded-sm px-1 transition hover:bg-[#e7e3d8] hover:text-[#3f493a] focus-visible:bg-[#e7e3d8]" :class="column.align === 'right' ? 'ml-auto' : '-ml-1'" :aria-label="`Sắp xếp theo ${column.label}`" @click="toggleSort(column.key)">
              <span>{{ column.label }}</span>
              <AppIcon v-if="sortKey === column.key" name="chevron-down" :size="13" class="transition-transform" :class="sortDirection === 'asc' ? 'rotate-180' : ''" />
              <AppIcon v-else name="sort" :size="13" class="opacity-35 transition group-hover/sort:opacity-80" />
            </button>
          </th>
          <th v-if="actions" class="w-20 py-3" />
        </tr>
      </thead>
      <tbody v-if="loading">
        <tr v-for="index in 5" :key="index" class="border-b border-[#78816f]/12">
          <td v-for="column in columns" :key="column.key" class="px-4 py-5 first:pl-0">
            <span class="block h-3 animate-pulse rounded-full bg-[#dedacf]" :style="{ width: `${48 + ((index * 13) % 35)}%` }" />
          </td>
          <td v-if="actions" />
        </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="row in sortedRows" :key="String(row.id)" class="group border-b border-[#78816f]/15 transition-colors hover:bg-[#ebe7dd]/55">
          <td v-for="(column, columnIndex) in columns" :key="column.key" class="px-4 py-4 text-xs text-[#5c6358] first:pl-0" :class="[column.align === 'right' ? 'text-right font-medium tabular-nums text-[#384232]' : '', columnIndex === 0 ? 'font-semibold text-[#313a2e]' : '']">
            <StatusBadge v-if="column.type === 'status'" :label="String(row[column.key])" />
            <span v-else>{{ formatCell(row[column.key], column.type) }}</span>
          </td>
          <td v-if="actions" class="py-3 text-right">
            <slot name="actions" :row="row">
              <div class="flex justify-end gap-1 opacity-100 transition md:opacity-50 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <button type="button" class="grid size-8 place-items-center rounded-full text-[#6c7566] transition hover:bg-[#dcd8cd] hover:text-[#35402f]" aria-label="Chỉnh sửa" @click="$emit('edit', row)"><AppIcon name="edit" :size="15" /></button>
                <button type="button" class="grid size-8 place-items-center rounded-full text-[#866158] transition hover:bg-[#ead8d3] hover:text-[#713d34]" aria-label="Xóa" @click="$emit('remove', row)"><AppIcon name="trash" :size="15" /></button>
              </div>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
