<script setup lang="ts">
import type { CustomerAccount } from '~/composables/useCustomerAuth'

useStoreSeo('Đăng nhập | MIÊN Spa', 'Đăng nhập hoặc tạo tài khoản khách hàng MIÊN Spa.', '/dang-nhap')

const route = useRoute()
const { customer, loaded } = useCustomerAuth()
const { data: meResponse } = await useAsyncData('customer-auth-page-me', () => $fetch<{ data: CustomerAccount | null }>('/api/customer-auth/me'))
customer.value = meResponse.value?.data ?? null
loaded.value = true

function safeDestination() {
  const requested = String(route.query.redirect ?? '/tai-khoan?tab=lich-hen')
  return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/tai-khoan?tab=lich-hen'
}
if (customer.value) await navigateTo(safeDestination())

const mode = ref<'login' | 'register'>(route.query.mode === 'register' ? 'register' : 'login')
const form = reactive({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')

function errorText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Chưa thể kết nối. Bạn vui lòng thử lại.'
}

watch(mode, () => { error.value = ''; form.password = ''; form.confirmPassword = '' })

async function submit() {
  error.value = ''
  if (mode.value === 'register' && form.password !== form.confirmPassword) { error.value = 'Mật khẩu xác nhận chưa khớp.'; return }
  busy.value = true
  try {
    const response = await $fetch<{ data: CustomerAccount }>(`/api/customer-auth/${mode.value}`, { method: 'POST', body: form })
    customer.value = response.data
    await navigateTo(safeDestination())
  } catch (failure) { error.value = errorText(failure) } finally { busy.value = false }
}
</script>

<template>
  <main class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <div class="grid md:min-h-[100dvh] md:grid-cols-[minmax(360px,0.86fr)_minmax(430px,1.14fr)]">
      <aside class="relative min-h-[330px] overflow-hidden md:min-h-[100dvh]">
        <CustomerAuthCharacter />
        <NuxtLink to="/" class="absolute left-5 top-5 flex items-center gap-3 rounded-full border border-white/15 bg-[#394633]/55 px-4 py-2.5 text-[#f3efe5] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#394633]/75 active:scale-[0.98] md:left-8 md:top-8" aria-label="Về trang chủ MIÊN Spa">
          <span class="grid size-7 place-items-center rounded-full border border-white/25"><span class="h-2.5 w-2.5 rounded-tl-full rounded-br-full bg-[#d7dfcb]" /></span>
          <span class="text-[0.7rem] font-semibold tracking-[0.24em]">MIÊN</span>
        </NuxtLink>
      </aside>

      <section class="relative flex min-h-[640px] items-center px-5 py-12 sm:px-10 md:min-h-[100dvh] md:px-[8vw] lg:px-[10vw]">
        <div class="auth-form-shell w-full max-w-[470px]">
          <div class="mb-10 flex items-center justify-between gap-5">
            <p class="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#6d7867]">Tài khoản khách hàng</p>
            <span class="flex items-center gap-2 text-[0.65rem] text-[#7a8176]"><span class="size-1.5 rounded-full bg-[#72866a] auth-status-dot" />Phiên được bảo vệ</span>
          </div>

          <CommonTabs v-model="mode" :items="[{ id: 'login', label: 'Đăng nhập' }, { id: 'register', label: 'Đăng ký' }]" aria-label="Chọn đăng nhập hoặc đăng ký" />

          <Transition name="auth-copy" mode="out-in">
            <div :key="mode" class="mt-10">
              <h1 class="font-display text-4xl font-light leading-none tracking-[-0.045em] md:text-5xl">{{ mode === 'login' ? 'Mừng bạn trở lại.' : 'Bắt đầu một khoảng riêng.' }}</h1>
              <p class="mt-4 max-w-[42ch] text-sm leading-6 text-[#70776c]">{{ mode === 'login' ? 'Dùng số điện thoại và mật khẩu để xem lịch hẹn cùng quyền lợi thành viên.' : 'Tạo tài khoản để MIÊN ghi nhớ lịch hẹn, điểm và những lựa chọn của bạn.' }}</p>
            </div>
          </Transition>

          <form class="mt-9" @submit.prevent="submit">
            <TransitionGroup name="auth-field" tag="div" class="grid gap-5">
              <label v-if="mode === 'register'" key="name" class="field-block auth-field"><span>Họ và tên</span><CommonInput v-model="form.name" autocomplete="name" placeholder="Tên của bạn" required /></label>
              <label key="phone" class="field-block auth-field"><span>Số điện thoại</span><CommonInput v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="090 123 4567" required /></label>
              <label v-if="mode === 'register'" key="email" class="field-block auth-field"><span>Email <i>không bắt buộc</i></span><CommonInput v-model="form.email" type="email" autocomplete="email" placeholder="ten@email.com" /></label>
              <label key="password" class="field-block auth-field"><span>Mật khẩu</span><span class="relative block"><CommonInput v-model="form.password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="Ít nhất 8 ký tự, gồm chữ và số" class="pr-12" required /><button type="button" class="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#6d7867] transition hover:text-[#34402f]" :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" @click="showPassword = !showPassword"><AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="17" /></button></span></label>
              <label v-if="mode === 'register'" key="confirm" class="field-block auth-field"><span>Xác nhận mật khẩu</span><CommonInput v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Nhập lại mật khẩu" required /></label>
            </TransitionGroup>

            <Transition name="auth-error"><p v-if="error" class="mt-5 border-l-2 border-[#965c50] bg-[#eadfd6] px-4 py-3 text-sm leading-6 text-[#78483f]" role="alert">{{ error }}</p></Transition>

            <button class="auth-submit mt-8 flex min-h-12 w-full items-center justify-between rounded-full bg-[#46533f] px-5 text-sm font-semibold text-[#f7f2e8] transition duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#34402f] active:scale-[0.98] disabled:cursor-wait disabled:opacity-65" type="submit" :disabled="busy">
              <span>{{ busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản' }}</span>
              <span class="grid size-7 place-items-center rounded-full bg-white/10"><AppIcon :name="busy ? 'refresh' : 'arrow'" :size="15" :class="busy ? 'animate-spin' : ''" /></span>
            </button>
            <p class="mt-5 text-center text-[0.67rem] leading-5 text-[#7b8277]">Bằng việc tiếp tục, bạn đồng ý để MIÊN lưu thông tin cần thiết cho việc đặt và quản lý lịch.</p>
          </form>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-form-shell { animation: auth-shell-in 700ms cubic-bezier(.16,1,.3,1) both; }
.auth-status-dot { animation: status-breathe 2.8s ease-in-out infinite; }
.auth-copy-enter-active, .auth-copy-leave-active { transition: opacity 180ms ease, transform 320ms cubic-bezier(.16,1,.3,1); }
.auth-copy-enter-from { opacity: 0; transform: translateY(10px); }
.auth-copy-leave-to { opacity: 0; transform: translateY(-6px); }
.auth-field-enter-active, .auth-field-leave-active, .auth-field-move { transition: opacity 220ms ease, transform 350ms cubic-bezier(.16,1,.3,1); }
.auth-field-enter-from, .auth-field-leave-to { opacity: 0; transform: translateY(-8px); }
.auth-field-leave-active { position: absolute; pointer-events: none; }
.auth-error-enter-active, .auth-error-leave-active { transition: opacity 180ms ease, transform 260ms cubic-bezier(.16,1,.3,1); }
.auth-error-enter-from, .auth-error-leave-to { opacity: 0; transform: translateY(-6px); }
.auth-submit:hover svg { transform: translateX(2px); }
.auth-submit svg { transition: transform 300ms cubic-bezier(.16,1,.3,1); }
@keyframes auth-shell-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes status-breathe { 0%,100% { opacity: .45; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.15); } }
@media (prefers-reduced-motion: reduce) { .auth-form-shell, .auth-status-dot { animation: none; } .auth-copy-enter-active, .auth-copy-leave-active, .auth-field-enter-active, .auth-field-leave-active, .auth-field-move, .auth-error-enter-active, .auth-error-leave-active { transition: none; } }
</style>
