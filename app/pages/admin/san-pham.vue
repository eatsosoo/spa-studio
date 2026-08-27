<script setup lang="ts">
import { adminResources } from '~/data/admin'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Sản phẩm | MIÊN Admin' })
</script>
<template><AdminResourcePage :config="adminResources.products" /></template>
