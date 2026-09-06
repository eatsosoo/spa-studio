<script setup lang="ts">
const sidebarOpen = ref(false)
const { preferences, fontScale } = useAdminPreferences()

useHead({
  htmlAttrs: {
    style: computed(() => `font-size: ${16 * fontScale.value}px`),
  },
})
</script>

<template>
  <div
    class="admin-shell min-h-[100dvh] bg-[#f6f3eb] text-[#30382d]"
    :data-density="preferences.density"
    :data-high-contrast="preferences.highContrast ? 'true' : undefined"
    :data-reduce-motion="preferences.reduceMotion ? 'true' : undefined"
  >
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="min-h-[100dvh] lg:pl-[260px]">
      <AdminHeader @toggle-menu="sidebarOpen = !sidebarOpen" />
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
