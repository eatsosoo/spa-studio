<script setup lang="ts">
const route = useRoute()
const postId = Number(route.params.id)
if (!Number.isInteger(postId) || postId <= 0) throw createError({ statusCode: 404, statusMessage: 'Bài viết không tồn tại.' })

definePageMeta({ layout: 'admin' })
</script>

<template>
  <AdminPostEditorScreen :post-id="postId" />
</template>
