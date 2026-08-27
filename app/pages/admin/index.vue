<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Tổng quan | MIÊN Admin' })
const { user } = useAdminAuth()
const greeting = computed(() => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }).format(new Date()))
  return hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
})

type DashboardData = { stats: Array<{ label: string; value: string; note: string }>; appointments: Array<Record<string, string | number>>; lowStock: Array<Record<string, string | number>>; customers: Array<Record<string, string | number>> }
const { data: response, pending, error, refresh } = await useAsyncData('admin-dashboard', () => $fetch<{ data: DashboardData }>('/api/admin/dashboard'))
const dashboard = computed<DashboardData>(() => response.value?.data ?? { stats: [], appointments: [], lowStock: [], customers: [] })
const stats = computed(() => pending.value ? Array.from({ length: 4 }, (_, index) => ({ label: ['Lịch hôm nay', 'Khách đang phục vụ', 'Doanh thu hôm nay', 'Sản phẩm sắp hết'][index]!, value: '—', note: 'Đang tải dữ liệu' })) : dashboard.value.stats)
const appointments = computed(() => dashboard.value.appointments)
const lowStock = computed(() => dashboard.value.lowStock)
</script>

<template>
  <section class="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <div v-if="error" class="mb-6 flex flex-col gap-3 rounded-sm border border-[#aa746c]/25 bg-[#f1e6e0] px-5 py-4 text-xs text-[#76514a] sm:flex-row sm:items-center sm:justify-between">
      <span>Chưa thể tải dữ liệu tổng quan từ MySQL.</span><AppButton label="Thử lại" variant="secondary" icon="refresh" @click="() => refresh()" />
    </div>
    <div class="grid gap-7 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Tổng quan vận hành</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">{{ greeting }}, {{ user?.fullName }}.</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Hôm nay MIÊN có nhịp lịch vừa phải. Ba yêu cầu mới đang chờ xác nhận trước 11 giờ.</p>
      </div>
      <AppButton label="Tạo lịch hẹn" icon="plus" to="/admin/dat-lich" />
    </div>

    <div class="mt-8 grid grid-cols-2 gap-y-8 border-b border-[#78816f]/20 pb-8 xl:grid-cols-4">
      <AdminStat v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <div class="mt-10 grid gap-10 xl:grid-cols-[1.35fr_0.65fr]">
      <section>
        <div class="flex items-end justify-between border-b border-[#78816f]/20 pb-4">
          <div>
            <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Nhịp trong ngày</p>
            <h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Lịch sắp tới</h2>
          </div>
          <NuxtLink to="/admin/dat-lich" class="admin-inline-link">Xem toàn bộ <AppIcon name="arrow" :size="14" /></NuxtLink>
        </div>

        <div>
          <article v-for="appointment in appointments" :key="appointment.id" class="grid gap-3 border-b border-[#78816f]/15 py-5 sm:grid-cols-[72px_1fr_auto] sm:items-center">
            <time class="text-lg font-semibold tracking-[-0.03em] text-[#394433]">{{ appointment.time }}</time>
            <div>
              <h3 class="text-xs font-semibold text-[#30392d]">{{ appointment.customer }}</h3>
              <p class="mt-1 text-[0.7rem] text-[#737a70]">{{ appointment.service }} · {{ appointment.staff }} · {{ appointment.room }}</p>
            </div>
            <StatusBadge :label="String(appointment.status)" />
          </article>
          <AdminEmptyState v-if="!pending && !appointments.length" title="Không có lịch sắp tới" description="Lịch hẹn trong ngày sẽ xuất hiện tại đây." />
        </div>
      </section>

      <aside class="rounded-md bg-[#e5e1d6] p-6 md:p-8">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#76806f]">Cần chú ý</p>
            <h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Tồn kho thấp</h2>
          </div>
          <span class="grid size-9 place-items-center rounded-full border border-[#737e6c]/25 text-[#697462]"><AppIcon name="alert" :size="17" /></span>
        </div>

        <div class="mt-7 divide-y divide-[#77816f]/20 border-y border-[#77816f]/20">
          <div v-for="item in lowStock" :key="item.id" class="flex items-center justify-between gap-4 py-4">
            <div>
              <p class="text-xs font-semibold">{{ item.name }}</p>
              <p class="mt-1 text-[0.65rem] text-[#767d72]">{{ item.sku }}</p>
            </div>
            <span class="text-xs font-semibold tabular-nums text-[#815149]">Còn {{ item.stock }}</span>
          </div>
        </div>
        <p v-if="!pending && !lowStock.length" class="mt-7 border-y border-[#77816f]/20 py-6 text-xs leading-5 text-[#737a70]">Tồn kho đang ở mức ổn định.</p>
        <AppButton label="Mở quản lý kho" variant="secondary" to="/admin/san-pham" class="mt-6 w-full justify-center" />
      </aside>
    </div>

    <section class="mt-12 border-t border-[#78816f]/20 pt-8">
      <div class="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Khách hàng</p>
          <h2 class="mt-3 max-w-xs text-2xl font-semibold tracking-[-0.035em]">Những người vừa quay lại MIÊN.</h2>
          <NuxtLink to="/admin/khach-hang" class="admin-inline-link mt-6">Mở danh sách khách <AppIcon name="arrow" :size="14" /></NuxtLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="customer in dashboard.customers" :key="customer.id" class="flex items-center gap-4 border-b border-[#78816f]/18 py-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-[#d9d4c7] text-[0.68rem] font-semibold text-[#4c5946]">{{ String(customer.name).split(' ').slice(-2).map((part) => part[0]).join('') }}</span>
            <div class="min-w-0">
              <p class="truncate text-xs font-semibold">{{ customer.name }}</p>
              <p class="mt-1 text-[0.65rem] text-[#788076]">{{ customer.visits }} lần ghé · {{ customer.lastVisit }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
