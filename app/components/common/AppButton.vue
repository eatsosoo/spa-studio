<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  icon?: string
  to?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
}>(), { variant: 'primary', type: 'button', disabled: false })

defineEmits<{ click: [] }>()
</script>

<template>
  <NuxtLink v-if="to" :to="to" class="app-action" :class="`app-action--${variant}`">
    <AppIcon v-if="icon" :name="icon" :size="17" />
    <span v-if="label">{{ label }}</span>
    <slot />
  </NuxtLink>
  <button v-else :type="type" :disabled="disabled" class="app-action" :class="`app-action--${variant}`" @click="$emit('click')">
    <AppIcon v-if="icon" :name="icon" :size="17" />
    <span v-if="label">{{ label }}</span>
    <slot />
  </button>
</template>
