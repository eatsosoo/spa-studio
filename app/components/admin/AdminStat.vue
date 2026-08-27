<script setup lang="ts">
defineProps<{ label: string; value: string; note: string; trend?: string }>()
</script>

<template>
  <div class="border-l border-[#7c8574]/25 px-5 first:border-l-0 first:pl-0 md:px-7">
    <p class="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#7c8378]">{{ label }}</p>
    <div class="mt-4 flex items-end gap-3">
      <strong class="text-3xl font-medium tracking-[-0.045em] text-[#30392c] md:text-4xl">{{ value }}</strong>
      <span v-if="trend" class="mb-1 text-[0.68rem] font-semibold text-[#53674c]">{{ trend }}</span>
    </div>
    <p class="mt-2 text-[0.68rem] leading-5 text-[#777e73]">{{ note }}</p>
  </div>
</template>
