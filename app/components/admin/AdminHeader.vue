<script setup lang="ts">
defineEmits<{ toggleMenu: [] }>()

const route = useRoute()
const section = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  return parts.length > 1 ? parts.at(-1)?.replaceAll('-', ' ') : 'tổng quan'
})
</script>

<template>
  <header class="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#78816f]/15 bg-[#f6f3eb]/90 px-5 backdrop-blur-xl md:px-8 lg:px-10">
    <div class="flex items-center gap-3">
      <button type="button" class="grid size-10 place-items-center rounded-full border border-[#78816f]/20 lg:hidden" aria-label="Mở menu quản trị" @click="$emit('toggleMenu')">
        <AppIcon name="menu" />
      </button>
      <div>
        <p class="text-[0.62rem] uppercase tracking-[0.18em] text-[#81877d]">MIÊN / {{ section }}</p>
        <p class="mt-1 hidden text-xs text-[#566052] sm:block">Thứ năm, 27 tháng 8</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button type="button" class="relative grid size-10 place-items-center rounded-full border border-[#78816f]/20 text-[#465140] transition hover:bg-[#e9e5db]" aria-label="Thông báo">
        <AppIcon name="bell" :size="18" />
        <span class="absolute right-2 top-2 size-1.5 rounded-full bg-[#7d5148]" />
      </button>
      <span class="ml-1 hidden text-xs font-semibold text-[#35402f] sm:block">Phương Anh</span>
    </div>
  </header>
</template>
