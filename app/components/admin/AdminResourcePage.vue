<script setup lang="ts">
import type { AdminRow } from '~/types'
import type { AdminResourceConfig } from '~/data/admin'

const props = defineProps<{ config: AdminResourceConfig }>()

const rows = ref<AdminRow[]>(props.config.rows.map((row) => ({ ...row })))
const search = ref('')
const activeFilter = ref(0)
const loading = ref(false)
const drawerOpen = ref(false)
const editingRow = ref<AdminRow | null>(null)

const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('vi')
  const filter = props.config.filters[activeFilter.value]
  return rows.value.filter((row) => {
    const matchesQuery = !query || Object.values(row).some((value) => String(value).toLocaleLowerCase('vi').includes(query))
    const matchesFilter = !filter?.field || String(row[filter.field]) === filter.value
    return matchesQuery && matchesFilter
  })
})

function openCreate() {
  editingRow.value = null
  drawerOpen.value = true
}

function openEdit(row: AdminRow) {
  editingRow.value = { ...row }
  drawerOpen.value = true
}

function saveRow(value: AdminRow) {
  if (editingRow.value?.id) {
    const index = rows.value.findIndex((row) => row.id === editingRow.value?.id)
    if (index >= 0) rows.value[index] = { ...rows.value[index], ...value }
  } else {
    rows.value.unshift({ id: Date.now(), ...value })
  }
  drawerOpen.value = false
}

function refresh() {
  loading.value = true
  window.setTimeout(() => { loading.value = false }, 650)
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <div class="grid gap-7 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">{{ config.eyebrow }}</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">{{ config.title }}</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">{{ config.description }}</p>
      </div>
      <AppButton :label="config.addLabel" icon="plus" @click="openCreate" />
    </div>

    <div class="mt-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex max-w-full gap-1 overflow-x-auto pb-1">
        <button v-for="(filter, index) in config.filters" :key="filter.label" type="button" class="filter-tab" :class="activeFilter === index ? 'filter-tab--active' : ''" @click="activeFilter = index">
          {{ filter.label }}
        </button>
      </div>
      <div class="flex gap-2">
        <label class="admin-search">
          <AppIcon name="search" :size="17" />
          <input v-model="search" type="search" :placeholder="config.searchPlaceholder">
        </label>
        <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-[0.96]" aria-label="Làm mới dữ liệu" @click="refresh">
          <AppIcon name="refresh" :size="17" />
        </button>
      </div>
    </div>

    <div class="mt-5">
      <AdminDataTable v-if="filteredRows.length || loading" :columns="config.columns" :rows="filteredRows" :loading="loading" @edit="openEdit" />
      <AdminEmptyState v-else title="Không tìm thấy kết quả" :description="`Thử từ khóa khác hoặc thêm ${config.singularLabel} mới.`" />
    </div>

    <div class="mt-5 flex items-center justify-between text-[0.68rem] text-[#7a8176]">
      <span>Hiển thị {{ filteredRows.length }} / {{ rows.length }} {{ config.singularLabel }}</span>
      <span>Dữ liệu mẫu · Chưa kết nối MySQL</span>
    </div>

    <AdminEntityDrawer
      :open="drawerOpen"
      :title="editingRow ? `Chỉnh sửa ${config.singularLabel}` : config.addLabel"
      :fields="config.fields"
      :value="editingRow"
      @close="drawerOpen = false"
      @save="saveRow"
    />
  </section>
</template>
