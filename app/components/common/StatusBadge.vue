<script setup lang="ts">
const props = defineProps<{ label: string }>()

const tone = computed(() => {
  if (['Đang bán', 'Đã xác nhận', 'Đã hoàn tất', 'Đã xuất bản', 'Đang làm việc', 'Đã ghi sổ', 'Còn hạn', 'An'].includes(props.label)) return 'positive'
  if (['Sắp hết', 'Sắp hết hạn', 'Chờ xác nhận', 'Đã lên lịch', 'Mộc'].includes(props.label)) return 'pending'
  if (['Tạm ẩn', 'Bản nháp', 'Đã hủy', 'Nghỉ hôm nay', 'Đã hết hạn', 'Không hạn dùng'].includes(props.label)) return 'muted'
  return 'neutral'
})
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <span class="status-badge__dot" />
    {{ label }}
  </span>
</template>
