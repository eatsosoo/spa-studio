<script setup lang="ts">
import { adminResources } from '~/data/admin'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Liệu trình | MIÊN Admin' })
</script>

<template><AdminResourcePage :config="adminResources.services" /></template>
