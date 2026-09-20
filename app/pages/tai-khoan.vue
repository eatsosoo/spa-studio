<script setup lang="ts">
import type { CustomerAccount } from '~/composables/useCustomerAuth'

useStoreSeo('Hồ sơ của tôi | MIÊN Spa', 'Cập nhật hồ sơ, theo dõi điểm thành viên và bảo mật tài khoản MIÊN Spa.', '/tai-khoan')

type Profile = { id: number; name: string; phone: string; email: string; gender: 'female' | 'male' | 'other' | null; dateOfBirth: string | null; address: string; marketingConsent: boolean; loyaltyPoints: number; totalSpent: number; hasPassword: boolean; createdAt: string; stats: { completedAppointments: number; upcomingAppointments: number } }

const { customer, loaded, logout } = useCustomerAuth()
const { data: meResponse } = await useAsyncData('profile-customer-me', () => $fetch<{ data: CustomerAccount | null }>('/api/customer-auth/me'))
customer.value = meResponse.value?.data ?? null
loaded.value = true
if (!customer.value) {
  await navigateTo({ path: '/dang-nhap', query: { redirect: '/tai-khoan' } })
}
const { data: profileResponse, pending, refresh } = await useAsyncData('customer-profile', () => customer.value ? $fetch<{ data: Profile }>('/api/customer/profile') : Promise.resolve(null), { watch: [customer] })
const profile = computed(() => profileResponse.value?.data)
const form = reactive({ name: '', email: '', gender: '', dateOfBirth: '', address: '', marketingConsent: false })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const profileBusy = ref(false)
const passwordBusy = ref(false)
const profileMessage = ref('')
const passwordMessage = ref('')
const profileError = ref('')
const passwordError = ref('')

watch(profile, (value) => {
  if (!value) return
  Object.assign(form, { name: value.name, email: value.email, gender: value.gender ?? '', dateOfBirth: value.dateOfBirth ?? '', address: value.address, marketingConsent: value.marketingConsent })
}, { immediate: true })

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
const tier = computed(() => (profile.value?.totalSpent ?? 0) >= 10_000_000 ? 'An' : (profile.value?.totalSpent ?? 0) >= 3_000_000 ? 'Mộc' : 'Khách mới')
const nextTier = computed(() => tier.value === 'Khách mới' ? { name: 'Mộc', remaining: Math.max(0, 3_000_000 - (profile.value?.totalSpent ?? 0)) } : tier.value === 'Mộc' ? { name: 'An', remaining: Math.max(0, 10_000_000 - (profile.value?.totalSpent ?? 0)) } : null)

function errorText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Chưa thể thực hiện lúc này.'
}

async function saveProfile() {
  profileBusy.value = true; profileError.value = ''; profileMessage.value = ''
  try {
    await $fetch('/api/customer/profile', { method: 'PATCH', body: form })
    profileMessage.value = 'Hồ sơ đã được cập nhật.'
    if (customer.value) customer.value = { ...customer.value, name: form.name, email: form.email }
    await refresh()
  } catch (error) { profileError.value = errorText(error) } finally { profileBusy.value = false }
}

async function changePassword() {
  passwordError.value = ''; passwordMessage.value = ''
  if (passwordForm.newPassword !== passwordForm.confirmPassword) { passwordError.value = 'Mật khẩu xác nhận chưa khớp.'; return }
  passwordBusy.value = true
  try {
    await $fetch('/api/customer/change-password', { method: 'POST', body: passwordForm })
    passwordMessage.value = profile.value?.hasPassword ? 'Mật khẩu đã được thay đổi. Các phiên đăng nhập khác đã được đăng xuất.' : 'Mật khẩu đăng nhập đã được tạo.'
    passwordForm.currentPassword = ''; passwordForm.newPassword = ''; passwordForm.confirmPassword = ''
    await refresh()
  } catch (error) { passwordError.value = errorText(error) } finally { passwordBusy.value = false }
}

async function signOut() {
  await logout()
  await navigateTo({ path: '/dang-nhap', query: { redirect: '/tai-khoan' } })
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10 md:pt-16 lg:px-14">
      <template v-if="customer">
        <header class="flex flex-wrap items-end justify-between gap-6 border-b border-[#78816f]/25 pb-8">
          <div><p class="section-label">Tài khoản khách hàng</p><h1 class="mt-3 font-display text-5xl font-light tracking-[-0.04em]">Hồ sơ của {{ profile?.name || customer.name }}.</h1></div>
          <div class="flex flex-wrap gap-3"><NuxtLink to="/lich-cua-toi" class="button-primary">Lịch của tôi</NuxtLink><button type="button" class="button-quiet" @click="signOut">Đăng xuất</button></div>
        </header>

        <p v-if="pending" class="mt-8 text-sm text-[#737a70]">Đang tải hồ sơ…</p>
        <template v-else-if="profile">
          <section class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article class="bg-[#e5dfd1] p-6"><p class="section-label">Hạng thành viên</p><p class="mt-3 text-2xl font-semibold">{{ tier }}</p></article>
            <article class="bg-[#e5dfd1] p-6"><p class="section-label">Điểm MIÊN</p><p class="mt-3 text-2xl font-semibold tabular-nums">{{ profile.loyaltyPoints.toLocaleString('vi-VN') }}</p></article>
            <article class="bg-[#e5dfd1] p-6"><p class="section-label">Liệu trình hoàn tất</p><p class="mt-3 text-2xl font-semibold tabular-nums">{{ profile.stats.completedAppointments }}</p></article>
            <article class="bg-[#e5dfd1] p-6"><p class="section-label">Lịch sắp tới</p><p class="mt-3 text-2xl font-semibold tabular-nums">{{ profile.stats.upcomingAppointments }}</p></article>
          </section>

          <section class="mt-6 bg-[#4c5d43] p-6 text-[#f5f0e6] md:flex md:items-center md:justify-between md:gap-8">
            <div><p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] opacity-65">Hành trình thành viên</p><p class="mt-2 text-lg">Tổng đồng hành: <strong>{{ money(profile.totalSpent) }}</strong></p></div>
            <p v-if="nextTier" class="mt-4 text-sm opacity-75 md:mt-0">Còn {{ money(nextTier.remaining) }} để lên hạng {{ nextTier.name }}.</p><p v-else class="mt-4 text-sm opacity-75 md:mt-0">Bạn đang ở hạng thành viên cao nhất.</p>
          </section>

          <div class="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <form class="border border-[#78816f]/20 bg-[#f8f4eb] p-6 md:p-8" @submit.prevent="saveProfile">
              <p class="section-label">Thông tin cá nhân</p><h2 class="mt-3 text-2xl font-semibold">Điều MIÊN nên nhớ về bạn</h2>
              <div class="mt-7 grid gap-5 sm:grid-cols-2">
                <label class="field-block"><span>Họ và tên</span><CommonInput v-model="form.name" autocomplete="name" required /></label>
                <label class="field-block"><span>Số điện thoại</span><CommonInput :model-value="profile.phone" type="tel" disabled /><small>Số điện thoại dùng để đăng nhập.</small></label>
                <label class="field-block"><span>Email</span><CommonInput v-model="form.email" type="email" autocomplete="email" placeholder="ten@email.com" /></label>
                <label class="field-block"><span>Giới tính</span><CommonSelect v-model="form.gender"><option value="">Không chia sẻ</option><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option></CommonSelect></label>
                <label class="field-block"><span>Ngày sinh</span><CommonDatePicker v-model="form.dateOfBirth" /></label>
                <label class="field-block sm:col-span-2"><span>Địa chỉ</span><CommonInput v-model="form.address" autocomplete="street-address" placeholder="Địa chỉ liên hệ" /></label>
                <label class="flex items-start gap-3 text-sm leading-6 sm:col-span-2"><CommonInput v-model="form.marketingConsent" type="checkbox" class="mt-1 size-4" /><span>Nhận thông tin về ưu đãi và nội dung chăm sóc phù hợp từ MIÊN.</span></label>
              </div>
              <p v-if="profileError" class="mt-5 text-sm text-[#8b5148]">{{ profileError }}</p><p v-if="profileMessage" class="mt-5 text-sm text-[#56704f]">{{ profileMessage }}</p>
              <AppButton class="mt-7" :label="profileBusy ? 'Đang lưu…' : 'Lưu hồ sơ'" icon="check" type="submit" :disabled="profileBusy" />
            </form>

            <form class="self-start border border-[#78816f]/20 bg-[#ece7da] p-6 md:p-8" @submit.prevent="changePassword">
              <p class="section-label">Bảo mật</p><h2 class="mt-3 text-2xl font-semibold">{{ profile.hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu đăng nhập' }}</h2><p class="mt-3 text-xs leading-5 text-[#737a70]">Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.</p>
              <div class="mt-7 grid gap-5">
                <label v-if="profile.hasPassword" class="field-block"><span>Mật khẩu hiện tại</span><CommonInput v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" required /></label>
                <label class="field-block"><span>Mật khẩu mới</span><CommonInput v-model="passwordForm.newPassword" type="password" autocomplete="new-password" required /></label>
                <label class="field-block"><span>Xác nhận mật khẩu mới</span><CommonInput v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" required /></label>
              </div>
              <p v-if="passwordError" class="mt-5 text-sm text-[#8b5148]">{{ passwordError }}</p><p v-if="passwordMessage" class="mt-5 text-sm text-[#56704f]">{{ passwordMessage }}</p>
              <AppButton class="mt-7" :label="passwordBusy ? 'Đang lưu…' : profile.hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'" icon="lock" type="submit" :disabled="passwordBusy" />
            </form>
          </div>
        </template>
      </template>
    </main>
    <SiteFooter />
  </div>
</template>
