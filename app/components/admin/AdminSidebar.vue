<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const { user } = useAdminAuth()
const items = [
  { label: 'Tổng quan', to: '/admin', icon: 'dashboard' },
  { label: 'Khách hàng', to: '/admin/khach-hang', icon: 'users' },
  { label: 'Sản phẩm', to: '/admin/san-pham', icon: 'products' },
  { label: 'Quản lý kho', to: '/admin/kho', icon: 'warehouse' },
  { label: 'Đặt lịch', to: '/admin/dat-lich', icon: 'calendar' },
  { label: 'Nhân viên', to: '/admin/nhan-vien', icon: 'staff' },
  { label: 'Bài viết', to: '/admin/bai-viet', icon: 'posts' },
]

function isActive(to: string) {
  return to === '/admin' ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <Transition name="fade">
    <button v-if="open" class="fixed inset-0 z-30 bg-[#1d241b]/35 backdrop-blur-[2px] lg:hidden" aria-label="Đóng menu quản trị" @click="$emit('close')" />
  </Transition>

  <aside class="admin-sidebar" :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'">
    <div class="flex h-20 items-center justify-between border-b border-white/10 px-6">
      <NuxtLink to="/" class="flex items-center gap-3 text-[#f5f0e6]">
        <span class="grid size-8 place-items-center rounded-full border border-[#dce3d7]/35">
          <span class="h-3 w-3 rounded-tl-full rounded-br-full bg-[#cbd3c4]" />
        </span>
        <span class="text-xs font-semibold tracking-[0.26em]">MIÊN</span>
      </NuxtLink>
      <button type="button" class="grid size-9 place-items-center rounded-full text-[#cdd4c8] hover:bg-white/10 lg:hidden" aria-label="Đóng menu" @click="$emit('close')">
        <AppIcon name="close" />
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col px-3 py-6">
      <p class="mb-3 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#99a494]">Vận hành</p>
      <nav class="grid gap-1" aria-label="Điều hướng quản trị">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="admin-nav-item"
          :class="isActive(item.to) ? 'admin-nav-item--active' : ''"
          @click="$emit('close')"
        >
          <AppIcon :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
          <span v-if="item.to === '/admin/dat-lich'" class="ml-auto rounded-full bg-[#d9dfd2]/15 px-2 py-0.5 text-[0.64rem]">3</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto border-t border-white/10 px-3 pt-5">
        <NuxtLink to="/" class="flex items-center gap-3 text-xs text-[#b7c0b2] transition hover:text-white">
          <AppIcon name="external" :size="17" />
          Xem website
        </NuxtLink>
        <NuxtLink to="/admin/ho-so" class="mt-5 flex items-center gap-3 rounded-sm p-1 transition hover:bg-white/[0.06]" @click="$emit('close')">
          <span class="grid size-9 place-items-center rounded-full bg-[#d8d2c3] text-xs font-semibold text-[#35402f]">{{ user?.initials }}</span>
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-[#f2eee5]">{{ user?.fullName }}</p>
            <p class="mt-0.5 truncate text-[0.65rem] text-[#99a494]">{{ user?.jobTitle }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>
