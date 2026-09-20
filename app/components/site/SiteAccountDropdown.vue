<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const { customer, loaded, load, logout } = useCustomerAuth()
const logoutPending = ref(false)
const logoutError = ref('')
let openedByHover = false

function setOpen(value: boolean) {
  emit('update:open', value)
  if (value) logoutError.value = ''
}

function toggle() {
  // On desktop, pointer entry fires before click. Keep that first click from
  // immediately undoing the hover-open state, then let later clicks toggle.
  if (props.open && openedByHover) {
    openedByHover = false
    return
  }
  setOpen(!props.open)
}

function supportsHover() {
  return import.meta.client && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function openOnHover() {
  if (supportsHover()) {
    openedByHover = true
    setOpen(true)
  }
}

function closeOnHover() {
  if (!supportsHover()) return
  openedByHover = false
  if (!root.value?.contains(document.activeElement)) setOpen(false)
}

function focusFirstItem() {
  setOpen(true)
  nextTick(() => root.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
}

function handleDocumentPointer(event: PointerEvent) {
  if (props.open && root.value && !root.value.contains(event.target as Node)) setOpen(false)
}

function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (props.open && (!(next instanceof Node) || !root.value?.contains(next))) setOpen(false)
}

function closeWithKeyboard() {
  setOpen(false)
  nextTick(() => trigger.value?.focus())
}

async function signOut() {
  logoutPending.value = true
  logoutError.value = ''
  try {
    await logout()
    setOpen(false)
    await navigateTo('/')
  } catch {
    logoutError.value = 'Chưa thể đăng xuất. Bạn vui lòng thử lại.'
  } finally {
    logoutPending.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointer)
  void load()
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointer))
</script>

<template>
  <div ref="root" class="relative" @mouseenter="openOnHover" @mouseleave="closeOnHover" @focusout="handleFocusOut" @keydown.esc.stop.prevent="closeWithKeyboard">
    <button
      ref="trigger"
      type="button"
      class="relative grid size-10 place-items-center rounded-full border border-[#596650]/35 text-[#3f493a] transition hover:bg-[#e5e0d5] active:scale-[0.98]"
      aria-haspopup="menu"
      aria-controls="site-account-menu"
      :aria-expanded="open"
      :aria-label="customer ? `Mở menu tài khoản của ${customer.name}` : 'Mở menu đăng nhập'"
      @click="toggle"
      @keydown.down.prevent="focusFirstItem"
    >
      <AppIcon name="profile" :size="18" />
      <span v-if="loaded && customer" class="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#f3efe5] bg-[#67805e]" aria-hidden="true" />
    </button>

    <Transition name="header-popover">
      <div v-if="open" id="site-account-menu" class="fixed left-4 right-4 top-[5.1rem] z-40 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[20rem] sm:pt-3" role="menu" aria-label="Tài khoản khách hàng">
        <div class="overflow-hidden rounded-lg border border-[#78816f]/20 bg-[#f8f4ea] p-2 shadow-[0_22px_60px_rgba(42,52,38,0.2)]">
          <div class="border-b border-[#78816f]/15 px-3 pb-4 pt-3">
            <template v-if="customer">
              <p class="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#75806f]">Tài khoản MIÊN</p>
              <p class="mt-1 truncate text-sm font-semibold text-[#35402f]">{{ customer.name }}</p>
              <p class="mt-1 text-[0.67rem] text-[#7a8176]">{{ customer.loyaltyPoints.toLocaleString('vi-VN') }} điểm tích lũy</p>
            </template>
            <template v-else>
              <p class="text-sm font-semibold text-[#35402f]">Khoảng riêng của bạn</p>
              <p class="mt-1 text-[0.68rem] leading-5 text-[#747b70]">Đăng nhập để theo dõi lịch hẹn và điểm thành viên.</p>
            </template>
          </div>

          <div v-if="customer" class="grid gap-1 py-2">
            <NuxtLink to="/tai-khoan" class="account-menu-item" role="menuitem" @click="setOpen(false)"><AppIcon name="profile" :size="16" />Hồ sơ</NuxtLink>
            <NuxtLink to="/lich-cua-toi" class="account-menu-item" role="menuitem" @click="setOpen(false)"><AppIcon name="calendar" :size="16" />Lịch hẹn</NuxtLink>
            <button type="button" class="account-menu-item text-[#795047] disabled:cursor-wait disabled:opacity-60" role="menuitem" :disabled="logoutPending" @click="signOut"><AppIcon name="logout" :size="16" />{{ logoutPending ? 'Đang đăng xuất…' : 'Đăng xuất' }}</button>
            <p v-if="logoutError" class="px-3 pb-2 text-[0.68rem] leading-5 text-[#8b5148]" role="alert">{{ logoutError }}</p>
          </div>
          <div v-else class="grid grid-cols-2 gap-2 p-2">
            <NuxtLink to="/dang-nhap" class="button-primary justify-center px-3 py-3" role="menuitem" @click="setOpen(false)">Đăng nhập</NuxtLink>
            <NuxtLink to="/dang-nhap?mode=register" class="button-quiet justify-center px-3 py-3" role="menuitem" @click="setOpen(false)">Đăng ký</NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.account-menu-item {
  display: flex;
  width: 100%;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.3rem;
  padding-inline: 0.75rem;
  color: #45513f;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  transition: background-color 220ms ease, color 220ms ease;
}

.account-menu-item:hover,
.account-menu-item:focus-visible { background: #e8e4d9; color: #303b2c; }
.header-popover-enter-active,
.header-popover-leave-active { transition: opacity 160ms ease, transform 240ms cubic-bezier(0.16, 1, 0.3, 1); }
.header-popover-enter-from,
.header-popover-leave-to { opacity: 0; transform: translateY(-5px) scale(0.985); }
</style>
