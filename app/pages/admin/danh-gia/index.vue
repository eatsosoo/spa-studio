<script setup lang="ts">
import type { AdminColumn, AdminFeedback, AdminRow, PaginatedResponse, PaginationMeta } from '~/types'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Feedback khách hàng | MIÊN Admin' })

const search = ref('')
const debouncedSearch = ref('')
const status = ref('')
const type = ref('')
const rating = ref('')
const page = ref(1)
const pageSize = ref(20)
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
    page.value = 1
  }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
watch([status, type, rating], () => { page.value = 1 })

const { data: response, pending, error, refresh } = await useAsyncData(
  'admin-feedback',
  () => $fetch<PaginatedResponse<AdminFeedback>>('/api/admin/feedback', {
    query: {
      page: page.value,
      pageSize: pageSize.value,
      search: debouncedSearch.value || undefined,
      status: status.value || undefined,
      type: type.value || undefined,
      rating: rating.value || undefined,
    },
  }),
  { watch: [page, pageSize, debouncedSearch, status, type, rating] },
)

const rows = computed<AdminRow[]>(() => (response.value?.data ?? []).map(item => ({
  id: item.id,
  subjectName: item.subjectName,
  customerName: item.customerName,
  typeLabel: item.type === 'service' ? 'Liệu trình' : 'Sản phẩm',
  ratingLabel: `${item.rating}/5 ★`,
  statusLabel: item.statusLabel,
  createdAt: item.createdAt,
})))
const meta = computed<PaginationMeta>(() => response.value?.meta ?? {
  page: 1,
  pageSize: pageSize.value,
  total: 0,
  totalPages: 1,
  from: 0,
  to: 0,
})

const columns: AdminColumn[] = [
  { key: 'subjectName', label: 'Nội dung liên quan' },
  { key: 'customerName', label: 'Khách hàng' },
  { key: 'typeLabel', label: 'Loại' },
  { key: 'ratingLabel', label: 'Số sao' },
  { key: 'statusLabel', label: 'Trạng thái', type: 'status' },
  { key: 'createdAt', label: 'Thời gian', type: 'date' },
]

function resetFilters() {
  search.value = ''
  debouncedSearch.value = ''
  status.value = ''
  type.value = ''
  rating.value = ''
  page.value = 1
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="border-b border-[#78816f]/20 pb-8">
      <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Chất lượng trải nghiệm</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] md:text-4xl">Feedback khách hàng</h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Xem, duyệt hoặc ẩn các đánh giá đã được khách hàng gửi sau khi hoàn tất liệu trình và đơn hàng.</p>
    </header>

    <div class="mt-7 grid gap-3 xl:grid-cols-[minmax(250px,1fr)_180px_160px_130px_auto]">
      <label class="admin-search">
        <AppIcon name="search" :size="17" />
        <CommonInput v-model="search" type="search" placeholder="Tìm khách hàng, nội dung, mã tham chiếu…" />
      </label>
      <CommonSelect v-model="status" class="w-full rounded-[0.3rem] border border-[#58655047] bg-[#fffdf8ad] px-3 py-2.5 text-xs text-[#34402f] outline-none transition focus:border-[#607059]" aria-label="Lọc theo trạng thái">
        <option value="">Mọi trạng thái</option>
        <option value="pending">Chờ duyệt</option>
        <option value="approved">Đang hiển thị</option>
        <option value="hidden">Đã ẩn</option>
      </CommonSelect>
      <CommonSelect v-model="type" class="w-full rounded-[0.3rem] border border-[#58655047] bg-[#fffdf8ad] px-3 py-2.5 text-xs text-[#34402f] outline-none transition focus:border-[#607059]" aria-label="Lọc theo loại feedback">
        <option value="">Mọi loại</option>
        <option value="service">Liệu trình</option>
        <option value="product">Sản phẩm</option>
      </CommonSelect>
      <CommonSelect v-model="rating" class="w-full rounded-[0.3rem] border border-[#58655047] bg-[#fffdf8ad] px-3 py-2.5 text-xs text-[#34402f] outline-none transition focus:border-[#607059]" aria-label="Lọc theo số sao">
        <option value="">Mọi số sao</option>
        <option v-for="star in 5" :key="star" :value="star">{{ star }} sao</option>
      </CommonSelect>
      <div class="flex gap-2">
        <button type="button" class="grid size-10 place-items-center rounded-full border border-[#78816f]/25" aria-label="Làm mới" @click="refresh()"><AppIcon name="refresh" :size="17" /></button>
        <button v-if="search || status || type || rating" type="button" class="px-3 text-xs font-semibold underline underline-offset-4" @click="resetFilters">Xóa lọc</button>
      </div>
    </div>

    <div v-if="error" class="mt-7 border-l-2 border-[#98675c] bg-[#efe0da] px-5 py-4 text-xs text-[#784b43]" role="alert">
      Không thể tải danh sách feedback. <button type="button" class="font-semibold underline" @click="refresh()">Thử lại</button>
    </div>

    <div v-else class="mt-6">
      <AdminDataTable v-if="pending || rows.length" :columns="columns" :rows="rows" :loading="pending">
        <template #actions="{ row }">
          <NuxtLink :to="`/admin/danh-gia/${row.id}`" class="admin-inline-link">Xem chi tiết <AppIcon name="arrow" :size="14" /></NuxtLink>
        </template>
      </AdminDataTable>
      <AdminEmptyState v-else title="Chưa có feedback phù hợp" description="Thử thay đổi bộ lọc hoặc từ khóa để xem các đánh giá khác." />
      <AppPagination class="mt-5" :meta="meta" @update:page="page = $event" @update:page-size="pageSize = $event; page = 1" />
    </div>
  </section>
</template>
