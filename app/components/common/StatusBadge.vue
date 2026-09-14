<script setup lang="ts">
const props = defineProps<{ label: string }>()

const tone = computed(() => {
  if (['Đang bán', 'Đã xác nhận', 'Đã hoàn tất', 'Đã giao', 'Đã thanh toán', 'Đã xuất bản', 'Đã đăng', 'Đã tạo', 'Đang làm việc', 'Đã ghi sổ', 'Còn hạn', 'An'].includes(props.label)) return 'positive'
  if (['Sắp hết', 'Sắp hết hạn', 'Chờ xác nhận', 'Chờ xử lý', 'Đang tạo', 'Đang đóng gói', 'Đang giao', 'Chờ thanh toán', 'Chưa thanh toán', 'Đã lên lịch', 'Mộc'].includes(props.label)) return 'pending'
  if (['Tạm ẩn', 'Tạm hết hàng', 'Bản nháp', 'Chờ viết', 'Đã hủy', 'Nghỉ hôm nay', 'Đã hết hạn', 'Không hạn dùng'].includes(props.label)) return 'muted'
  if (['Lỗi', 'Thất bại'].includes(props.label)) return 'danger'
  return 'neutral'
})
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <span class="status-badge__dot" />
    {{ label }}
  </span>
</template>
