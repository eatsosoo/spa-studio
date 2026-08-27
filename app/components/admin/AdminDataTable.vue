<script setup lang="ts">
import type { AdminColumn, AdminRow } from '~/types'

defineProps<{ columns: AdminColumn[]; rows: AdminRow[]; loading?: boolean }>()
defineEmits<{ edit: [row: AdminRow] }>()

function formatCell(value: string | number, type?: AdminColumn['type']) {
  if (type === 'money' && typeof value === 'number') return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
  return value
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[760px] border-collapse text-left">
      <thead>
        <tr class="border-b border-[#78816f]/20">
          <th v-for="column in columns" :key="column.key" class="px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#7b8277] first:pl-0" :class="column.align === 'right' ? 'text-right' : ''">
            {{ column.label }}
          </th>
          <th class="w-12 py-3" />
        </tr>
      </thead>
      <tbody v-if="loading">
        <tr v-for="index in 5" :key="index" class="border-b border-[#78816f]/12">
          <td v-for="column in columns" :key="column.key" class="px-4 py-5 first:pl-0">
            <span class="block h-3 animate-pulse rounded-full bg-[#dedacf]" :style="{ width: `${48 + ((index * 13) % 35)}%` }" />
          </td>
          <td />
        </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="row in rows" :key="String(row.id)" class="group border-b border-[#78816f]/15 transition-colors hover:bg-[#ebe7dd]/55">
          <td v-for="(column, columnIndex) in columns" :key="column.key" class="px-4 py-4 text-xs text-[#5c6358] first:pl-0" :class="[column.align === 'right' ? 'text-right font-medium tabular-nums text-[#384232]' : '', columnIndex === 0 ? 'font-semibold text-[#313a2e]' : '']">
            <StatusBadge v-if="column.type === 'status'" :label="String(row[column.key])" />
            <span v-else>{{ formatCell(row[column.key], column.type) }}</span>
          </td>
          <td class="py-3 text-right">
            <button type="button" class="grid size-8 place-items-center rounded-full text-[#6c7566] opacity-40 transition hover:bg-[#dcd8cd] hover:text-[#35402f] group-hover:opacity-100" aria-label="Chỉnh sửa" @click="$emit('edit', row)">
              <AppIcon name="edit" :size="15" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
