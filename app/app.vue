<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
    <SiteChatbot v-if="!route.path.startsWith('/admin')" />
  </NuxtLayout>
</template>
