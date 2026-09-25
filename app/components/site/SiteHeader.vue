<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const isMenuOpen = ref(false)
const activeMenu = ref<'account' | 'cart' | null>(null)
const route = useRoute()

function setActiveMenu(menu: 'account' | 'cart', open: boolean) {
  activeMenu.value = open ? menu : null
  if (open) isMenuOpen.value = false
}

function toggleMobileMenu() {
  activeMenu.value = null
  isMenuOpen.value = !isMenuOpen.value
}

watch(() => route.fullPath, () => {
  activeMenu.value = null
  isMenuOpen.value = false
})
</script>

<template>
  <header :class="compact ? 'relative z-20' : 'absolute inset-x-0 top-0 z-20'" @keydown.esc="activeMenu = null; isMenuOpen = false">
    <div class="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 md:px-10 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-14">
      <NuxtLink to="/" class="group flex items-center gap-3 lg:justify-self-start" aria-label="MIÊN Spa, về trang chủ">
        <span class="grid size-9 place-items-center rounded-full border border-[#4c5d43]/35 transition-transform duration-500 group-hover:rotate-45">
          <span class="h-3.5 w-3.5 rounded-tl-full rounded-br-full bg-[#4c5d43]" />
        </span>
        <span class="text-[0.88rem] font-semibold tracking-[0.28em]">MIÊN</span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 text-[0.78rem] font-medium tracking-wide lg:flex" aria-label="Điều hướng chính">
        <NuxtLink to="/lieu-trinh" class="nav-link">Liệu trình</NuxtLink>
        <NuxtLink to="/san-pham" class="nav-link">Sản phẩm</NuxtLink>
        <NuxtLink to="/bai-viet" class="nav-link">Bài viết</NuxtLink>
      </nav>

      <div class="flex items-center gap-3 lg:justify-self-end">
        <SiteAccountDropdown :open="activeMenu === 'account'" @update:open="setActiveMenu('account', $event)" />
        <SiteCartDropdown :open="activeMenu === 'cart'" @update:open="setActiveMenu('cart', $event)" />
        <button type="button" class="grid size-10 place-items-center rounded-full border border-[#596650]/35 lg:hidden" :aria-expanded="isMenuOpen" aria-controls="site-mobile-menu" :aria-label="isMenuOpen ? 'Đóng menu' : 'Mở menu'" @click="toggleMobileMenu">
          <AppIcon :name="isMenuOpen ? 'close' : 'menu'" />
        </button>
      </div>
    </div>

    <Transition name="fade">
      <nav v-if="isMenuOpen" id="site-mobile-menu" @keydown.esc="isMenuOpen = false" class="absolute inset-x-5 top-[82px] grid gap-1 rounded-md border border-[#78816f]/20 bg-[#f3efe5]/95 p-3 shadow-[0_18px_45px_rgba(47,57,42,0.12)] backdrop-blur-xl lg:hidden" aria-label="Điều hướng mobile">
        <NuxtLink to="/lieu-trinh" class="mobile-nav-link" @click="isMenuOpen = false">Liệu trình</NuxtLink>
        <NuxtLink to="/san-pham" class="mobile-nav-link" @click="isMenuOpen = false">Sản phẩm</NuxtLink>
        <NuxtLink to="/bai-viet" class="mobile-nav-link" @click="isMenuOpen = false">Bài viết</NuxtLink>
        <NuxtLink to="/#khong-gian" class="mobile-nav-link" @click="isMenuOpen = false">Không gian</NuxtLink>
      </nav>
    </Transition>
  </header>
</template>
