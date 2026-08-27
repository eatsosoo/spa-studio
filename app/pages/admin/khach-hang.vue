<script setup lang="ts">
import { adminResources } from '~/data/admin'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Khách hàng | MIÊN Admin' })
</script>
<template><AdminResourcePage :config="adminResources.customers" /></template>
