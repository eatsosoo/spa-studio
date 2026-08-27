<script setup lang="ts">
import { adminResources } from '~/data/admin'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Bài viết | MIÊN Admin' })
</script>
<template><AdminResourcePage :config="adminResources.posts" /></template>
