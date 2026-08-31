<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template>
  <div class="article-content" v-html="content" />
</template>
