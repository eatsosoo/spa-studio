<script setup lang="ts">
const props = defineProps<{ label: string }>()

const tone = computed(() => {
  if (['Đang bán', 'Đã xác nhận', 'Đã hoàn tất', 'Đã xuất bản', 'Đang làm việc', 'An'].includes(props.label)) return 'positive'
  if (['Sắp hết', 'Chờ xác nhận', 'Đã lên lịch', 'Mộc'].includes(props.label)) return 'pending'
  if (['Tạm ẩn', 'Bản nháp', 'Nghỉ hôm nay'].includes(props.label)) return 'muted'
  return 'neutral'
})
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <span class="status-badge__dot" />
    {{ label }}
  </span>
</template>
