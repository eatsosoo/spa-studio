<script setup lang="ts">
import type { Product } from '~/types'

const props = defineProps<{ modelValue: number[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number[]] }>()
const search = ref('')
const { data, pending, error } = await useAsyncData('admin-related-products', () => $fetch<{ data: Product[] }>('/api/products'))
const products = computed(() => data.value?.data ?? [])
const normalizedSearch = computed(() => search.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').trim())
const filtered = computed(() => products.value.filter(product => `${product.name} ${product.sku}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').includes(normalizedSearch.value)))
const selected = computed(() => props.modelValue.map(id => products.value.find(product => product.id === id)).filter((product): product is Product => Boolean(product)))

function toggle(id: number) {
  if (props.modelValue.includes(id)) emit('update:modelValue', props.modelValue.filter(value => value !== id))
  else if (props.modelValue.length < 4) emit('update:modelValue', [...props.modelValue, id])
}
</script>

<template>
  <section class="border-t border-[#78816f]/25 pt-5">
    <div class="flex items-center justify-between gap-3"><h2 class="text-xs font-semibold text-[#394433]">Sản phẩm liên quan</h2><span class="text-[0.64rem] text-[#7b8277]">{{ modelValue.length }}/4</span></div>
    <p class="mt-2 text-[0.66rem] leading-5 text-[#7b8277]">Để trống để tự động hiển thị sản phẩm bán chạy.</p>
    <div v-if="selected.length" class="mt-4 grid gap-2">
      <div v-for="product in selected" :key="product.id" class="flex items-center gap-3 border border-[#78816f]/20 bg-[#faf7f0] p-2">
        <img :src="product.image" :alt="product.name" class="size-10 object-cover" :style="{ objectPosition: product.imagePosition }">
        <span class="min-w-0 flex-1 truncate text-[0.7rem] font-semibold">{{ product.name }}</span>
        <button type="button" class="grid size-8 place-items-center text-[#84554d]" :aria-label="`Gỡ ${product.name}`" @click="toggle(product.id)"><AppIcon name="close" :size="14" /></button>
      </div>
    </div>
    <label class="admin-field mt-4"><span>Tìm sản phẩm</span><input v-model="search" type="search" placeholder="Tên hoặc SKU"></label>
    <div v-if="pending" class="mt-3 h-28 animate-pulse bg-[#e6e1d6]" />
    <p v-else-if="error" class="mt-3 text-[0.68rem] text-[#84554d]">Không tải được danh sách sản phẩm.</p>
    <div v-else class="mt-3 max-h-56 divide-y divide-[#78816f]/15 overflow-y-auto border-y border-[#78816f]/20">
      <button v-for="product in filtered" :key="product.id" type="button" class="flex w-full items-center gap-3 py-2.5 text-left disabled:opacity-40" :disabled="!modelValue.includes(product.id) && modelValue.length >= 4" :aria-pressed="modelValue.includes(product.id)" @click="toggle(product.id)">
        <span class="grid size-5 shrink-0 place-items-center border border-[#78816f]/35" :class="modelValue.includes(product.id) ? 'bg-[#4c5d43] text-white' : ''"><AppIcon v-if="modelValue.includes(product.id)" name="check" :size="12" /></span>
        <span class="min-w-0"><strong class="block truncate text-[0.7rem]">{{ product.name }}</strong><small class="text-[0.62rem] font-normal text-[#7b8277]">{{ product.sku }} · {{ product.status }}</small></span>
      </button>
      <p v-if="!filtered.length" class="py-5 text-center text-[0.68rem] text-[#7b8277]">Không tìm thấy sản phẩm.</p>
    </div>
  </section>
</template>
