<script setup lang="ts">
import type { CustomerAccount } from '~/composables/useCustomerAuth'

useStoreSeo('Lịch của tôi | MIÊN Spa', 'Xem, đổi hoặc hủy lịch hẹn và theo dõi quyền lợi thành viên tại MIÊN Spa.', '/lich-cua-toi')

type Appointment = { id: number; reference: string; startsAt: string; endsAt: string; status: string; statusLabel: string; totalAmount: number; serviceId: number; service: string; durationMinutes: number; employeeId: number | null; employee: string | null; branch: string; branchAddress: string | null; canManage: boolean; cancellationReason: string | null }
type Dashboard = { customer: CustomerAccount; appointments: Appointment[]; notifications: Array<{ id: number; title: string; message: string; scheduledAt: string }>; promotions: Array<{ id: number; name: string; description: string | null; discountType: 'percent' | 'fixed_amount'; discountValue: number; endsAt: string }> }
type BookingOptions = { branches: Array<{ id: number; name: string }>; employees: Array<{ id: number; branchId: number; name: string }>; services: Array<{ id: number; name: string }>; promotions: unknown[] }
type Availability = { slots: Array<{ time: string; employeeId: number; employeeName: string }> }

const { customer, loaded, logout } = useCustomerAuth()
const { openBooking } = useBookingDrawer()
const { data: meResponse } = await useAsyncData('customer-me', () => $fetch<{ data: CustomerAccount | null }>('/api/customer-auth/me'))
customer.value = meResponse.value?.data ?? null
loaded.value = true
if (!customer.value) {
  await navigateTo({ path: '/dang-nhap', query: { redirect: '/lich-cua-toi' } })
}
const { data: dashboardResponse, pending, refresh } = await useAsyncData('customer-appointments', () => customer.value ? $fetch<{ data: Dashboard }>('/api/customer/appointments') : Promise.resolve(null), { watch: [customer] })
const { data: optionsResponse } = await useAsyncData('customer-booking-options', () => $fetch<{ data: BookingOptions }>('/api/booking/options'))
const dashboard = computed(() => dashboardResponse.value?.data)
const upcoming = computed(() => dashboard.value?.appointments.filter(item => new Date(item.startsAt) >= new Date() && item.status !== 'cancelled') ?? [])
const history = computed(() => dashboard.value?.appointments.filter(item => new Date(item.startsAt) < new Date() || item.status === 'cancelled') ?? [])

const manageOpen = ref(false)
const manageMode = ref<'reschedule' | 'cancel'>('reschedule')
const activeAppointment = ref<Appointment | null>(null)
const manageForm = reactive({ date: '', employeeId: '', time: '', reason: '' })
const availability = ref<Availability | null>(null)
const availabilityBusy = ref(false)
const manageBusy = ref(false)
const manageError = ref('')
const successMessage = ref('')

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
const formatTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
const tier = computed(() => (customer.value?.totalSpent ?? 0) >= 10_000_000 ? 'An' : (customer.value?.totalSpent ?? 0) >= 3_000_000 ? 'Mộc' : 'Khách mới')

function errorText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Chưa thể thực hiện lúc này.'
}

async function signOut() {
  await logout()
  await navigateTo({ path: '/dang-nhap', query: { redirect: '/lich-cua-toi' } })
}

function openManage(appointment: Appointment, mode: 'reschedule' | 'cancel') {
  activeAppointment.value = appointment; manageMode.value = mode; manageError.value = ''; successMessage.value = ''; availability.value = null
  manageForm.date = ''; manageForm.employeeId = appointment.employeeId ? String(appointment.employeeId) : ''; manageForm.time = ''; manageForm.reason = ''
  manageOpen.value = true
}

async function loadAvailability() {
  if (!activeAppointment.value || !manageForm.date) return
  availabilityBusy.value = true; manageError.value = ''; manageForm.time = ''
  try {
    const branch = optionsResponse.value?.data.branches.find(item => item.name === activeAppointment.value?.branch)
    const response = await $fetch<{ data: Availability }>('/api/booking/availability', { query: { branchId: branch?.id, serviceId: activeAppointment.value.serviceId, date: manageForm.date, employeeId: manageForm.employeeId || undefined } })
    availability.value = response.data
  } catch (error) { manageError.value = errorText(error) } finally { availabilityBusy.value = false }
}

watch(() => [manageForm.date, manageForm.employeeId], () => { if (manageOpen.value && manageMode.value === 'reschedule') loadAvailability() })

async function submitManage() {
  if (!activeAppointment.value) return
  manageBusy.value = true; manageError.value = ''
  try {
    const slot = availability.value?.slots.find(item => item.time === manageForm.time)
    await $fetch(`/api/customer/appointments/${activeAppointment.value.id}`, { method: 'PATCH', body: manageMode.value === 'cancel' ? { action: 'cancel', reason: manageForm.reason } : { action: 'reschedule', date: manageForm.date, time: manageForm.time, employeeId: slot?.employeeId } })
    manageOpen.value = false
    successMessage.value = manageMode.value === 'cancel' ? 'Lịch hẹn đã được hủy.' : 'Yêu cầu đổi lịch đã được ghi nhận.'
    await refresh()
  } catch (error) { manageError.value = errorText(error) } finally { manageBusy.value = false }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10 md:pt-16 lg:px-14">
      <template v-if="customer">
        <header class="flex flex-wrap items-end justify-between gap-6 border-b border-[#78816f]/25 pb-8">
          <div><p class="section-label">Lịch của tôi</p><h1 class="mt-3 font-display text-5xl font-light tracking-[-0.04em]">Chào {{ customer.name }}.</h1></div>
          <nav class="flex flex-wrap gap-3" aria-label="Khu vực tài khoản"><NuxtLink to="/tai-khoan" class="button-quiet">Hồ sơ</NuxtLink><NuxtLink to="/don-hang" class="button-quiet">Đơn hàng</NuxtLink><NuxtLink to="/danh-gia" class="button-quiet">Đánh giá</NuxtLink><button type="button" class="button-primary" @click="openBooking()">Đặt lịch mới</button><button type="button" class="button-quiet" @click="signOut">Đăng xuất</button></nav>
        </header>
        <p v-if="successMessage" class="mt-6 border-l-2 border-[#617657] bg-[#e4e8dc] px-4 py-3 text-sm">{{ successMessage }}</p>

        <section class="mt-8 grid gap-4 sm:grid-cols-3">
          <article class="bg-[#e5dfd1] p-6"><p class="section-label">Hạng thành viên</p><p class="mt-3 text-2xl font-semibold">{{ tier }}</p></article>
          <article class="bg-[#e5dfd1] p-6"><p class="section-label">Điểm MIÊN</p><p class="mt-3 text-2xl font-semibold tabular-nums">{{ customer.loyaltyPoints.toLocaleString('vi-VN') }}</p></article>
          <article class="bg-[#e5dfd1] p-6"><p class="section-label">Tổng đồng hành</p><p class="mt-3 text-2xl font-semibold">{{ money(customer.totalSpent) }}</p></article>
        </section>

        <section class="mt-14">
          <div class="flex items-end justify-between gap-4"><div><p class="section-label">Sắp tới</p><h2 class="mt-3 text-2xl font-semibold">Lịch hẹn của bạn</h2></div><span class="text-xs text-[#737a70]">{{ upcoming.length }} lịch</span></div>
          <div v-if="pending" class="mt-6 text-sm text-[#737a70]">Đang tải lịch…</div>
          <div v-else-if="upcoming.length" class="mt-6 grid gap-4">
            <article v-for="item in upcoming" :key="item.id" class="grid gap-5 border border-[#78816f]/20 bg-[#f8f4eb] p-6 md:grid-cols-[150px_1fr_auto] md:items-center">
              <div><p class="text-2xl font-semibold tabular-nums">{{ formatTime(item.startsAt) }}</p><p class="mt-1 text-xs capitalize text-[#70776c]">{{ formatDate(item.startsAt) }}</p></div>
              <div><div class="flex flex-wrap items-center gap-3"><h3 class="font-semibold">{{ item.service }}</h3><StatusBadge :label="item.statusLabel" /></div><p class="mt-2 text-xs leading-5 text-[#70776c]">{{ item.employee || 'MIÊN sẽ phân công' }} · {{ item.branch }}<br>Mã {{ item.reference }}</p></div>
              <div class="flex flex-wrap gap-2 md:justify-end"><button v-if="item.canManage" type="button" class="button-quiet" @click="openManage(item, 'reschedule')">Đổi lịch</button><button v-if="item.canManage" type="button" class="px-3 py-2 text-xs font-semibold text-[#8b5148]" @click="openManage(item, 'cancel')">Hủy</button></div>
            </article>
          </div>
          <div v-else class="mt-6 border border-dashed border-[#78816f]/30 p-8 text-sm text-[#70776c]">Bạn chưa có lịch sắp tới. <button type="button" class="font-semibold underline" @click="openBooking()">Đặt một khoảng nghỉ</button>.</div>
        </section>

        <div class="mt-14 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <section><p class="section-label">Đã đồng hành</p><h2 class="mt-3 text-2xl font-semibold">Lịch sử liệu trình</h2><div class="mt-5 divide-y divide-[#78816f]/20 border-y border-[#78816f]/20"><article v-for="item in history" :key="item.id" class="flex flex-wrap items-center justify-between gap-4 py-5"><div><p class="font-semibold">{{ item.service }}</p><p class="mt-1 text-xs text-[#737a70]">{{ formatDate(item.startsAt) }} · {{ item.statusLabel }}</p></div><button type="button" class="text-xs font-semibold underline underline-offset-4" @click="openBooking(item.serviceId)">Đặt lại</button></article><p v-if="!history.length" class="py-6 text-sm text-[#737a70]">Chưa có lịch sử liệu trình.</p></div></section>
          <aside class="space-y-8"><section><p class="section-label">Ưu đãi hiện có</p><div class="mt-4 grid gap-3"><article v-for="promo in dashboard?.promotions" :key="promo.id" class="bg-[#dfe4d7] p-5"><p class="font-semibold">{{ promo.name }}</p><p class="mt-2 text-xs leading-5 text-[#687061]">{{ promo.description || 'Ưu đãi được áp dụng theo điều kiện chương trình.' }}</p></article><p v-if="!dashboard?.promotions.length" class="text-sm text-[#737a70]">Chưa có ưu đãi đang diễn ra.</p></div></section><section><p class="section-label">Nhắc lịch</p><div class="mt-4 grid gap-3"><article v-for="notice in dashboard?.notifications.slice(0, 5)" :key="notice.id" class="border-l-2 border-[#708066] pl-4"><p class="text-sm font-semibold">{{ notice.title }}</p><p class="mt-1 text-xs leading-5 text-[#737a70]">{{ notice.message }}</p></article><p v-if="!dashboard?.notifications.length" class="text-sm text-[#737a70]">Thông báo về lịch hẹn sẽ xuất hiện tại đây.</p></div></section></aside>
        </div>
      </template>
    </main>
    <SiteFooter />

    <CommonModal :open="manageOpen" :title="manageMode === 'cancel' ? 'Hủy lịch hẹn' : 'Chọn thời gian mới'" :description="activeAppointment?.service" size="sm" @close="manageOpen = false">
      <div v-if="manageMode === 'cancel'" class="grid gap-5"><p class="text-sm leading-6 text-[#687061]">Bạn có thể hủy trước giờ hẹn ít nhất 2 tiếng. MIÊN sẽ lưu lại thay đổi ngay.</p><label class="field-block"><span>Lý do <i>không bắt buộc</i></span><CommonTextarea v-model="manageForm.reason" rows="3" placeholder="Cho MIÊN biết nếu có điều cần lưu ý" /></label></div>
      <div v-else class="grid gap-5"><label class="field-block"><span>Ngày mới</span><CommonDatePicker v-model="manageForm.date" :min="today" /></label><label class="field-block"><span>Kỹ thuật viên</span><CommonSelect v-model="manageForm.employeeId"><option value="">Ai cũng được</option><option v-for="person in optionsResponse?.data.employees" :key="person.id" :value="person.id">{{ person.name }}</option></CommonSelect></label><div><p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#65705f]">Khung giờ còn trống</p><p v-if="availabilityBusy" class="mt-3 text-sm text-[#737a70]">Đang kiểm tra…</p><div v-else-if="availability?.slots.length" class="mt-3 grid grid-cols-3 gap-2"><button v-for="slot in availability.slots" :key="`${slot.time}-${slot.employeeId}`" type="button" class="rounded-full border px-3 py-2 text-xs font-semibold" :class="manageForm.time === slot.time ? 'border-[#4c5d43] bg-[#4c5d43] text-white' : 'border-[#78816f]/30'" @click="manageForm.time = slot.time">{{ slot.time }}</button></div><p v-else-if="manageForm.date" class="mt-3 text-sm text-[#737a70]">Không còn khung giờ phù hợp.</p></div></div>
      <p v-if="manageError" class="mt-5 text-sm text-[#8b5148]">{{ manageError }}</p>
      <template #footer><div class="flex justify-end gap-3"><AppButton label="Để sau" variant="secondary" @click="manageOpen = false" /><AppButton :label="manageBusy ? 'Đang lưu…' : manageMode === 'cancel' ? 'Xác nhận hủy' : 'Gửi yêu cầu đổi'" :disabled="manageBusy || (manageMode === 'reschedule' && !manageForm.time)" @click="submitManage" /></div></template>
    </CommonModal>
  </div>
</template>
