<script setup lang="ts">
import { adminResources } from '~/data/admin'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Đặt lịch | MIÊN Admin' })
</script>
<template><AdminResourcePage :config="adminResources.bookings" /></template>
