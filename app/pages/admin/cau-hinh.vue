<script setup lang="ts">
import type { AdminDensity, AdminFontSize } from '~/composables/useAdminPreferences'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Cấu hình hệ thống | MIÊN Admin' })

const { preferences, reset } = useAdminPreferences()
const savedMessage = ref('')
let savedTimer: ReturnType<typeof setTimeout> | undefined

const fontSizes: Array<{ value: AdminFontSize; label: string; sample: string }> = [
  { value: 'small', label: 'Nhỏ', sample: 'Aa' },
  { value: 'standard', label: 'Tiêu chuẩn', sample: 'Aa' },
  { value: 'large', label: 'Lớn', sample: 'Aa' },
  { value: 'extra-large', label: 'Rất lớn', sample: 'Aa' },
]

const densities: Array<{ value: AdminDensity; label: string; description: string }> = [
  { value: 'comfortable', label: 'Thoải mái', description: 'Nhiều khoảng thở, phù hợp dùng hằng ngày.' },
  { value: 'compact', label: 'Gọn', description: 'Hiển thị thêm dữ liệu trong cùng một màn hình.' },
]

function notifySaved() {
  savedMessage.value = 'Đã tự động lưu trên trình duyệt này.'
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { savedMessage.value = '' }, 2400)
}

function updateFontSize(value: AdminFontSize) {
  preferences.value = { ...preferences.value, fontSize: value }
  notifySaved()
}

function updateDensity(value: AdminDensity) {
  preferences.value = { ...preferences.value, density: value }
  notifySaved()
}

function toggle(key: 'highContrast' | 'reduceMotion') {
  preferences.value = { ...preferences.value, [key]: !preferences.value[key] }
  notifySaved()
}

function restoreDefaults() {
  reset()
  savedMessage.value = 'Đã khôi phục cấu hình mặc định.'
}

onBeforeUnmount(() => {
  if (savedTimer) clearTimeout(savedTimer)
})
</script>

<template>
  <section class="mx-auto w-full max-w-[1320px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="grid gap-7 border-b border-[#78816f]/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Trải nghiệm quản trị</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Cấu hình hệ thống</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Điều chỉnh cách khu vực quản trị hiển thị để phù hợp với mắt và nhịp làm việc của bạn.</p>
      </div>
      <button type="button" class="app-action app-action--secondary" @click="restoreDefaults">
        <AppIcon name="refresh" :size="16" />
        Khôi phục mặc định
      </button>
    </header>

    <div class="mt-9 grid gap-8 xl:grid-cols-[1fr_0.72fr] xl:gap-14">
      <div class="grid content-start gap-9">
        <section aria-labelledby="font-size-heading">
          <div class="border-b border-[#78816f]/20 pb-4">
            <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Khả năng đọc</p>
            <h2 id="font-size-heading" class="mt-2 text-xl font-semibold tracking-[-0.03em]">Cỡ chữ giao diện</h2>
            <p class="mt-2 text-xs leading-5 text-[#737a70]">Áp dụng cho toàn bộ trang quản trị, bao gồm bảng dữ liệu và biểu mẫu.</p>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Cỡ chữ giao diện">
            <button
              v-for="option in fontSizes"
              :key="option.value"
              type="button"
              class="settings-choice min-h-28"
              :class="preferences.fontSize === option.value ? 'settings-choice--active' : ''"
              role="radio"
              :aria-checked="preferences.fontSize === option.value"
              @click="updateFontSize(option.value)"
            >
              <span class="font-display leading-none" :class="{ 'text-xl': option.value === 'small', 'text-2xl': option.value === 'standard', 'text-3xl': option.value === 'large', 'text-4xl': option.value === 'extra-large' }">{{ option.sample }}</span>
              <span class="mt-3 text-[0.68rem] font-semibold">{{ option.label }}</span>
              <span class="settings-choice__check"><AppIcon name="check" :size="11" /></span>
            </button>
          </div>
        </section>

        <section aria-labelledby="density-heading">
          <div class="border-b border-[#78816f]/20 pb-4">
            <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Bố cục</p>
            <h2 id="density-heading" class="mt-2 text-xl font-semibold tracking-[-0.03em]">Mật độ hiển thị</h2>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mật độ hiển thị">
            <button
              v-for="option in densities"
              :key="option.value"
              type="button"
              class="settings-choice min-h-32 items-start text-left"
              :class="preferences.density === option.value ? 'settings-choice--active' : ''"
              role="radio"
              :aria-checked="preferences.density === option.value"
              @click="updateDensity(option.value)"
            >
              <span class="grid w-full gap-2" aria-hidden="true">
                <span v-for="line in 3" :key="line" class="h-1 rounded-full bg-current opacity-20" :class="line === 2 ? 'w-4/5' : 'w-full'" />
              </span>
              <span class="mt-4 text-xs font-semibold">{{ option.label }}</span>
              <span class="mt-1 text-[0.67rem] font-normal leading-5 text-[#737a70]">{{ option.description }}</span>
              <span class="settings-choice__check"><AppIcon name="check" :size="11" /></span>
            </button>
          </div>
        </section>

        <section aria-labelledby="accessibility-heading">
          <div class="border-b border-[#78816f]/20 pb-4">
            <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Hỗ trợ tiếp cận</p>
            <h2 id="accessibility-heading" class="mt-2 text-xl font-semibold tracking-[-0.03em]">Hiển thị & chuyển động</h2>
          </div>
          <div class="divide-y divide-[#78816f]/15">
            <div class="flex items-center justify-between gap-6 py-5">
              <div><p class="text-xs font-semibold">Tăng độ tương phản</p><p class="mt-1 text-[0.68rem] leading-5 text-[#737a70]">Làm rõ chữ, đường viền và trạng thái đang chọn.</p></div>
              <button type="button" class="settings-switch" :class="preferences.highContrast ? 'settings-switch--on' : ''" role="switch" :aria-checked="preferences.highContrast" aria-label="Tăng độ tương phản" @click="toggle('highContrast')"><span /></button>
            </div>
            <div class="flex items-center justify-between gap-6 py-5">
              <div><p class="text-xs font-semibold">Giảm chuyển động</p><p class="mt-1 text-[0.68rem] leading-5 text-[#737a70]">Giảm hiệu ứng trượt và chuyển cảnh trong giao diện.</p></div>
              <button type="button" class="settings-switch" :class="preferences.reduceMotion ? 'settings-switch--on' : ''" role="switch" :aria-checked="preferences.reduceMotion" aria-label="Giảm chuyển động" @click="toggle('reduceMotion')"><span /></button>
            </div>
          </div>
        </section>
      </div>

      <aside class="h-fit rounded-md border border-[#78816f]/20 bg-[#e8e4d9]/70 p-6 xl:sticky xl:top-28 xl:p-8">
        <p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#76806f]">Xem trước trực tiếp</p>
        <div class="mt-6 rounded-md border border-[#78816f]/20 bg-[#fbf8f0] p-5 shadow-[0_18px_50px_rgba(49,58,45,0.08)]">
          <div class="flex items-center justify-between border-b border-[#78816f]/15 pb-4">
            <div><p class="text-xs font-semibold">Lịch hẹn hôm nay</p><p class="mt-1 text-[0.65rem] text-[#788076]">Ca làm việc buổi sáng</p></div>
            <span class="status-badge status-badge--positive"><span class="status-badge__dot" />Đã xác nhận</span>
          </div>
          <div class="grid gap-3 py-5 sm:grid-cols-[64px_1fr] sm:items-center">
            <p class="text-lg font-semibold tracking-[-0.03em]">10:30</p>
            <div><p class="text-xs font-semibold">Nguyễn Minh Anh</p><p class="mt-1 text-[0.67rem] leading-5 text-[#737a70]">Chăm sóc da chuyên sâu · Phòng Sen</p></div>
          </div>
          <button type="button" class="app-action app-action--primary w-full">Mở lịch hẹn</button>
        </div>
        <p class="mt-5 flex min-h-5 items-center gap-2 text-[0.66rem] text-[#687263]" aria-live="polite">
          <AppIcon v-if="savedMessage" name="check" :size="14" />{{ savedMessage || 'Thay đổi được lưu tự động trên thiết bị này.' }}
        </p>
      </aside>
    </div>
  </section>
</template>
