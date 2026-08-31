<script setup lang="ts">
const props = withDefaults(defineProps<{
  id?: string
  modelValue?: string | number
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
}>(), {
  id: undefined,
  modelValue: '',
  placeholder: 'Chọn ngày',
  invalid: false,
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
const panel = ref<'days' | 'months' | 'years'>('days')

const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const today = new Date()
today.setHours(12, 0, 0, 0)
const todayKey = dateKey(today)

function parseDate(value: string | number | undefined) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const initialDate = parseDate(props.modelValue) ?? today
const viewYear = ref(initialDate.getFullYear())
const viewMonth = ref(initialDate.getMonth())
const yearPageStart = ref(Math.floor(initialDate.getFullYear() / 12) * 12)
const months = Array.from({ length: 12 }, (_, index) => ({ value: index, label: `Tháng ${index + 1}` }))

const selectedDate = computed(() => parseDate(props.modelValue))
const displayValue = computed(() => selectedDate.value
  ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedDate.value)
  : '')
const years = computed(() => Array.from({ length: 12 }, (_, index) => yearPageStart.value + index))
const calendarDays = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value, 1, 12)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(viewYear.value, viewMonth.value, 1 - mondayOffset, 12)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { key: dateKey(date), label: date.getDate(), currentMonth: date.getMonth() === viewMonth.value }
  })
})

watch(() => props.modelValue, (value) => {
  const parsed = parseDate(value)
  if (!parsed) return
  viewYear.value = parsed.getFullYear()
  viewMonth.value = parsed.getMonth()
})

function moveMonth(offset: number) {
  const target = new Date(viewYear.value, viewMonth.value + offset, 1, 12)
  viewYear.value = target.getFullYear()
  viewMonth.value = target.getMonth()
}

function movePeriod(offset: number) {
  if (panel.value === 'days') moveMonth(offset)
  else if (panel.value === 'months') viewYear.value += offset
  else yearPageStart.value += offset * 12
}

function showMonthPanel() {
  panel.value = 'months'
}

function showYearPanel() {
  yearPageStart.value = Math.floor(viewYear.value / 12) * 12
  panel.value = 'years'
}

function selectMonth(month: number) {
  viewMonth.value = month
  panel.value = 'days'
  focusCalendarDate()
}

function selectYear(year: number) {
  viewYear.value = year
  panel.value = 'months'
}

function focusCalendarDate() {
  nextTick(() => {
    const target = String(props.modelValue || todayKey)
    const preferred = root.value?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
    const fallback = root.value?.querySelector<HTMLButtonElement>('[data-current-month="true"]')
    ;(preferred ?? fallback)?.focus()
  })
}

function show() {
  if (props.disabled) return
  const parsed = selectedDate.value ?? today
  viewYear.value = parsed.getFullYear()
  viewMonth.value = parsed.getMonth()
  yearPageStart.value = Math.floor(parsed.getFullYear() / 12) * 12
  panel.value = 'days'
  open.value = true
  focusCalendarDate()
}

function toggle() {
  if (open.value) open.value = false
  else show()
}

function selectDate(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function chooseToday() {
  emit('update:modelValue', todayKey)
  open.value = false
}

function clearDate() {
  emit('update:modelValue', '')
  open.value = false
}

function handleDocumentPointer(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointer))
</script>

<template>
  <div ref="root" class="relative font-normal" @keydown.esc="open = false">
    <button
      :id="id"
      type="button"
      class="flex min-h-[43px] w-full items-center justify-between gap-3 rounded-[0.3rem] border bg-[rgba(255,253,248,0.68)] px-[0.9rem] py-[0.82rem] text-left text-[0.77rem] text-[#34402f] outline-none transition-[border-color,background-color,transform] duration-200 ease-out hover:bg-[#fffcf6] focus:border-[#607059] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
      :class="invalid ? 'border-[#955e54]' : open ? 'border-[#607059] bg-[#fffcf6]' : 'border-[rgba(88,101,80,0.28)]'"
      :aria-expanded="open"
      :aria-invalid="invalid"
      aria-haspopup="dialog"
      :disabled="disabled"
      @click="toggle"
      @keydown.down.prevent="show"
    >
      <span :class="displayValue ? 'text-[#34402f]' : 'text-[#92978f]'">{{ displayValue || placeholder }}</span>
      <AppIcon name="calendar" :size="17" class="shrink-0 text-[#687363]" />
    </button>

    <Transition name="calendar-popover">
      <div
        v-if="open"
        class="absolute left-0 top-[calc(100%+0.65rem)] z-30 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-[#737e6c]/20 bg-[#fbf8f0] p-4 shadow-[0_24px_60px_-24px_rgba(47,56,44,0.42),inset_0_1px_0_rgba(255,255,255,0.8)]"
        role="dialog"
        aria-label="Chọn ngày"
      >
        <div class="flex items-center justify-between gap-3">
          <button type="button" class="grid size-9 place-items-center rounded-full border border-[#78816f]/20 text-[#53604d] transition duration-200 hover:-translate-x-0.5 hover:bg-[#ebe8de] active:scale-95" :aria-label="panel === 'days' ? 'Tháng trước' : panel === 'months' ? 'Năm trước' : 'Nhóm năm trước'" @click="movePeriod(-1)">
            <AppIcon name="chevron" :size="16" class="rotate-180" />
          </button>
          <div class="flex min-w-0 items-center justify-center gap-1 text-[0.78rem] font-semibold tracking-[-0.01em] text-[#35402f]" aria-live="polite">
            <template v-if="panel === 'days'">
              <button type="button" class="rounded-full px-2.5 py-1.5 transition hover:bg-[#e7e9e1] active:scale-95" aria-label="Chọn nhanh tháng" @click="showMonthPanel">Tháng {{ viewMonth + 1 }}</button>
              <button type="button" class="rounded-full px-2.5 py-1.5 transition hover:bg-[#e7e9e1] active:scale-95" aria-label="Chọn nhanh năm" @click="showYearPanel">{{ viewYear }}</button>
            </template>
            <button v-else-if="panel === 'months'" type="button" class="rounded-full px-3 py-1.5 transition hover:bg-[#e7e9e1] active:scale-95" aria-label="Chọn nhanh năm" @click="showYearPanel">{{ viewYear }}</button>
            <span v-else class="px-2">{{ yearPageStart }}–{{ yearPageStart + 11 }}</span>
          </div>
          <button type="button" class="grid size-9 place-items-center rounded-full border border-[#78816f]/20 text-[#53604d] transition duration-200 hover:translate-x-0.5 hover:bg-[#ebe8de] active:scale-95" :aria-label="panel === 'days' ? 'Tháng sau' : panel === 'months' ? 'Năm sau' : 'Nhóm năm sau'" @click="movePeriod(1)">
            <AppIcon name="chevron" :size="16" />
          </button>
        </div>

        <div class="mt-4 min-h-[15.25rem]">
          <Transition name="calendar-view" mode="out-in">
            <div v-if="panel === 'days'" key="days">
              <div class="grid grid-cols-7 text-center text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#899084]" aria-hidden="true">
                <span v-for="weekday in ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']" :key="weekday" class="py-1.5">{{ weekday }}</span>
              </div>

              <div class="mt-1 grid grid-cols-7 gap-1" role="grid">
                <button
                  v-for="day in calendarDays"
                  :key="day.key"
                  type="button"
                  class="relative grid aspect-square place-items-center rounded-full text-[0.69rem] transition duration-200 ease-out hover:-translate-y-px hover:bg-[#e6e9e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#687763] active:scale-95"
                  :class="[
                    day.key === String(modelValue) ? 'bg-[#52634b] font-semibold text-[#fbf8f0] hover:bg-[#52634b]' : '',
                    day.currentMonth ? 'text-[#394434]' : 'text-[#a9ada5]',
                  ]"
                  :aria-label="day.key"
                  :aria-selected="day.key === String(modelValue)"
                  :aria-current="day.key === todayKey ? 'date' : undefined"
                  :data-date="day.key"
                  :data-current-month="day.currentMonth"
                  role="gridcell"
                  @click="selectDate(day.key)"
                >
                  {{ day.label }}
                  <span v-if="day.key === todayKey && day.key !== String(modelValue)" class="calendar-today-dot absolute bottom-1 size-1 rounded-full bg-[#72836a]" />
                </button>
              </div>
            </div>

            <div v-else-if="panel === 'months'" key="months" class="grid grid-cols-3 gap-2 pt-2">
              <button
                v-for="month in months"
                :key="month.value"
                type="button"
                class="rounded-lg border px-2 py-3.5 text-[0.7rem] transition duration-200 hover:-translate-y-px hover:bg-[#e6e9e0] active:scale-[0.97]"
                :class="month.value === viewMonth ? 'border-[#66745f]/35 bg-[#dfe6da] font-semibold text-[#42503d]' : 'border-[#78816f]/15 text-[#66705f]'"
                @click="selectMonth(month.value)"
              >
                {{ month.label }}
              </button>
            </div>

            <div v-else key="years" class="grid grid-cols-3 gap-2 pt-2">
              <button
                v-for="year in years"
                :key="year"
                type="button"
                class="rounded-lg border px-2 py-3.5 text-[0.72rem] transition duration-200 hover:-translate-y-px hover:bg-[#e6e9e0] active:scale-[0.97]"
                :class="year === viewYear ? 'border-[#66745f]/35 bg-[#dfe6da] font-semibold text-[#42503d]' : 'border-[#78816f]/15 text-[#66705f]'"
                @click="selectYear(year)"
              >
                {{ year }}
              </button>
            </div>
          </Transition>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-[#78816f]/15 pt-3">
          <button type="button" class="text-[0.64rem] font-medium text-[#7b8276] transition hover:text-[#4e5a48] active:translate-y-px" @click="clearDate">Xóa ngày</button>
          <button type="button" class="rounded-full bg-[#e3e8de] px-3 py-1.5 text-[0.64rem] font-semibold text-[#4c5b46] transition hover:bg-[#d8e0d3] active:scale-95" @click="chooseToday">Hôm nay</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.calendar-popover-enter-active,
.calendar-popover-leave-active {
  transition: opacity 220ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top left;
}

.calendar-popover-enter-from,
.calendar-popover-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.calendar-view-enter-active,
.calendar-view-leave-active {
  transition: opacity 150ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.calendar-view-enter-from { opacity: 0; transform: translateY(5px); }
.calendar-view-leave-to { opacity: 0; transform: translateY(-4px); }

.calendar-today-dot {
  animation: calendar-breathe 2.2s ease-in-out infinite;
}

@keyframes calendar-breathe {
  0%, 100% { opacity: 0.55; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-popover-enter-active,
  .calendar-popover-leave-active,
  .calendar-view-enter-active,
  .calendar-view-leave-active { transition-duration: 1ms; }
  .calendar-today-dot { animation: none; }
}
</style>
