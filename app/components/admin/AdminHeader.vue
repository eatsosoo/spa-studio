<script setup lang="ts">
defineEmits<{ toggleMenu: [] }>()

const route = useRoute()
const { user, logoutPending, logout } = useAdminAuth()
const menuOpen = ref(false)
const section = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  return parts.length > 1 ? parts.at(-1)?.replaceAll('-', ' ') : 'tổng quan'
})
const today = computed(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Bangkok' }).format(new Date()))

watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <header class="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#78816f]/15 bg-[#f6f3eb]/90 px-5 backdrop-blur-xl md:px-8 lg:px-10">
    <div class="flex items-center gap-3">
      <button type="button" class="grid size-10 place-items-center rounded-full border border-[#78816f]/20 transition active:scale-[0.98] lg:hidden" aria-label="Mở menu quản trị" @click="$emit('toggleMenu')"><AppIcon name="menu" /></button>
      <div><p class="text-[0.62rem] uppercase tracking-[0.18em] text-[#81877d]">MIÊN / {{ section }}</p><p class="mt-1 hidden text-xs capitalize text-[#566052] sm:block">{{ today }}</p></div>
    </div>

    <div class="flex items-center gap-2">
      <button type="button" class="relative grid size-10 place-items-center rounded-full border border-[#78816f]/20 text-[#465140] transition hover:bg-[#e9e5db] active:scale-[0.98]" aria-label="Thông báo"><AppIcon name="bell" :size="18" /><span class="absolute right-2 top-2 size-1.5 rounded-full bg-[#7d5148]" /></button>
      <div class="relative">
        <button type="button" class="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left transition hover:bg-[#e9e5db] active:scale-[0.98]" :aria-expanded="menuOpen" aria-haspopup="menu" @click="menuOpen = !menuOpen">
          <span class="grid size-9 place-items-center rounded-full bg-[#d8d2c3] text-[0.68rem] font-semibold text-[#35402f]">{{ user?.initials }}</span>
          <span class="hidden max-w-36 truncate text-xs font-semibold text-[#35402f] sm:block">{{ user?.fullName }}</span>
          <AppIcon name="chevron-down" :size="14" class="hidden text-[#74806e] transition sm:block" :class="menuOpen ? 'rotate-180' : ''" />
        </button>

        <Transition name="fade">
          <div v-if="menuOpen" class="absolute right-0 top-[calc(100%+0.65rem)] w-64 overflow-hidden rounded-md border border-[#78816f]/20 bg-[#fbf8f0] shadow-[0_18px_50px_rgba(49,58,45,0.13)]" role="menu">
            <div class="border-b border-[#78816f]/15 px-5 py-4"><p class="truncate text-xs font-semibold text-[#30392d]">{{ user?.fullName }}</p><p class="mt-1 truncate text-[0.66rem] text-[#7a8177]">{{ user?.email || user?.jobTitle }}</p></div>
            <div class="p-2">
              <NuxtLink to="/admin/ho-so" class="flex items-center gap-3 rounded-sm px-3 py-2.5 text-xs text-[#4d5848] transition hover:bg-[#e9e5da]" role="menuitem"><AppIcon name="profile" :size="17" />Hồ sơ của bạn</NuxtLink>
              <button type="button" class="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-xs text-[#795047] transition hover:bg-[#efdfda]" role="menuitem" :disabled="logoutPending" @click="logout"><AppIcon name="logout" :size="17" />{{ logoutPending ? 'Đang đăng xuất…' : 'Đăng xuất' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
