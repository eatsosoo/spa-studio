<script setup lang="ts">
const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f6f3eb] text-[#30382d]">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="min-h-[100dvh] lg:pl-[260px]">
      <AdminHeader @toggle-menu="sidebarOpen = !sidebarOpen" />
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
