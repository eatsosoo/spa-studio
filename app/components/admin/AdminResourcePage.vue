<script setup lang="ts">
import type { AdminRow, PaginatedResponse, PaginationMeta } from '~/types'
import type { AdminResourceConfig } from '~/data/admin'

const props = defineProps<{ config: AdminResourceConfig }>()
const route = useRoute()
const router = useRouter()
const isPosts = computed(() => props.config.resource === 'posts')
const search = ref('')
const debouncedSearch = ref('')
const activeFilter = ref(0)
const page = ref(1)
const pageSize = ref(10)
const drawerOpen = ref(false)
const editingRow = ref<AdminRow | null>(null)
const deletingRow = ref<AdminRow | null>(null)
const saving = ref(false)
const deleting = ref(false)
const mutationError = ref('')
const successMessage = ref(route.query.saved === 'updated' ? 'Đã cập nhật bài viết thành công.' : route.query.saved === 'created' ? 'Đã tạo bài viết thành công.' : '')
type FormOptions = { services: string[]; employees: string[]; productCategories: string[]; postCategories: string[] }
const emptyMeta: PaginationMeta = { page: 1, pageSize: 10, total: 0, totalPages: 1, from: 0, to: 0 }
const activeFilterConfig = computed(() => props.config.filters[activeFilter.value])
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })

const { data: response, pending, error, refresh } = await useAsyncData(
  `admin-${props.config.resource}`,
  () => $fetch<PaginatedResponse<AdminRow>>(`/api/admin/${props.config.resource}`, {
    query: {
      page: page.value,
      pageSize: pageSize.value,
      search: debouncedSearch.value || undefined,
      filterField: activeFilterConfig.value?.field || undefined,
      filterValue: activeFilterConfig.value?.value || undefined,
    },
  }),
  { watch: [page, pageSize, debouncedSearch, activeFilter] },
)
const { data: optionsResponse, refresh: refreshOptions } = await useAsyncData(
  `admin-form-options-${props.config.resource}`,
  () => $fetch<{ data: FormOptions }>('/api/admin/form-options'),
)

const formFields = computed(() => props.config.fields.map((field) => {
  const options = optionsResponse.value?.data
  if (!options) return field
  if (props.config.resource === 'bookings' && field.key === 'service' && options.services.length) return { ...field, options: options.services }
  if (props.config.resource === 'bookings' && field.key === 'staff' && options.employees.length) return { ...field, options: options.employees }
  if (props.config.resource === 'products' && field.key === 'category' && options.productCategories.length) return { ...field, options: options.productCategories }
  if (props.config.resource === 'posts' && field.key === 'category' && options.postCategories.length) return { ...field, options: options.postCategories }
  return field
}))

const rows = computed(() => response.value?.data ?? [])
const pagination = computed(() => response.value?.meta ?? { ...emptyMeta, pageSize: pageSize.value })

watch(() => response.value?.meta.page, (resolvedPage) => {
  if (resolvedPage && resolvedPage !== page.value) page.value = resolvedPage
})

function selectFilter(index: number) {
  page.value = 1
  activeFilter.value = index
}

function selectPageSize(value: number) {
  page.value = 1
  pageSize.value = value
}

function errorMessage(value: unknown) {
  const failure = value as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
  return failure?.data?.statusMessage ?? failure?.data?.message ?? failure?.statusMessage ?? failure?.message ?? 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'
}

function openCreate() {
  if (isPosts.value) {
    router.push('/admin/bai-viet/moi')
    return
  }
  editingRow.value = null
  mutationError.value = ''
  successMessage.value = ''
  drawerOpen.value = true
}

function openEdit(row: AdminRow) {
  if (isPosts.value) {
    router.push(`/admin/bai-viet/${row.id}`)
    return
  }
  editingRow.value = { ...row }
  mutationError.value = ''
  successMessage.value = ''
  drawerOpen.value = true
}

async function saveRow(value: AdminRow) {
  saving.value = true
  mutationError.value = ''
  try {
    const id = editingRow.value?.id
    await $fetch(id ? `/api/admin/${props.config.resource}/${id}` : `/api/admin/${props.config.resource}`, { method: id ? 'PATCH' : 'POST', body: value })
    if (!id) page.value = 1
    await refresh()
    await refreshOptions()
    drawerOpen.value = false
    successMessage.value = `Đã ${id ? 'cập nhật' : 'tạo'} ${props.config.singularLabel} thành công.`
  } catch (failure) {
    mutationError.value = errorMessage(failure)
  } finally {
    saving.value = false
  }
}

async function removeRow() {
  if (!deletingRow.value?.id) return
  deleting.value = true
  mutationError.value = ''
  try {
    await $fetch(`/api/admin/${props.config.resource}/${deletingRow.value.id}`, { method: 'DELETE' })
    deletingRow.value = null
    await refresh()
    successMessage.value = `Đã xóa ${props.config.singularLabel} khỏi danh sách.`
  } catch (failure) {
    mutationError.value = errorMessage(failure)
  } finally {
    deleting.value = false
  }
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
        <button v-for="(filter, index) in config.filters" :key="filter.label" type="button" class="filter-tab" :class="activeFilter === index ? 'filter-tab--active' : ''" @click="selectFilter(index)">{{ filter.label }}</button>
      </div>
      <div class="flex gap-2">
        <label class="admin-search"><AppIcon name="search" :size="17" /><input v-model="search" type="search" :placeholder="config.searchPlaceholder"></label>
        <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-[0.96]" aria-label="Làm mới dữ liệu" @click="() => refresh()"><AppIcon name="refresh" :size="17" /></button>
      </div>
    </div>

    <div class="mt-5">
      <Transition name="fade">
        <div v-if="successMessage" class="mb-5 flex items-center justify-between gap-4 border-l-2 border-[#64735c] bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]" role="status">
          <span class="flex items-center gap-2"><AppIcon name="check" :size="16" />{{ successMessage }}</span>
          <button type="button" class="grid size-7 shrink-0 place-items-center rounded-full hover:bg-[#d5ded0]" aria-label="Đóng thông báo" @click="successMessage = ''"><AppIcon name="close" :size="14" /></button>
        </div>
      </Transition>
      <AdminDataTable v-if="rows.length || pending" :columns="config.columns" :rows="rows" :loading="pending" @edit="openEdit" @remove="deletingRow = $event" />
      <div v-else-if="error" class="rounded-sm border border-[#aa746c]/25 bg-[#f1e6e0] px-6 py-9 text-center">
        <p class="text-sm font-semibold text-[#65443e]">Không tải được dữ liệu</p>
        <p class="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#80665f]">{{ errorMessage(error) }}</p>
        <AppButton label="Thử lại" variant="secondary" icon="refresh" class="mt-5" @click="() => refresh()" />
      </div>
      <AdminEmptyState v-else title="Chưa có dữ liệu" :description="`Thêm ${config.singularLabel} đầu tiên để bắt đầu quản lý.`" />
      <AppPagination class="mt-5" :meta="pagination" @update:page="page = $event" @update:page-size="selectPageSize" />
    </div>

    <AdminEntityDrawer v-if="!isPosts" :open="drawerOpen" :title="editingRow ? `Chỉnh sửa ${config.singularLabel}` : config.addLabel" :fields="formFields" :value="editingRow ?? config.defaults" :saving="saving" :api-error="mutationError" @close="drawerOpen = false" @save="saveRow" />

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="deletingRow" class="fixed inset-0 z-[60] grid place-items-center px-5" role="alertdialog" aria-modal="true" aria-label="Xác nhận xóa">
          <button type="button" class="absolute inset-0 cursor-default bg-[#20271e]/50 backdrop-blur-[2px]" aria-label="Đóng" @click="deletingRow = null" />
          <div class="relative w-full max-w-md rounded-md bg-[#f6f3eb] p-7 shadow-2xl md:p-9">
            <span class="grid size-10 place-items-center rounded-full bg-[#ead9d3] text-[#7a4a41]"><AppIcon name="trash" :size="18" /></span>
            <h2 class="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#30392d]">Xóa {{ config.singularLabel }}?</h2>
            <p class="mt-2 text-xs leading-6 text-[#737a70]">Dữ liệu sẽ không còn xuất hiện trong danh sách quản trị. Hành động này cần được xác nhận.</p>
            <p v-if="mutationError" class="mt-4 text-xs text-[#8b5148]">{{ mutationError }}</p>
            <div class="mt-7 flex justify-end gap-3 border-t border-[#78816f]/20 pt-5">
              <AppButton label="Giữ lại" variant="secondary" :disabled="deleting" @click="deletingRow = null" />
              <AppButton :label="deleting ? 'Đang xóa…' : 'Xác nhận xóa'" :disabled="deleting" @click="removeRow" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
