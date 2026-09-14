<script setup lang="ts">
import type { AiPostMediaSource } from '~/types/ai-content'

const props = defineProps<{ modelValue: AiPostMediaSource | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: AiPostMediaSource | null] }>()
const open = ref(false)

const label = computed(() => {
  if (!props.modelValue) return 'Chọn ảnh hoặc thư mục ảnh'
  return props.modelValue.kind === 'folder' ? props.modelValue.path || 'Thư mục posts' : props.modelValue.filename
})

function select(value: AiPostMediaSource) {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<template>
  <div>
    <div class="flex gap-2">
      <button type="button" class="flex h-[43px] min-w-0 flex-1 items-center gap-3 rounded-[0.3rem] border border-[#586550]/30 bg-[#fffdf8]/70 px-3 text-left text-xs font-normal text-[#34402f] transition hover:border-[#607059] hover:bg-[#fffcf6] active:translate-y-px" @click="open = true">
        <span class="grid size-7 shrink-0 place-items-center rounded-md bg-[#e8e5da] text-[#596653]"><AppIcon :name="modelValue?.kind === 'image' ? 'image' : 'folder'" :size="15" /></span>
        <span class="min-w-0 flex-1 truncate" :class="modelValue ? '' : 'text-[#8a9087]'">{{ label }}</span>
        <AppIcon name="chevron" :size="13" class="shrink-0 text-[#7b8476]" />
      </button>
      <button v-if="modelValue" type="button" class="grid size-[43px] shrink-0 place-items-center rounded-[0.3rem] border border-[#78816f]/25 bg-[#f5f1e8] text-[#747d70] transition hover:bg-[#e9e5da] active:translate-y-px" title="Bỏ chọn ảnh" @click="$emit('update:modelValue', null)"><AppIcon name="close" :size="14" /></button>
    </div>
    <p class="mt-2 text-[0.66rem] font-normal leading-5 text-[#83897f]">Chọn một ảnh hoặc một thư mục. Với thư mục, AI dùng tối đa 3 ảnh và lấy ảnh đầu tiên làm ảnh đại diện.</p>
    <AdminMediaBrowserModal :open="open" :model-value="modelValue" @close="open = false" @select="select" />
  </div>
</template>
