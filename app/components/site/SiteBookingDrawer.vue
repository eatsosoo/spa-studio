<script setup lang="ts">
type BookingResponse = {
  ok: boolean
  reference: string
  message: string
}

type BookingOptions = {
  branches: Array<{ id: number; name: string; address: string | null }>
  services: Array<{ id: number; name: string; durationMinutes: number; bufferMinutes: number; price: number }>
  employees: Array<{ id: number; branchId: number; name: string; role: string | null }>
}

type Availability = {
  date: string
  durationMinutes: number
  bufferMinutes: number
  slots: Array<{ time: string; employeeId: number; employeeName: string }>
}

const route = useRoute()
const { isBookingOpen, bookingIntent, openBooking, closeBooking } = useBookingDrawer()
const { customer, load: loadCustomer } = useCustomerAuth()
const drawer = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const bookingOptions = ref<BookingOptions>({ branches: [], services: [], employees: [] })
const optionsLoaded = ref(false)
const optionsPending = ref(false)
const optionsError = ref('')
const isSubmitting = ref(false)
const submitError = ref('')
const bookingResult = ref<BookingResponse | null>(null)
const errors = reactive<Record<string, string>>({})
const form = reactive({
  name: '',
  phone: '',
  branchId: '',
  serviceId: '',
  employeePreference: '',
  employeeId: '',
  date: '',
  time: '',
  note: '',
})

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
const selectedService = computed(() => bookingOptions.value.services.find(item => item.id === Number(form.serviceId)))
const availableEmployees = computed(() => bookingOptions.value.employees.filter(item => item.branchId === Number(form.branchId)))
const availability = ref<Availability | null>(null)
const availabilityBusy = ref(false)
let availabilityRequest = 0
let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''
let resetTimer: ReturnType<typeof setTimeout> | undefined

function errorText(value: unknown, fallback: string) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? fallback
}

async function loadOptions() {
  if (optionsLoaded.value || optionsPending.value) return
  optionsPending.value = true
  optionsError.value = ''
  try {
    const response = await $fetch<{ data: BookingOptions }>('/api/booking/options')
    bookingOptions.value = response.data
    optionsLoaded.value = true
  } catch (error) {
    optionsError.value = errorText(error, 'Chưa thể tải thông tin đặt lịch. Bạn vui lòng thử lại.')
  } finally {
    optionsPending.value = false
  }
}

function applyBookingIntent() {
  const target = bookingIntent.value.target
  if (target) {
    const matchingService = bookingOptions.value.services.find(item => String(item.id) === target || item.name === target)
    if (matchingService) form.serviceId = String(matchingService.id)
  }
  if (!form.branchId && bookingOptions.value.branches[0]) form.branchId = String(bookingOptions.value.branches[0].id)
}

async function prepareDrawer() {
  clearTimeout(resetTimer)
  bookingResult.value = null
  submitError.value = ''
  await Promise.all([loadOptions(), loadCustomer().catch(() => null)])
  applyBookingIntent()
  if (customer.value) {
    form.name = customer.value.name
    form.phone = customer.value.phone
  }
  await loadAvailability()
  await nextTick()
  closeButton.value?.focus()
}

async function retryOptions() {
  await loadOptions()
  applyBookingIntent()
}

function resetAfterClose() {
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    bookingResult.value = null
    submitError.value = ''
    Object.keys(errors).forEach(key => delete errors[key])
  }, 520)
}

function validate() {
  Object.keys(errors).forEach(key => delete errors[key])
  const phone = form.phone.replace(/\s/g, '')

  if (!form.name.trim()) errors.name = 'Vui lòng cho MIÊN biết tên của bạn.'
  if (!/^(\+84|0)\d{9}$/.test(phone)) errors.phone = 'Số điện thoại chưa đúng định dạng.'
  if (!form.branchId) errors.branchId = 'Vui lòng chọn chi nhánh.'
  if (!form.serviceId) errors.serviceId = 'Vui lòng chọn một liệu trình.'
  if (!form.date) errors.date = 'Vui lòng chọn ngày bạn muốn ghé.'
  if (!form.time || !form.employeeId) errors.time = 'Vui lòng chọn một khung giờ còn trống.'

  return Object.keys(errors).length === 0
}

async function submitBooking() {
  if (!validate()) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    bookingResult.value = await $fetch<BookingResponse>('/api/booking', {
      method: 'POST',
      body: {
        name: form.name,
        phone: form.phone,
        branchId: Number(form.branchId),
        serviceId: Number(form.serviceId),
        employeeId: Number(form.employeeId),
        date: form.date,
        time: form.time,
        note: form.note,
      },
    })
  } catch (error) {
    submitError.value = errorText(error, 'Chưa thể gửi yêu cầu lúc này. Bạn vui lòng thử lại sau ít phút.')
  } finally {
    isSubmitting.value = false
  }
}

async function loadAvailability() {
  availability.value = null
  form.time = ''
  form.employeeId = ''
  delete errors.time
  if (!isBookingOpen.value || !form.branchId || !form.serviceId || !form.date) return
  const request = ++availabilityRequest
  availabilityBusy.value = true
  try {
    const response = await $fetch<{ data: Availability }>('/api/booking/availability', {
      query: {
        branchId: form.branchId,
        serviceId: form.serviceId,
        date: form.date,
        employeeId: form.employeePreference || undefined,
      },
    })
    if (request === availabilityRequest) availability.value = response.data
  } catch (error) {
    if (request === availabilityRequest) submitError.value = errorText(error, 'Chưa thể kiểm tra lịch trống.')
  } finally {
    if (request === availabilityRequest) availabilityBusy.value = false
  }
}

function selectSlot(slot: Availability['slots'][number]) {
  form.time = slot.time
  form.employeeId = String(slot.employeeId)
  delete errors.time
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isBookingOpen.value) closeBooking()
}

function closeAndRestoreFocus() {
  if (isSubmitting.value) return
  closeBooking()
  nextTick(() => previouslyFocused?.focus())
}

watch(() => [form.branchId, form.serviceId, form.date, form.employeePreference], loadAvailability)
watch(() => bookingIntent.value.version, () => {
  if (isBookingOpen.value && optionsLoaded.value) applyBookingIntent()
})
watch(isBookingOpen, (open) => {
  if (import.meta.server) return
  if (open) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    void prepareDrawer()
  } else {
    document.body.style.overflow = previousBodyOverflow
    resetAfterClose()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (route.query['dat-lich'] === '1') openBooking(String(route.query.serviceId ?? ''))
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearTimeout(resetTimer)
  if (isBookingOpen.value) {
    closeBooking()
    document.body.style.overflow = previousBodyOverflow
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="isBookingOpen" class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button class="absolute inset-0 cursor-default bg-[#1d241b]/55 backdrop-blur-[3px]" aria-label="Đóng bảng đặt lịch" @click="closeAndRestoreFocus" />
        <aside ref="drawer" class="absolute right-0 top-0 h-full w-full max-w-[580px] overflow-y-auto bg-[#f3efe5] px-6 py-7 shadow-[-24px_0_70px_rgba(38,45,34,0.16)] md:px-12 md:py-10">
          <div class="mb-14 flex items-center justify-between">
            <span class="text-[0.72rem] font-semibold tracking-[0.24em]">MIÊN</span>
            <button ref="closeButton" type="button" class="grid size-10 place-items-center rounded-full border border-[#596650]/35 text-xl transition hover:rotate-90 hover:bg-[#e4dfd2]" aria-label="Đóng bảng đặt lịch" @click="closeAndRestoreFocus">×</button>
          </div>

          <div v-if="bookingResult" class="flex min-h-[65vh] flex-col justify-center" aria-live="polite">
            <span class="mb-8 grid size-14 place-items-center rounded-full bg-[#4c5d43] text-xl text-[#f4efe5]" aria-hidden="true">✓</span>
            <p class="section-label mb-5">Đã nhận yêu cầu</p>
            <h2 id="booking-title" class="font-display text-5xl font-light leading-none tracking-[-0.04em]">Hẹn gặp bạn<br>tại MIÊN.</h2>
            <p class="mt-7 max-w-[42ch] leading-7 text-[#62675e]">{{ bookingResult.message }}</p>
            <p class="mt-5 text-xs text-[#757b70]">Mã yêu cầu: <strong>{{ bookingResult.reference }}</strong></p>
            <div class="mt-10 flex flex-wrap gap-3">
              <NuxtLink to="/tai-khoan?tab=lich-hen" class="button-primary" @click="closeBooking">Xem lịch của tôi</NuxtLink>
              <button type="button" class="button-quiet" @click="closeAndRestoreFocus">Hoàn tất</button>
            </div>
          </div>

          <form v-else novalidate @submit.prevent="submitBooking">
            <p class="section-label mb-5">Đặt lịch</p>
            <h2 id="booking-title" class="font-display text-5xl font-light leading-none tracking-[-0.04em]">Bạn muốn ghé<br>vào lúc nào?</h2>
            <p class="mt-6 max-w-[45ch] text-sm leading-6 text-[#666c62]">MIÊN sẽ gọi lại để hiểu điều cơ thể bạn đang cần và xác nhận khung giờ phù hợp.</p>

            <div v-if="optionsError" class="mt-8 border-l-2 border-[#8b5148] bg-[#eadfd6] px-4 py-3 text-sm leading-6 text-[#7b4139]" role="alert">
              {{ optionsError }}
              <button type="button" class="ml-2 font-semibold underline underline-offset-4" @click="retryOptions">Thử lại</button>
            </div>
            <p v-else-if="optionsPending" class="mt-8 text-sm text-[#737a70]" role="status">Đang chuẩn bị thông tin đặt lịch…</p>

            <div class="mt-10 grid gap-6" :aria-busy="optionsPending">
              <label class="field-block">
                <span>Họ và tên</span>
                <CommonInput v-model="form.name" type="text" autocomplete="name" placeholder="Tên của bạn" :aria-invalid="Boolean(errors.name)" />
                <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
              </label>

              <label class="field-block">
                <span>Số điện thoại</span>
                <CommonInput v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="090 123 4567" :aria-invalid="Boolean(errors.phone)" />
                <small v-if="errors.phone" class="field-error">{{ errors.phone }}</small>
              </label>

              <div class="grid gap-6 sm:grid-cols-2">
                <label class="field-block">
                  <span>Chi nhánh</span>
                  <CommonSelect v-model="form.branchId" :aria-invalid="Boolean(errors.branchId)" :disabled="optionsPending">
                    <option value="" disabled>Chọn chi nhánh</option>
                    <option v-for="branch in bookingOptions.branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option>
                  </CommonSelect>
                  <small v-if="errors.branchId" class="field-error">{{ errors.branchId }}</small>
                </label>

                <label class="field-block">
                  <span>Liệu trình</span>
                  <CommonSelect v-model="form.serviceId" :aria-invalid="Boolean(errors.serviceId)" :disabled="optionsPending">
                    <option value="" disabled>Chọn liệu trình</option>
                    <option v-for="service in bookingOptions.services" :key="service.id" :value="String(service.id)">{{ service.name }} · {{ service.durationMinutes }} phút</option>
                  </CommonSelect>
                  <small v-if="errors.serviceId" class="field-error">{{ errors.serviceId }}</small>
                </label>

                <label class="field-block">
                  <span>Ngày bạn muốn ghé</span>
                  <CommonDatePicker v-model="form.date" :min="today" placeholder="Chọn ngày bạn muốn ghé" :aria-invalid="Boolean(errors.date)" />
                  <small v-if="errors.date" class="field-error">{{ errors.date }}</small>
                </label>

                <label class="field-block">
                  <span>Kỹ thuật viên <i>không bắt buộc</i></span>
                  <CommonSelect v-model="form.employeePreference" :disabled="!form.branchId">
                    <option value="">Ai cũng được</option>
                    <option v-for="person in availableEmployees" :key="person.id" :value="String(person.id)">{{ person.name }}</option>
                  </CommonSelect>
                </label>
              </div>

              <div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#65705f]">Khung giờ còn trống</span>
                  <span v-if="selectedService" class="text-[0.67rem] text-[#777c72]">{{ selectedService.durationMinutes }} phút · {{ new Intl.NumberFormat('vi-VN').format(selectedService.price) }}đ</span>
                </div>
                <p v-if="availabilityBusy" class="mt-3 text-sm text-[#737a70]">Đang kiểm tra lịch của MIÊN…</p>
                <div v-else-if="availability?.slots.length" class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <button v-for="slot in availability.slots" :key="`${slot.time}-${slot.employeeId}`" type="button" class="rounded-full border px-3 py-2.5 text-xs font-semibold transition" :class="form.time === slot.time && form.employeeId === String(slot.employeeId) ? 'border-[#4c5d43] bg-[#4c5d43] text-white' : 'border-[#78816f]/30 hover:border-[#4c5d43]'" :title="slot.employeeName" @click="selectSlot(slot)">{{ slot.time }}</button>
                </div>
                <p v-else-if="form.date && form.serviceId" class="mt-3 text-sm text-[#737a70]">Ngày này chưa còn khung giờ phù hợp. Bạn thử chọn ngày khác nhé.</p>
                <p v-else class="mt-3 text-sm text-[#737a70]">Chọn liệu trình và ngày để xem giờ trống thực tế.</p>
                <small v-if="errors.time" class="field-error mt-2 block">{{ errors.time }}</small>
                <p v-if="form.time && form.employeeId" class="mt-3 text-xs text-[#65705f]">{{ availability?.slots.find(item => item.time === form.time && String(item.employeeId) === form.employeeId)?.employeeName }} sẽ chăm sóc bạn.</p>
              </div>

              <label class="field-block">
                <span>Lời nhắn <i>không bắt buộc</i></span>
                <CommonTextarea v-model="form.note" rows="3" placeholder="Chia sẻ điều bạn muốn MIÊN lưu ý" />
              </label>
            </div>

            <p v-if="submitError" class="mt-6 border-l-2 border-[#8b5148] pl-4 text-sm leading-6 text-[#7b4139]" role="alert">{{ submitError }}</p>
            <button class="button-primary mt-8 w-full justify-center" type="submit" :disabled="isSubmitting || optionsPending || Boolean(optionsError)">
              <template v-if="isSubmitting"><span class="loading-line" />Đang gửi yêu cầu</template>
              <template v-else>Gửi yêu cầu đặt lịch <span aria-hidden="true">↗</span></template>
            </button>
            <p class="mt-4 text-center text-[0.7rem] leading-5 text-[#777c72]">Bằng việc gửi yêu cầu, bạn đồng ý để MIÊN liên hệ xác nhận lịch hẹn.</p>
          </form>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
