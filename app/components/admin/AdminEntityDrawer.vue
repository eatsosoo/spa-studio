<script setup lang="ts">
import type { AdminFormField, AdminRow } from '~/types'

const props = defineProps<{
  open: boolean
  title: string
  fields: AdminFormField[]
  value?: AdminRow | null
  saving?: boolean
  apiError?: string
}>()

const emit = defineEmits<{ close: []; save: [value: AdminRow] }>()
const form = reactive<AdminRow>({})
const errors = reactive<Record<string, string>>({})
const imageFailures = reactive<Record<string, boolean>>({})
const firstField = ref<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null)

watch(() => [props.open, props.value] as const, () => {
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, props.value ?? {})
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.keys(imageFailures).forEach((key) => delete imageFailures[key])
  if (props.open) nextTick(() => firstField.value?.focus())
}, { immediate: true, deep: true })

watch(() => props.open, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function close() {
  if (!props.saving) emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

function submit() {
  Object.keys(errors).forEach((key) => delete errors[key])
  props.fields.forEach((field) => {
    if (field.required !== false && !String(form[field.key] ?? '').trim()) errors[field.key] = `Vui lòng nhập ${field.label.toLowerCase()}.`
    if (field.type === 'number' && Number(form[field.key]) < 0) errors[field.key] = `${field.label} không được nhỏ hơn 0.`
    if (field.type === 'image') {
      const source = String(form[field.key] ?? '').trim()
      if (source && !source.startsWith('/') && !/^https?:\/\//i.test(source)) errors[field.key] = 'Dùng URL http/https hoặc đường dẫn bắt đầu bằng /.'
    }
  })
  if (Object.keys(errors).length) return
  emit('save', { ...form })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50" role="dialog" aria-modal="true" :aria-label="title" @keydown="handleKeydown">
        <button type="button" class="absolute inset-0 cursor-default bg-[#20271e]/45 backdrop-blur-[2px]" aria-label="Đóng" :disabled="saving" @click="close" />
        <aside class="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto bg-[#f6f3eb] px-6 py-7 shadow-[-24px_0_70px_rgba(38,45,34,0.14)] md:px-10 md:py-9">
          <div class="flex items-start justify-between gap-6 border-b border-[#78816f]/20 pb-7">
            <div>
              <p class="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#788170]">Thông tin quản lý</p>
              <h2 class="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#30392d]">{{ title }}</h2>
            </div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 transition hover:bg-[#e7e3d9] disabled:cursor-wait disabled:opacity-50" aria-label="Đóng" :disabled="saving" @click="close"><AppIcon name="close" /></button>
          </div>

          <form class="mt-8 grid gap-5" novalidate @submit.prevent="submit">
            <div v-if="apiError" class="rounded-sm border border-[#aa746c]/30 bg-[#f2e4df] px-4 py-3 text-xs leading-5 text-[#7d443c]" role="alert">{{ apiError }}</div>
            <label v-for="(field, index) in fields" :key="field.key" class="admin-field">
              <span>{{ field.label }}</span>
              <select v-if="field.type === 'select'" :ref="(element) => { if (index === 0) firstField = element as HTMLSelectElement }" v-model="form[field.key]" :aria-invalid="Boolean(errors[field.key])">
                <option value="" disabled>Chọn {{ field.label.toLowerCase() }}</option>
                <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
              </select>
              <textarea v-else-if="field.type === 'textarea'" :ref="(element) => { if (index === 0) firstField = element as HTMLTextAreaElement }" v-model="form[field.key]" rows="4" :placeholder="field.placeholder" :aria-invalid="Boolean(errors[field.key])" />
              <div v-else-if="field.type === 'image'" class="grid gap-3">
                <div class="grid aspect-[16/9] place-items-center overflow-hidden rounded-sm border border-[#78816f]/20 bg-[#ebe7dd] text-[#788170]">
                  <img v-if="form[field.key] && !imageFailures[field.key]" :src="String(form[field.key])" alt="Xem trước hình ảnh sản phẩm" class="h-full w-full object-cover" @load="imageFailures[field.key] = false" @error="imageFailures[field.key] = true">
                  <span v-else class="flex items-center gap-2 text-[0.68rem] font-medium"><AppIcon name="image" :size="18" />{{ form[field.key] ? 'Không tải được ảnh' : 'Ảnh xem trước' }}</span>
                </div>
                <input v-model="form[field.key]" type="url" :placeholder="field.placeholder" :aria-invalid="Boolean(errors[field.key])" @input="imageFailures[field.key] = false">
              </div>
              <input v-else :ref="(element) => { if (index === 0) firstField = element as HTMLInputElement }" v-model="form[field.key]" :type="field.type ?? 'text'" :min="field.type === 'number' ? 0 : undefined" :step="field.type === 'number' ? 1 : undefined" :placeholder="field.placeholder" :aria-invalid="Boolean(errors[field.key])">
              <small v-if="field.helper" class="text-[#7d8379]">{{ field.helper }}</small>
              <small v-if="errors[field.key]" class="text-[#8b5148]">{{ errors[field.key] }}</small>
            </label>

            <div class="mt-3 flex flex-col-reverse gap-3 border-t border-[#78816f]/20 pt-6 sm:flex-row sm:justify-end">
              <AppButton label="Hủy" variant="secondary" :disabled="saving" @click="close" />
              <AppButton :label="saving ? 'Đang lưu…' : 'Lưu thông tin'" type="submit" icon="check" :disabled="saving" />
            </div>
          </form>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
