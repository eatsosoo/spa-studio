<script setup lang="ts">
import { adminResources } from '~/data/admin'

definePageMeta({ layout: 'admin' })
</script>

<template>
  <AdminResourcePage :config="adminResources.posts" />
</template>
