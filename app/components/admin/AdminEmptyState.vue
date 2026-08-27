<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="grid min-h-64 place-items-center border-b border-[#78816f]/15 py-14 text-center">
    <div>
      <span class="mx-auto grid size-12 place-items-center rounded-full border border-[#78816f]/25 text-[#687362]"><AppIcon name="search" /></span>
      <h3 class="mt-5 text-sm font-semibold text-[#35402f]">{{ title }}</h3>
      <p class="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#747b70]">{{ description }}</p>
    </div>
  </div>
</template>
