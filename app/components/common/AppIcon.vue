<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'dashboard'"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="11" width="7" height="10" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></template>
    <template v-else-if="name === 'users'"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></template>
    <template v-else-if="name === 'products'"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M3 12l9 5 9-5M3 16l9 5 9-5"/></template>
    <template v-else-if="name === 'services'"><path d="M12 21c4.8 0 8-2.8 8-7.2-3.6 0-6.1 1.3-8 4.2-1.9-2.9-4.4-4.2-8-4.2C4 18.2 7.2 21 12 21Z"/><path d="M12 18c-2.7-2.3-3.6-5.8-1.8-9.5L12 5l1.8 3.5c1.8 3.7.9 7.2-1.8 9.5ZM9.7 10.2C8 8.8 6 8.3 3.5 8.6c.2 3 1.6 5 4.4 6.4M14.3 10.2c1.7-1.4 3.7-1.9 6.2-1.6-.2 3-1.6 5-4.4 6.4"/></template>
    <template v-else-if="name === 'warehouse'"><path d="m3 9 9-6 9 6v11H3Z"/><path d="M7 20v-7h10v7M3 9h18M9 16h6"/></template>
    <template v-else-if="name === 'calendar'"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></template>
    <template v-else-if="name === 'staff'"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0M18 4l1.5 1.5L22 3"/></template>
    <template v-else-if="name === 'posts'"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></template>
    <template v-else-if="name === 'search'"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14"/></template>
    <template v-else-if="name === 'bell'"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></template>
    <template v-else-if="name === 'menu'"><path d="M4 7h16M4 12h16M4 17h16"/></template>
    <template v-else-if="name === 'close'"><path d="m6 6 12 12M18 6 6 18"/></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h14M13 6l6 6-6 6"/></template>
    <template v-else-if="name === 'arrow-left'"><path d="M19 12H5M11 18l-6-6 6-6"/></template>
    <template v-else-if="name === 'edit'"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></template>
    <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></template>
    <template v-else-if="name === 'refresh'"><path d="M20 6v6h-6M4 18v-6h6M6.5 7.5A7 7 0 0 1 20 12M4 12a7 7 0 0 0 13.5 4.5"/></template>
    <template v-else-if="name === 'external'"><path d="M15 3h6v6M10 14 21 3M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/></template>
    <template v-else-if="name === 'chevron'"><path d="m9 18 6-6-6-6"/></template>
    <template v-else-if="name === 'chevron-down'"><path d="m6 9 6 6 6-6"/></template>
    <template v-else-if="name === 'sort'"><path d="M8 7h9M8 12h7M8 17h5"/><path d="m4 5 2 2-2 2M4 15l2 2-2 2"/></template>
    <template v-else-if="name === 'image'"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></template>
    <template v-else-if="name === 'mail'"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></template>
    <template v-else-if="name === 'lock'"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></template>
    <template v-else-if="name === 'eye'"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></template>
    <template v-else-if="name === 'eye-off'"><path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a16.6 16.6 0 0 1-3 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.2-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></template>
    <template v-else-if="name === 'profile'"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></template>
    <template v-else-if="name === 'logout'"><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8"/></template>
    <template v-else-if="name === 'check'"><path d="m5 12 4 4L19 6"/></template>
    <template v-else-if="name === 'link'"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></template>
    <template v-else-if="name === 'alert'"><path d="M10.3 3.4 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.4a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/></template>
    <template v-else><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></template>
  </svg>
</template>
