<script setup lang="ts">
import type { AdminSessionUser } from '~/composables/useAdminAuth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Hồ sơ | MIÊN Admin' })

const { user } = useAdminAuth()
const info = reactive({ fullName: '', email: '', phone: '' })
const security = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const infoPending = ref(false)
const passwordPending = ref(false)
const infoError = ref('')
const passwordError = ref('')
const infoSuccess = ref('')
const passwordSuccess = ref('')

watch(user, (value) => {
  if (value) Object.assign(info, { fullName: value.fullName, email: value.email, phone: value.phone })
}, { immediate: true })

function message(failure: unknown) {
  const error = failure as { data?: { statusMessage?: string }; statusMessage?: string }
  return error.data?.statusMessage ?? error.statusMessage ?? 'Không thể lưu thay đổi. Vui lòng thử lại.'
}

async function updateProfile() {
  infoError.value = ''
  infoSuccess.value = ''
  if (!info.fullName.trim()) { infoError.value = 'Vui lòng nhập họ và tên.'; return }
  infoPending.value = true
  try {
    const response = await $fetch<{ data: AdminSessionUser }>('/api/auth/profile', { method: 'PATCH', body: info })
    user.value = response.data
    infoSuccess.value = 'Thông tin hồ sơ đã được cập nhật.'
  } catch (failure) { infoError.value = message(failure) } finally { infoPending.value = false }
}

async function updatePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (!security.currentPassword || security.newPassword.length < 8) { passwordError.value = 'Nhập mật khẩu hiện tại và mật khẩu mới từ 8 ký tự.'; return }
  if (security.newPassword !== security.confirmPassword) { passwordError.value = 'Mật khẩu xác nhận chưa trùng khớp.'; return }
  passwordPending.value = true
  try {
    const response = await $fetch<{ data: AdminSessionUser }>('/api/auth/profile', { method: 'PATCH', body: { ...info, currentPassword: security.currentPassword, newPassword: security.newPassword } })
    user.value = response.data
    Object.assign(security, { currentPassword: '', newPassword: '', confirmPassword: '' })
    passwordSuccess.value = 'Mật khẩu đã được thay đổi.'
  } catch (failure) { passwordError.value = message(failure) } finally { passwordPending.value = false }
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="grid gap-7 border-b border-[#78816f]/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">
      <div><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Tài khoản quản trị</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Hồ sơ của bạn</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Thông tin dùng để nhận diện bạn trong khu vực vận hành MIÊN.</p></div>
      <div class="flex items-center gap-4"><span class="grid size-14 place-items-center rounded-full bg-[#d8d2c3] text-sm font-semibold text-[#35402f]">{{ user?.initials }}</span><div><p class="text-sm font-semibold">{{ user?.fullName }}</p><p class="mt-1 text-[0.68rem] text-[#788076]">{{ user?.jobTitle }}</p></div></div>
    </header>

    <div class="mt-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
      <form class="grid content-start gap-5" novalidate @submit.prevent="updateProfile">
        <div class="border-b border-[#78816f]/20 pb-5"><p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Thông tin cá nhân</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Thông tin hiển thị</h2></div>
        <div v-if="infoError || infoSuccess" class="rounded-sm border px-4 py-3 text-xs" :class="infoError ? 'border-[#a96e64]/30 bg-[#f0dfda] text-[#78473f]' : 'border-[#76906c]/30 bg-[#e2eadf] text-[#45603e]'">{{ infoError || infoSuccess }}</div>
        <label class="admin-field"><span>Họ và tên</span><input v-model="info.fullName" autocomplete="name" placeholder="Họ và tên"></label>
        <label class="admin-field"><span>Email</span><input v-model="info.email" type="email" autocomplete="email" placeholder="ten@mien.vn"></label>
        <label class="admin-field"><span>Số điện thoại</span><input v-model="info.phone" type="tel" autocomplete="tel" placeholder="090 000 0000"></label>
        <label class="admin-field"><span>Tên đăng nhập</span><input :value="user?.username" disabled class="disabled:cursor-not-allowed disabled:opacity-60"><small>Tên đăng nhập không thể thay đổi trong hồ sơ.</small></label>
        <div class="mt-2 flex justify-end border-t border-[#78816f]/20 pt-6"><AppButton :label="infoPending ? 'Đang lưu…' : 'Lưu hồ sơ'" type="submit" icon="check" :disabled="infoPending" /></div>
      </form>

      <form class="grid content-start gap-5 lg:border-l lg:border-[#78816f]/20 lg:pl-12" novalidate @submit.prevent="updatePassword">
        <div class="border-b border-[#78816f]/20 pb-5"><p class="text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#7b8375]">Bảo mật</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Đổi mật khẩu</h2></div>
        <div v-if="passwordError || passwordSuccess" class="rounded-sm border px-4 py-3 text-xs" :class="passwordError ? 'border-[#a96e64]/30 bg-[#f0dfda] text-[#78473f]' : 'border-[#76906c]/30 bg-[#e2eadf] text-[#45603e]'">{{ passwordError || passwordSuccess }}</div>
        <label class="admin-field"><span>Mật khẩu hiện tại</span><input v-model="security.currentPassword" type="password" autocomplete="current-password"></label>
        <label class="admin-field"><span>Mật khẩu mới</span><input v-model="security.newPassword" type="password" autocomplete="new-password"><small>Tối thiểu 8 ký tự.</small></label>
        <label class="admin-field"><span>Xác nhận mật khẩu mới</span><input v-model="security.confirmPassword" type="password" autocomplete="new-password"></label>
        <div class="mt-2 flex justify-end border-t border-[#78816f]/20 pt-6"><AppButton :label="passwordPending ? 'Đang cập nhật…' : 'Đổi mật khẩu'" type="submit" icon="lock" :disabled="passwordPending" /></div>
      </form>
    </div>
  </section>
</template>
