<script setup lang="ts">
defineProps<{ current: 1 | 2 | 3 }>()
const steps = [{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán', to: '/thanh-toan' }, { label: 'Xác nhận', to: '' }]
</script>

<template>
  <nav aria-label="Tiến trình mua hàng" class="mx-auto mb-8 max-w-[1400px] border-b border-[#78816f]/25 pb-5">
    <ol class="flex flex-wrap gap-x-7 gap-y-3 text-xs">
      <li v-for="(step, index) in steps" :key="step.label" :aria-current="current === index + 1 ? 'step' : undefined" :class="current === index + 1 ? 'font-semibold text-[#34412f]' : 'text-[#737a70]'">
        <NuxtLink v-if="index + 1 < current && step.to" :to="step.to" class="underline underline-offset-4">{{ index + 1 }}. {{ step.label }}</NuxtLink>
        <span v-else>{{ index + 1 }}. {{ step.label }}</span>
      </li>
    </ol>
  </nav>
</template>
