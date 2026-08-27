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

watch(() => [props.open, props.value] as const, () => {
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, props.value ?? {})
  Object.keys(errors).forEach((key) => delete errors[key])
}, { immediate: true, deep: true })

function submit() {
  Object.keys(errors).forEach((key) => delete errors[key])
  props.fields.forEach((field) => {
    if (field.required !== false && !String(form[field.key] ?? '').trim()) errors[field.key] = `Vui lòng nhập ${field.label.toLowerCase()}.`
  })
  if (Object.keys(errors).length) return
  emit('save', { ...form })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50" role="dialog" aria-modal="true" :aria-label="title">
        <button type="button" class="absolute inset-0 cursor-default bg-[#20271e]/45 backdrop-blur-[2px]" aria-label="Đóng" @click="emit('close')" />
        <aside class="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto bg-[#f6f3eb] px-6 py-7 shadow-[-24px_0_70px_rgba(38,45,34,0.14)] md:px-10 md:py-9">
          <div class="flex items-start justify-between gap-6 border-b border-[#78816f]/20 pb-7">
            <div>
              <p class="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#788170]">Thông tin quản lý</p>
              <h2 class="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#30392d]">{{ title }}</h2>
            </div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 transition hover:bg-[#e7e3d9]" aria-label="Đóng" @click="emit('close')"><AppIcon name="close" /></button>
          </div>

          <form class="mt-8 grid gap-5" novalidate @submit.prevent="submit">
            <div v-if="apiError" class="rounded-sm border border-[#aa746c]/30 bg-[#f2e4df] px-4 py-3 text-xs leading-5 text-[#7d443c]" role="alert">{{ apiError }}</div>
            <label v-for="field in fields" :key="field.key" class="admin-field">
              <span>{{ field.label }}</span>
              <select v-if="field.type === 'select'" v-model="form[field.key]" :aria-invalid="Boolean(errors[field.key])">
                <option value="" disabled>Chọn {{ field.label.toLowerCase() }}</option>
                <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
              </select>
              <textarea v-else-if="field.type === 'textarea'" v-model="form[field.key]" rows="4" :placeholder="field.placeholder" :aria-invalid="Boolean(errors[field.key])" />
              <input v-else v-model="form[field.key]" :type="field.type ?? 'text'" :placeholder="field.placeholder" :aria-invalid="Boolean(errors[field.key])">
              <small v-if="field.helper" class="text-[#7d8379]">{{ field.helper }}</small>
              <small v-if="errors[field.key]" class="text-[#8b5148]">{{ errors[field.key] }}</small>
            </label>

            <div class="mt-3 flex flex-col-reverse gap-3 border-t border-[#78816f]/20 pt-6 sm:flex-row sm:justify-end">
              <AppButton label="Hủy" variant="secondary" :disabled="saving" @click="emit('close')" />
              <AppButton :label="saving ? 'Đang lưu…' : 'Lưu thông tin'" type="submit" icon="check" :disabled="saving" />
            </div>
          </form>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
