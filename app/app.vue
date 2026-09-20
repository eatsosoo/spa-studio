<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
    <template v-if="!route.path.startsWith('/admin')">
      <SiteBookingDrawer />
      <SiteChatbot />
    </template>
  </NuxtLayout>
</template>
