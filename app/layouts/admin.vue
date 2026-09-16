<script setup lang="ts">
useSeoMeta({ robots: 'noindex, nofollow' })
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
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
    <AdminSidebar
      :open="sidebarOpen"
      :collapsed="sidebarCollapsed"
      @close="sidebarOpen = false"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      @expand="sidebarCollapsed = false"
    />
    <div
      class="min-h-[100dvh] transition-[padding-left] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'"
    >
      <AdminHeader @toggle-menu="sidebarOpen = !sidebarOpen" />
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
