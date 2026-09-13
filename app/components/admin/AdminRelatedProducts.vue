<script setup lang="ts">
import type { Product } from '~/types'

const props = defineProps<{ modelValue: number[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number[]] }>()
const open = ref(false)
const search = ref('')
const draftIds = ref<number[]>([])
const { data, pending, error } = await useAsyncData('admin-related-products', () => $fetch<{ data: Product[] }>('/api/products'))
const products = computed(() => data.value?.data ?? [])
const normalizedSearch = computed(() => normalize(search.value))
const filtered = computed(() => products.value.filter(product => normalize(product.name + ' ' + product.sku).includes(normalizedSearch.value)))
const selected = computed(() => props.modelValue.map(id => products.value.find(product => product.id === id)).filter((product): product is Product => Boolean(product)))

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').trim()
}

function showPicker() {
  draftIds.value = [...props.modelValue]
  search.value = ''
  open.value = true
}

function closePicker() {
  open.value = false
  search.value = ''
}

function toggleDraft(id: number) {
  if (draftIds.value.includes(id)) draftIds.value = draftIds.value.filter(value => value !== id)
  else if (draftIds.value.length < 4) draftIds.value = [...draftIds.value, id]
}

function applySelection() {
  emit('update:modelValue', [...draftIds.value])
  closePicker()
}

function remove(id: number) {
  emit('update:modelValue', props.modelValue.filter(value => value !== id))
}
</script>

<template>
  <section class="border-t border-[#78816f]/25 pt-5">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-xs font-semibold text-[#394433]">Sản phẩm liên quan</h2>
      <span class="text-[0.64rem] text-[#7b8277]">{{ modelValue.length }}/4</span>
    </div>
    <p class="mt-2 text-[0.66rem] leading-5 text-[#7b8277]">Để trống để tự động hiển thị sản phẩm bán chạy.</p>
    <div v-if="selected.length" class="mt-4 grid gap-2">
      <div v-for="product in selected" :key="product.id" class="flex items-center gap-3 border border-[#78816f]/20 bg-[#faf7f0] p-2">
        <img :src="product.image" :alt="product.name" class="size-10 object-cover" :style="{ objectPosition: product.imagePosition }">
        <span class="min-w-0 flex-1 truncate text-[0.7rem] font-semibold">{{ product.name }}</span>
        <button type="button" class="grid size-8 place-items-center text-[#84554d]" :aria-label="'Gỡ ' + product.name" @click="remove(product.id)"><AppIcon name="close" :size="14" /></button>
      </div>
    </div>
    <button type="button" class="mt-4 flex w-full items-center justify-center gap-2 border border-[#78816f]/30 bg-[#f8f5ed] px-4 py-3 text-[0.68rem] font-semibold text-[#4d5a47] transition hover:bg-[#e8e3d8]" @click="showPicker">
      <AppIcon name="search" :size="14" />
      {{ modelValue.length ? 'Thay đổi sản phẩm' : 'Chọn sản phẩm' }}
    </button>

    <CommonModal
      :open="open"
      title="Chọn sản phẩm liên quan"
      description="Chọn tối đa 4 sản phẩm. Thứ tự lựa chọn cũng là thứ tự hiển thị trong bài viết."
      size="lg"
      @close="closePicker"
    >
      <label class="admin-field">
        <span>Tìm sản phẩm</span>
        <CommonInput v-model="search" autofocus type="search" placeholder="Nhập tên hoặc SKU" />
      </label>
      <div class="mt-5 flex items-center justify-between gap-3">
        <p class="text-[0.68rem] font-semibold text-[#4d5748]">Danh sách sản phẩm</p>
        <span class="rounded-full bg-[#e4eadf] px-3 py-1 text-[0.64rem] font-semibold text-[#52604c]">Đã chọn {{ draftIds.length }}/4</span>
      </div>
      <div v-if="pending" class="mt-3 h-72 animate-pulse bg-[#e6e1d6]" />
      <p v-else-if="error" class="mt-3 border border-[#9a6157]/25 bg-[#f1e4df] px-4 py-3 text-xs text-[#84554d]">Không tải được danh sách sản phẩm.</p>
      <div v-else class="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          v-for="product in filtered"
          :key="product.id"
          type="button"
          class="flex min-w-0 items-center gap-3 border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="draftIds.includes(product.id) ? 'border-[#53634b] bg-[#e8ede3]' : 'border-[#78816f]/20 bg-[#fcfaf5] hover:border-[#78816f]/45'"
          :disabled="!draftIds.includes(product.id) && draftIds.length >= 4"
          :aria-pressed="draftIds.includes(product.id)"
          @click="toggleDraft(product.id)"
        >
          <img :src="product.image" :alt="product.name" class="size-14 shrink-0 object-cover" :style="{ objectPosition: product.imagePosition }">
          <span class="min-w-0 flex-1">
            <strong class="block truncate text-[0.72rem] text-[#364030]">{{ product.name }}</strong>
            <small class="mt-1 block truncate text-[0.62rem] font-normal text-[#7b8277]">{{ product.sku }} · {{ product.status }}</small>
          </span>
          <span class="grid size-6 shrink-0 place-items-center border border-[#78816f]/35" :class="draftIds.includes(product.id) ? 'bg-[#4c5d43] text-white' : ''"><AppIcon v-if="draftIds.includes(product.id)" name="check" :size="12" /></span>
        </button>
        <p v-if="!filtered.length" class="py-10 text-center text-xs text-[#7b8277] sm:col-span-2">Không tìm thấy sản phẩm phù hợp.</p>
      </div>
      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[0.66rem] leading-5 text-[#737a70]">Nếu bỏ chọn tất cả, bài viết sẽ dùng sản phẩm bán chạy.</p>
          <div class="flex justify-end gap-2">
            <AppButton label="Hủy" variant="secondary" @click="closePicker" />
            <AppButton label="Áp dụng" icon="check" @click="applySelection" />
          </div>
        </div>
      </template>
    </CommonModal>
  </section>
</template>
