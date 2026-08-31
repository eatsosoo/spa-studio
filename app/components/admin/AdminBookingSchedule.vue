<script setup lang="ts">
import { adminResources } from '~/data/admin'
import type { AdminFormField, AdminRow } from '~/types'

type ScheduleEmployee = { id: number; name: string; role: string; status: string }
type ScheduleBooking = {
  id: number
  reference: string
  customer: string
  phone: string
  date: string
  time: string
  endTime: string
  durationMinutes: number
  service: string
  staffId: number
  staff: string
  note: string
  status: string
}
type ScheduleData = { date: string; employees: ScheduleEmployee[]; bookings: ScheduleBooking[] }
type FormOptions = { services: string[]; employees: string[] }
type PositionedBooking = ScheduleBooking & { top: number; height: number; lane: number; lanes: number }

const config = adminResources.bookings
const todayKey = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
const selectedDate = ref(todayKey)
const viewMode = ref<'timeline' | 'list'>('timeline')
const search = ref('')
const activeFilter = ref(0)
const drawerOpen = ref(false)
const editingRow = ref<AdminRow | null>(null)
const deletingRow = ref<ScheduleBooking | null>(null)
const saving = ref(false)
const deleting = ref(false)
const mutationError = ref('')
const successMessage = ref('')
const currentMinute = ref(0)
let clockTimer: ReturnType<typeof setInterval> | undefined

const { data: response, pending, error, refresh } = await useAsyncData(
  'admin-booking-schedule',
  () => $fetch<{ data: ScheduleData }>('/api/admin/schedule', { query: { date: selectedDate.value } }),
  { watch: [selectedDate] },
)
const { data: optionsResponse, refresh: refreshOptions } = await useAsyncData(
  'admin-booking-schedule-options',
  () => $fetch<{ data: FormOptions }>('/api/admin/form-options'),
)

const schedule = computed<ScheduleData>(() => response.value?.data ?? { date: selectedDate.value, employees: [], bookings: [] })
const filter = computed(() => config.filters[activeFilter.value])
const filteredBookings = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('vi')
  return schedule.value.bookings.filter(booking => {
    const matchesSearch = !query || [booking.customer, booking.phone, booking.service, booking.staff, booking.reference].some(value => value.toLocaleLowerCase('vi').includes(query))
    const matchesFilter = !filter.value?.field || booking.status === filter.value.value
    return matchesSearch && matchesFilter
  })
})
const employees = computed<ScheduleEmployee[]>(() => {
  const result = [...schedule.value.employees]
  for (const booking of schedule.value.bookings) {
    if (booking.staffId && !result.some(employee => employee.id === booking.staffId)) result.push({ id: booking.staffId, name: booking.staff, role: 'Không còn hoạt động', status: 'Đã nghỉ việc' })
  }
  return [{ id: 0, name: 'Chưa phân công', role: 'Cần sắp xếp', status: '' }, ...result]
})
const formFields = computed<AdminFormField[]>(() => config.fields.map(field => {
  if (field.key === 'service') return { ...field, options: optionsResponse.value?.data.services ?? field.options }
  if (field.key === 'staff') return { ...field, options: ['Chưa phân công', ...(optionsResponse.value?.data.employees ?? field.options ?? [])] }
  if (field.key === 'status') return { ...field, options: ['Chờ xác nhận', 'Đã xác nhận', 'Đã đến', 'Đang phục vụ', 'Đã hoàn tất', 'Đã hủy'] }
  return field
}))
const createDefaults = computed<AdminRow>(() => ({ date: selectedDate.value, time: '09:00', staff: 'Chưa phân công', status: 'Chờ xác nhận' }))
const selectedDateLabel = computed(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate.value}T12:00:00+07:00`)))
const summary = computed(() => ({
  total: schedule.value.bookings.length,
  pending: schedule.value.bookings.filter(item => item.status === 'Chờ xác nhận').length,
  active: schedule.value.bookings.filter(item => ['Đã xác nhận', 'Đã đến', 'Đang phục vụ'].includes(item.status)).length,
  unassigned: schedule.value.bookings.filter(item => !item.staffId).length,
}))

const minuteOfDay = (value: string) => {
  const [hour = 0, minute = 0] = value.split(':').map(Number)
  return hour * 60 + minute
}
const startHour = computed(() => Math.max(0, Math.min(8, ...filteredBookings.value.map(item => Math.floor(minuteOfDay(item.time) / 60)))))
const endHour = computed(() => Math.min(24, Math.max(20, ...filteredBookings.value.map(item => Math.ceil((minuteOfDay(item.time) + item.durationMinutes) / 60)))))
const hourHeight = 72
const timelineHeight = computed(() => (endHour.value - startHour.value) * hourHeight)
const hourMarkers = computed(() => Array.from({ length: endHour.value - startHour.value + 1 }, (_, index) => startHour.value + index))
const currentLineTop = computed(() => {
  if (selectedDate.value !== todayKey || currentMinute.value < startHour.value * 60 || currentMinute.value > endHour.value * 60) return null
  return (currentMinute.value - startHour.value * 60) / 60 * hourHeight
})

function layoutCluster(cluster: ScheduleBooking[], output: PositionedBooking[]) {
  const laneEnds: number[] = []
  const placed = cluster.map(booking => {
    const start = minuteOfDay(booking.time)
    const end = start + booking.durationMinutes
    let lane = laneEnds.findIndex(laneEnd => laneEnd <= start)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = end
    return { booking, lane }
  })
  const lanes = Math.max(1, laneEnds.length)
  for (const item of placed) {
    const start = minuteOfDay(item.booking.time)
    output.push({ ...item.booking, lane: item.lane, lanes, top: (start - startHour.value * 60) / 60 * hourHeight, height: Math.max(44, item.booking.durationMinutes / 60 * hourHeight) })
  }
}

function layoutBookings(rows: ScheduleBooking[]) {
  const sorted = [...rows].sort((left, right) => minuteOfDay(left.time) - minuteOfDay(right.time))
  const output: PositionedBooking[] = []
  let cluster: ScheduleBooking[] = []
  let clusterEnd = -1
  for (const booking of sorted) {
    const start = minuteOfDay(booking.time)
    const end = start + booking.durationMinutes
    if (cluster.length && start >= clusterEnd) {
      layoutCluster(cluster, output)
      cluster = []
      clusterEnd = -1
    }
    cluster.push(booking)
    clusterEnd = Math.max(clusterEnd, end)
  }
  if (cluster.length) layoutCluster(cluster, output)
  return output
}

const positionedByEmployee = computed(() => {
  const groups = new Map<number, PositionedBooking[]>()
  for (const employee of employees.value) groups.set(employee.id, layoutBookings(filteredBookings.value.filter(booking => booking.staffId === employee.id)))
  return groups
})
const conflicts = computed(() => [...positionedByEmployee.value.values()].reduce((total, rows) => total + rows.filter(row => row.lanes > 1).length, 0))
const timelineColumns = computed(() => `72px repeat(${employees.value.length}, minmax(210px, 1fr))`)
const timelineMinWidth = computed(() => `${72 + employees.value.length * 210}px`)
const listRows = computed<AdminRow[]>(() => filteredBookings.value.map(row => ({ ...row, room: 'Chưa xếp' })))

function updateClock() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  currentMinute.value = Number(parts.find(part => part.type === 'hour')?.value ?? 0) * 60 + Number(parts.find(part => part.type === 'minute')?.value ?? 0)
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 60_000)
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })

function shiftDate(offset: number) {
  const date = new Date(`${selectedDate.value}T12:00:00+07:00`)
  date.setDate(date.getDate() + offset)
  selectedDate.value = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
}

function openCreate() {
  editingRow.value = null
  mutationError.value = ''
  drawerOpen.value = true
}

function openEdit(row: ScheduleBooking | AdminRow) {
  editingRow.value = { ...row }
  mutationError.value = ''
  drawerOpen.value = true
}

function errorMessage(value: unknown) {
  const failure = value as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
  return failure?.data?.statusMessage ?? failure?.data?.message ?? failure?.statusMessage ?? failure?.message ?? 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'
}

async function saveBooking(value: AdminRow) {
  saving.value = true
  mutationError.value = ''
  try {
    const id = editingRow.value?.id
    await $fetch(id ? `/api/admin/bookings/${id}` : '/api/admin/bookings', { method: id ? 'PATCH' : 'POST', body: value })
    drawerOpen.value = false
    successMessage.value = `Đã ${id ? 'cập nhật' : 'tạo'} lịch hẹn thành công.`
    const targetDate = String(value.date ?? selectedDate.value)
    if (targetDate !== selectedDate.value) selectedDate.value = targetDate
    else await refresh()
    await refreshOptions()
  } catch (failure) {
    mutationError.value = errorMessage(failure)
  } finally {
    saving.value = false
  }
}

async function removeBooking() {
  if (!deletingRow.value) return
  deleting.value = true
  mutationError.value = ''
  try {
    await $fetch(`/api/admin/bookings/${deletingRow.value.id}`, { method: 'DELETE' })
    deletingRow.value = null
    successMessage.value = 'Đã xóa lịch hẹn.'
    await refresh()
  } catch (failure) {
    mutationError.value = errorMessage(failure)
  } finally {
    deleting.value = false
  }
}

function bookingTone(status: string) {
  if (status === 'Chờ xác nhận') return 'border-[#b38c62]/45 bg-[#f1e5d4] text-[#654f38]'
  if (status === 'Đã xác nhận') return 'border-[#718269]/40 bg-[#e0e8dc] text-[#3f5139]'
  if (status === 'Đã đến') return 'border-[#657b7b]/40 bg-[#dfe8e6] text-[#3e5352]'
  if (status === 'Đang phục vụ') return 'border-[#52684d]/45 bg-[#d3dfcf] text-[#33452f]'
  if (status === 'Đã hoàn tất') return 'border-[#858b80]/30 bg-[#e8e6df] text-[#62675f]'
  return 'border-[#9a6d64]/30 bg-[#efe1dd] text-[#795149] opacity-70'
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1600px] px-4 py-7 md:px-8 md:py-10 lg:px-10">
    <header class="grid gap-6 border-b border-[#78816f]/20 pb-7 xl:grid-cols-[1fr_auto] xl:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Điều phối trong ngày</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Lịch nhân viên</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Quan sát thời lượng, khoảng trống và lịch trùng của toàn bộ đội ngũ trên cùng một trục thời gian.</p>
      </div>
      <AppButton label="Tạo lịch hẹn" icon="plus" @click="openCreate" />
    </header>

    <div class="mt-6 grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
      <div class="flex items-center gap-2">
        <button type="button" class="grid size-10 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-95" aria-label="Ngày trước" @click="shiftDate(-1)"><AppIcon name="chevron" :size="15" class="rotate-180" /></button>
        <div class="w-[190px]"><AdminDatePicker v-model="selectedDate" aria-label="Ngày xem lịch" /></div>
        <button type="button" class="grid size-10 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-95" aria-label="Ngày sau" @click="shiftDate(1)"><AppIcon name="chevron" :size="15" /></button>
        <button v-if="selectedDate !== todayKey" type="button" class="rounded-full px-3 py-2 text-[0.68rem] font-semibold text-[#5b6955] transition hover:bg-[#e7e3d8]" @click="selectedDate = todayKey">Hôm nay</button>
      </div>

      <div class="min-w-0 text-left xl:text-center">
        <p class="text-sm font-semibold capitalize tracking-[-0.015em] text-[#384332]">{{ selectedDateLabel }}</p>
        <p class="mt-1 text-[0.66rem] text-[#7a8176]">{{ summary.total }} lịch · {{ summary.active }} đang vận hành · {{ summary.unassigned }} chưa phân công</p>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" class="filter-tab" :class="viewMode === 'timeline' ? 'filter-tab--active' : ''" @click="viewMode = 'timeline'">Timeline</button>
        <button type="button" class="filter-tab" :class="viewMode === 'list' ? 'filter-tab--active' : ''" @click="viewMode = 'list'">Danh sách</button>
        <button type="button" class="grid size-10 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-95" aria-label="Làm mới" @click="() => refresh()"><AppIcon name="refresh" :size="16" /></button>
      </div>
    </div>

    <div class="mt-5 flex flex-col gap-3 border-y border-[#78816f]/15 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex max-w-full gap-1 overflow-x-auto pb-1">
        <button v-for="(item, index) in config.filters" :key="item.label" type="button" class="filter-tab" :class="activeFilter === index ? 'filter-tab--active' : ''" @click="activeFilter = index">{{ item.label }}</button>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="conflicts" class="rounded-full bg-[#efe0da] px-3 py-1.5 text-[0.64rem] font-semibold text-[#80564d]">{{ conflicts }} lịch đang giao nhau</span>
        <label class="admin-search"><AppIcon name="search" :size="16" /><input v-model="search" type="search" placeholder="Tìm khách, dịch vụ, nhân viên"></label>
      </div>
    </div>

    <Transition name="fade"><div v-if="successMessage" class="mt-5 flex items-center justify-between gap-4 border-l-2 border-[#64735c] bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]" role="status"><span class="flex items-center gap-2"><AppIcon name="check" :size="16" />{{ successMessage }}</span><button type="button" aria-label="Đóng" @click="successMessage = ''"><AppIcon name="close" :size="14" /></button></div></Transition>
    <div v-if="error" class="mt-5 border border-[#aa746c]/25 bg-[#f1e6e0] px-6 py-9 text-center"><p class="text-sm font-semibold text-[#65443e]">Không tải được lịch trong ngày</p><p class="mt-2 text-xs text-[#80665f]">{{ errorMessage(error) }}</p></div>

    <div v-else-if="viewMode === 'timeline'" class="mt-5 overflow-hidden rounded-sm border border-[#78816f]/20 bg-[#f8f5ed]">
      <div v-if="pending" class="grid gap-px bg-[#78816f]/15 sm:grid-cols-3"><span v-for="index in 6" :key="index" class="h-28 animate-pulse bg-[#ebe7dc]" /></div>
      <div v-else class="max-h-[calc(100dvh-250px)] min-h-[440px] overflow-auto">
        <div :style="{ minWidth: timelineMinWidth }">
          <div class="sticky top-0 z-20 grid border-b border-[#78816f]/20 bg-[#f4f1e8]/95 backdrop-blur-md" :style="{ gridTemplateColumns: timelineColumns }">
            <div class="sticky left-0 z-30 grid min-h-16 place-items-center border-r border-[#78816f]/20 bg-[#f4f1e8]"><span class="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#858b81]">Giờ</span></div>
            <div v-for="employee in employees" :key="employee.id" class="flex min-w-0 items-center justify-between gap-3 border-r border-[#78816f]/15 px-4 py-3" :class="employee.id === 0 ? 'bg-[#eee8dd]' : ''">
              <span class="min-w-0"><strong class="block truncate text-[0.72rem] font-semibold text-[#384332]">{{ employee.name }}</strong><small class="mt-0.5 block truncate text-[0.59rem] text-[#81877d]">{{ employee.role }}</small></span>
              <span class="shrink-0 rounded-full bg-[#e3e7df] px-2 py-1 text-[0.58rem] tabular-nums text-[#5d6957]">{{ positionedByEmployee.get(employee.id)?.length ?? 0 }}</span>
            </div>
          </div>

          <div class="relative grid" :style="{ gridTemplateColumns: timelineColumns, height: `${timelineHeight}px` }">
            <div v-for="hour in hourMarkers" :key="hour" class="pointer-events-none absolute left-0 right-0 z-0 border-t border-[#78816f]/13" :style="{ top: `${(hour - startHour) * hourHeight}px` }" />
            <div v-if="currentLineTop !== null" class="pointer-events-none absolute left-[72px] right-0 z-10 border-t border-[#a16658]" :style="{ top: `${currentLineTop}px` }"><span class="absolute -left-1 -top-1 size-2 rounded-full bg-[#a16658]" /></div>
            <div class="sticky left-0 z-10 border-r border-[#78816f]/20 bg-[#f4f1e8]">
              <span v-for="hour in hourMarkers" :key="hour" class="absolute right-3 -translate-y-1/2 text-[0.6rem] tabular-nums text-[#858b81]" :style="{ top: `${(hour - startHour) * hourHeight}px` }">{{ String(hour).padStart(2, '0') }}:00</span>
            </div>
            <div v-for="employee in employees" :key="employee.id" class="relative border-r border-[#78816f]/15" :class="employee.id === 0 ? 'bg-[#eee8dd]/55' : ''">
              <button
                v-for="booking in positionedByEmployee.get(employee.id) ?? []"
                :key="booking.id"
                type="button"
                class="absolute z-[2] overflow-hidden rounded-md border px-2.5 py-2 text-left shadow-[0_8px_22px_-16px_rgba(44,54,39,0.55)] transition duration-200 hover:z-[3] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-14px_rgba(44,54,39,0.42)] active:scale-[0.99]"
                :class="bookingTone(booking.status)"
                :style="{ top: `${booking.top + 3}px`, height: `${booking.height - 6}px`, left: `calc(${booking.lane / booking.lanes * 100}% + 4px)`, width: `calc(${100 / booking.lanes}% - 8px)` }"
                :aria-label="`${booking.time}, ${booking.customer}, ${booking.service}, ${booking.status}`"
                @click="openEdit(booking)"
              >
                <span class="flex items-center justify-between gap-1 text-[0.56rem] font-semibold tabular-nums"><span>{{ booking.time }}–{{ booking.endTime }}</span><span v-if="booking.lanes > 1" class="size-1.5 rounded-full bg-[#9b5d51]" title="Trùng lịch" /></span>
                <strong class="mt-1 block truncate text-[0.68rem] font-semibold">{{ booking.customer }}</strong>
                <span v-if="booking.height >= 60" class="mt-0.5 block truncate text-[0.57rem] opacity-75">{{ booking.service }}</span>
              </button>
            </div>
            <div v-if="!filteredBookings.length" class="pointer-events-none absolute inset-x-[72px] top-28 z-10 text-center"><p class="text-sm font-semibold text-[#5f685b]">Không có lịch phù hợp</p><p class="mt-1 text-xs text-[#878d83]">Chọn ngày khác hoặc tạo lịch hẹn mới.</p></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="mt-5">
      <AdminDataTable :columns="config.columns" :rows="listRows" :loading="pending" @edit="openEdit" @remove="deletingRow = $event as unknown as ScheduleBooking" />
      <AdminEmptyState v-if="!pending && !listRows.length" title="Không có lịch phù hợp" description="Chọn ngày khác hoặc tạo lịch hẹn mới." />
    </div>

    <AdminEntityDrawer :open="drawerOpen" :title="editingRow ? 'Chỉnh sửa lịch hẹn' : 'Tạo lịch hẹn'" :fields="formFields" :value="editingRow ?? createDefaults" :saving="saving" :api-error="mutationError" @close="drawerOpen = false" @save="saveBooking" />

    <Teleport to="body"><Transition name="drawer"><div v-if="deletingRow" class="fixed inset-0 z-[60] grid place-items-center px-5" role="alertdialog" aria-modal="true" aria-label="Xác nhận xóa lịch hẹn"><button type="button" class="absolute inset-0 cursor-default bg-[#20271e]/50 backdrop-blur-[2px]" aria-label="Đóng" @click="deletingRow = null" /><div class="relative w-full max-w-md rounded-md bg-[#f6f3eb] p-7 shadow-2xl"><h2 class="text-xl font-semibold text-[#30392d]">Xóa lịch của {{ deletingRow.customer }}?</h2><p class="mt-2 text-xs leading-6 text-[#737a70]">Lịch {{ deletingRow.time }} · {{ deletingRow.service }} sẽ bị xóa khỏi hệ thống.</p><p v-if="mutationError" class="mt-4 text-xs text-[#8b5148]">{{ mutationError }}</p><div class="mt-7 flex justify-end gap-3 border-t border-[#78816f]/20 pt-5"><AppButton label="Giữ lại" variant="secondary" :disabled="deleting" @click="deletingRow = null" /><AppButton :label="deleting ? 'Đang xóa…' : 'Xác nhận xóa'" :disabled="deleting" @click="removeBooking" /></div></div></div></Transition></Teleport>
  </section>
</template>
