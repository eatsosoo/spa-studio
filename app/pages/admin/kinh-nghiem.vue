<script setup lang="ts">
import { adminResources } from '~/data/admin'
definePageMeta({ layout: 'admin' })
const config = { ...adminResources.posts, title: 'Kinh nghiệm chăm sóc sức khỏe', description: 'Biên tập kiến thức sức khỏe, kiểm tra SEO, xem trước và quản lý trạng thái xuất bản.', addLabel: 'Viết kinh nghiệm mới' }
</script>
<template><AdminResourcePage :config="config" health /></template>
