<script setup lang="ts">
import type { AdminColumn, AdminRow, PaginatedResponse, PaginationMeta } from '~/types'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Đơn hàng | MIÊN Admin' })
const search = ref('')
const debouncedSearch = ref('')
const page = ref(1)
const pageSize = ref(20)
const activeStatus = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, value => { if (timer) clearTimeout(timer); timer = setTimeout(() => { debouncedSearch.value = value.trim(); page.value = 1 }, 300) })
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

const { data: response, pending, error, refresh } = await useAsyncData('admin-orders', () => $fetch<PaginatedResponse<AdminRow>>('/api/admin/orders', { query: { page: page.value, pageSize: pageSize.value, search: debouncedSearch.value || undefined, filterField: activeStatus.value ? 'statusLabel' : undefined, filterValue: activeStatus.value || undefined } }), { watch: [page, pageSize, debouncedSearch, activeStatus] })
const rows = computed(() => response.value?.data ?? [])
const meta = computed<PaginationMeta>(() => response.value?.meta ?? { page: 1, pageSize: pageSize.value, total: 0, totalPages: 1, from: 0, to: 0 })
const columns: AdminColumn[] = [
  { key: 'reference', label: 'Mã đơn' }, { key: 'createdAt', label: 'Thời điểm', type: 'date' }, { key: 'customer', label: 'Khách hàng' }, { key: 'itemCount', label: 'SL', type: 'number', align: 'right' }, { key: 'totalAmount', label: 'Tổng tiền', type: 'money', align: 'right' }, { key: 'fulfillmentStatusLabel', label: 'Giao hàng', type: 'status' }, { key: 'statusLabel', label: 'Đơn', type: 'status' },
]
const filters = ['', 'Đã xác nhận', 'Đã hoàn tất', 'Đã hủy']
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="border-b border-[#78816f]/20 pb-8"><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Bán hàng trực tuyến</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] md:text-4xl">Đơn hàng</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Xử lý đơn theo đúng thứ tự giữ kho, đóng gói, giao hàng và hoàn tất.</p></header>
    <div class="mt-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div class="flex gap-1 overflow-x-auto"><button v-for="filter in filters" :key="filter" class="filter-tab" :class="activeStatus === filter ? 'filter-tab--active' : ''" @click="activeStatus = filter; page = 1">{{ filter || 'Tất cả' }}</button></div><div class="flex gap-2"><label class="admin-search"><AppIcon name="search" :size="17" /><input v-model="search" type="search" placeholder="Tìm mã đơn, tên hoặc số điện thoại"></label><button class="grid size-10 place-items-center rounded-full border border-[#78816f]/25" aria-label="Làm mới" @click="() => refresh()"><AppIcon name="refresh" :size="17" /></button></div></div>
    <div v-if="error" class="mt-7 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-xs text-[#784b43]">Không thể tải danh sách đơn hàng.</div>
    <div v-else class="mt-5"><AdminDataTable :columns="columns" :rows="rows" :loading="pending"><template #actions="{ row }"><NuxtLink :to="`/admin/don-hang/${row.id}`" class="admin-inline-link">Xử lý <AppIcon name="arrow" :size="14" /></NuxtLink></template></AdminDataTable><AppPagination class="mt-5" :meta="meta" @update:page="page = $event" @update:page-size="pageSize = $event; page = 1" /></div>
  </section>
</template>
