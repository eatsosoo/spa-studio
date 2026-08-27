<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const isMenuOpen = ref(false)
</script>

<template>
  <header :class="compact ? 'relative' : 'absolute inset-x-0 top-0 z-20'">
    <div class="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 md:px-10 lg:px-14">
      <NuxtLink to="/" class="group flex items-center gap-3" aria-label="MIÊN Spa, về trang chủ">
        <span class="grid size-9 place-items-center rounded-full border border-[#4c5d43]/35 transition-transform duration-500 group-hover:rotate-45">
          <span class="h-3.5 w-3.5 rounded-tl-full rounded-br-full bg-[#4c5d43]" />
        </span>
        <span class="text-[0.88rem] font-semibold tracking-[0.28em]">MIÊN</span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 text-[0.78rem] font-medium tracking-wide lg:flex" aria-label="Điều hướng chính">
        <NuxtLink to="/#lieu-trinh" class="nav-link">Liệu trình</NuxtLink>
        <NuxtLink to="/san-pham" class="nav-link">Sản phẩm</NuxtLink>
        <NuxtLink to="/#khong-gian" class="nav-link">Không gian</NuxtLink>
        <NuxtLink to="/#cau-chuyen" class="nav-link">Câu chuyện</NuxtLink>
      </nav>

      <div class="flex items-center gap-3">
        <slot name="action">
          <NuxtLink to="/?dat-lich=1" class="button-quiet hidden sm:inline-flex">Đặt một khoảng nghỉ</NuxtLink>
        </slot>
        <button type="button" class="grid size-10 place-items-center rounded-full border border-[#596650]/35 lg:hidden" aria-label="Mở menu" @click="isMenuOpen = !isMenuOpen">
          <AppIcon :name="isMenuOpen ? 'close' : 'menu'" />
        </button>
      </div>
    </div>

    <Transition name="fade">
      <nav v-if="isMenuOpen" class="absolute inset-x-5 top-[82px] grid gap-1 rounded-md border border-[#78816f]/20 bg-[#f3efe5]/95 p-3 shadow-[0_18px_45px_rgba(47,57,42,0.12)] backdrop-blur-xl lg:hidden" aria-label="Điều hướng mobile">
        <NuxtLink to="/#lieu-trinh" class="mobile-nav-link" @click="isMenuOpen = false">Liệu trình</NuxtLink>
        <NuxtLink to="/san-pham" class="mobile-nav-link" @click="isMenuOpen = false">Sản phẩm</NuxtLink>
        <NuxtLink to="/#khong-gian" class="mobile-nav-link" @click="isMenuOpen = false">Không gian</NuxtLink>
        <NuxtLink to="/admin" class="mobile-nav-link" @click="isMenuOpen = false">Quản trị</NuxtLink>
      </nav>
    </Transition>
  </header>
</template>
