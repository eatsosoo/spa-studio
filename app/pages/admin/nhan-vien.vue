<script setup lang="ts">
import { adminResources } from '~/data/admin'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Nhân viên | MIÊN Admin' })
</script>
<template><AdminResourcePage :config="adminResources.employees" /></template>
