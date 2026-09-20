<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type {
  CommonFormBreakpointValue,
  CommonFormChange,
  CommonFormCondition,
  CommonFormCustomFieldBindings,
  CommonFormField,
  CommonFormModel,
} from '~/types/common-form'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: CommonFormModel
  fields: CommonFormField[]
  columns?: CommonFormBreakpointValue
  errors?: Record<string, string | undefined>
  disabled?: boolean
  validateOn?: 'submit' | 'blur' | 'change'
}>(), {
  columns: 1,
  errors: () => ({}),
  disabled: false,
  validateOn: 'blur',
})

const emit = defineEmits<{
  'update:modelValue': [values: CommonFormModel]
  change: [change: CommonFormChange]
  submit: [values: CommonFormModel]
  invalid: [errors: Record<string, string>, values: CommonFormModel]
  'validation-change': [errors: Record<string, string>]
}>()

const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const internalErrors = ref<Record<string, string>>({})
const touched = ref(new Set<string>())
const submitted = ref(false)

function normalizeBreakpoint(value: CommonFormBreakpointValue | undefined, fallback = 1) {
  const source = typeof value === 'number' ? { base: value } : value ?? {}
  const base = clampGridValue(source.base ?? fallback)
  const sm = clampGridValue(source.sm ?? base)
  const md = clampGridValue(source.md ?? sm)
  const lg = clampGridValue(source.lg ?? md)
  return { base, sm, md, lg }
}

function clampGridValue(value: number) {
  return Math.min(12, Math.max(1, Math.round(value)))
}

const gridStyle = computed<CSSProperties>(() => {
  const value = normalizeBreakpoint(props.columns)
  return {
    '--common-form-columns': value.base,
    '--common-form-columns-sm': value.sm,
    '--common-form-columns-md': value.md,
    '--common-form-columns-lg': value.lg,
  } as CSSProperties
})

function fieldStyle(field: CommonFormField): CSSProperties {
  const value = normalizeBreakpoint(field.columns)
  return {
    '--common-form-span': value.base,
    '--common-form-span-sm': value.sm,
    '--common-form-span-md': value.md,
    '--common-form-span-lg': value.lg,
  } as CSSProperties
}

function resolveCondition(condition: CommonFormCondition | undefined, fallback = false, values = props.modelValue) {
  if (typeof condition === 'function') return condition(values)
  return condition ?? fallback
}

function isVisible(field: CommonFormField, values = props.modelValue) {
  if (field.showWhen !== undefined && !resolveCondition(field.showWhen, true, values)) return false
  return !resolveCondition(field.hiddenWhen, false, values)
}

function isDisabled(field: CommonFormField, values = props.modelValue) {
  return props.disabled || resolveCondition(field.disabled, false, values)
}

function isReadonly(field: CommonFormField, values = props.modelValue) {
  return resolveCondition(field.readonly, false, values)
}

function isRequired(field: CommonFormField, values = props.modelValue) {
  return resolveCondition(field.required, false, values)
}

const visibleFields = computed(() => props.fields.filter(field => isVisible(field)))
const fieldId = (field: CommonFormField) => `common-form-${instanceId}-${field.name}`
const radioOptionId = (field: CommonFormField, index: number) => {
  const firstFocusableIndex = field.options?.findIndex(option => !option.disabled) ?? 0
  return index === Math.max(firstFocusableIndex, 0) ? fieldId(field) : `${fieldId(field)}-${index}`
}
const messageId = (field: CommonFormField) => `${fieldId(field)}-message`
const fieldValue = (field: CommonFormField) => props.modelValue[field.name]
const fieldError = (field: CommonFormField) => props.errors[field.name] || internalErrors.value[field.name] || ''

function customFieldBindings(field: CommonFormField): CommonFormCustomFieldBindings {
  return {
    id: fieldId(field),
    name: field.name,
    disabled: isDisabled(field),
    readonly: isReadonly(field),
    required: isRequired(field),
    'aria-invalid': Boolean(fieldError(field)),
    'aria-describedby': messageId(field),
  }
}

function isBlank(value: unknown) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function validateField(field: CommonFormField, values = props.modelValue) {
  if (!isVisible(field, values) || isDisabled(field, values)) return ''
  const value = values[field.name]
  const messages = field.messages ?? {}

  if (isRequired(field, values) && (isBlank(value) || (field.type === 'checkbox' && value !== true))) {
    return messages.required ?? `Vui lòng nhập ${field.label?.toLocaleLowerCase('vi-VN') || 'trường này'}.`
  }
  if (isBlank(value)) return ''

  const stringValue = String(value)
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (field.min !== undefined) {
    const invalid = field.type === 'number' ? Number.isNaN(numericValue) || numericValue < field.min : stringValue.length < field.min
    if (invalid) return messages.min ?? (field.type === 'number' ? `Giá trị nhỏ nhất là ${field.min}.` : `Vui lòng nhập ít nhất ${field.min} ký tự.`)
  }
  if (field.max !== undefined) {
    const invalid = field.type === 'number' ? Number.isNaN(numericValue) || numericValue > field.max : stringValue.length > field.max
    if (invalid) return messages.max ?? (field.type === 'number' ? `Giá trị lớn nhất là ${field.max}.` : `Vui lòng nhập không quá ${field.max} ký tự.`)
  }
  if (field.minLength !== undefined && stringValue.length < field.minLength) return messages.minLength ?? `Vui lòng nhập ít nhất ${field.minLength} ký tự.`
  if (field.maxLength !== undefined && stringValue.length > field.maxLength) return messages.maxLength ?? `Vui lòng nhập không quá ${field.maxLength} ký tự.`

  const format = field.format ?? (field.type === 'email' ? 'email' : field.type === 'tel' ? 'phone' : undefined)
  if (format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) return messages.email ?? 'Email chưa đúng định dạng.'
  if (format === 'phone') {
    const normalizedPhone = stringValue.replace(/[\s.-]/g, '').replace(/^\+84/, '0')
    if (!/^0\d{9}$/.test(normalizedPhone)) return messages.phone ?? 'Số điện thoại chưa đúng định dạng.'
  }

  if (field.pattern) {
    const expression = typeof field.pattern === 'string' ? new RegExp(field.pattern) : field.pattern
    expression.lastIndex = 0
    if (!expression.test(stringValue)) return messages.pattern ?? 'Thông tin chưa đúng định dạng.'
  }

  const customResult = field.validate?.(value, values)
  if (typeof customResult === 'string') return customResult
  if (customResult === false) return messages.custom ?? 'Thông tin chưa hợp lệ.'
  return ''
}

function setInternalError(name: string, message: string) {
  const next = { ...internalErrors.value }
  if (message) next[name] = message
  else delete next[name]
  internalErrors.value = next
  emit('validation-change', { ...next })
}

function validateTouchedFields(values: CommonFormModel) {
  const next = { ...internalErrors.value }
  for (const candidate of props.fields) {
    if (!touched.value.has(candidate.name) && !internalErrors.value[candidate.name]) continue
    const message = validateField(candidate, values)
    if (message) next[candidate.name] = message
    else delete next[candidate.name]
  }
  internalErrors.value = next
  emit('validation-change', { ...next })
}

function updateSelectField(field: CommonFormField, value: unknown) {
  const option = field.options?.find(candidate => String(candidate.value) === String(value))
  updateField(field, option ? option.value : value)
}

function updateField(field: CommonFormField, value: unknown) {
  const values = { ...props.modelValue, [field.name]: value }
  emit('update:modelValue', values)
  emit('change', { name: field.name, value, values })
  if (props.validateOn === 'change' || submitted.value) {
    validate(values)
  } else if (touched.value.size > 0 || Object.keys(internalErrors.value).length > 0) {
    validateTouchedFields(values)
  }
}

function handleBlur(field: CommonFormField) {
  touched.value.add(field.name)
  if (props.validateOn === 'blur') setInternalError(field.name, validateField(field))
}

function validate(values = props.modelValue) {
  const errors: Record<string, string> = {}
  for (const field of props.fields) {
    const message = validateField(field, values)
    if (message) errors[field.name] = message
  }
  internalErrors.value = errors
  emit('validation-change', { ...errors })
  return { valid: Object.keys(errors).length === 0, errors }
}

function resetValidation() {
  submitted.value = false
  touched.value = new Set()
  internalErrors.value = {}
  emit('validation-change', {})
}

function handleSubmit() {
  submitted.value = true
  const values = { ...props.modelValue }
  const result = validate(values)
  if (!result.valid) {
    emit('invalid', result.errors, values)
    nextTick(() => document.getElementById(fieldId(props.fields.find(field => result.errors[field.name])!))?.focus())
    return
  }
  emit('submit', values)
}

function applyDefaults() {
  const values = { ...props.modelValue }
  let changed = false
  for (const field of props.fields) {
    if ((field.name in values && values[field.name] !== undefined) || field.defaultValue === undefined) continue
    values[field.name] = typeof field.defaultValue === 'function' ? field.defaultValue(values) : field.defaultValue
    changed = true
  }
  if (changed) emit('update:modelValue', values)
}

onMounted(applyDefaults)
watch(() => props.fields, applyDefaults, { deep: true })

defineExpose({ validate, resetValidation })
</script>

<template>
  <form v-bind="$attrs" novalidate @submit.prevent="handleSubmit">
    <slot />
    <div class="common-form__grid" :class="{ 'common-form__grid--after-content': Boolean($slots.default) }" :style="gridStyle">
      <div
        v-for="field in visibleFields"
        :key="field.name"
        class="common-form__field"
        :class="field.fieldClass"
        :style="fieldStyle(field)"
      >
        <template v-if="field.type === 'checkbox'">
          <label class="common-form__choice-label" :for="fieldId(field)">
            <CommonInput
              :id="fieldId(field)"
              type="checkbox"
              :model-value="Boolean(fieldValue(field))"
              :disabled="isDisabled(field) || isReadonly(field)"
              :aria-readonly="isReadonly(field) || undefined"
              :aria-required="isRequired(field) || undefined"
              :aria-invalid="Boolean(fieldError(field))"
              :aria-describedby="messageId(field)"
              :class="['common-form__checkbox', field.inputClass]"
              v-bind="field.attrs"
              @update:model-value="updateField(field, $event)"
              @blur="handleBlur(field)"
            />
            <span>
              {{ field.label }}<span v-if="isRequired(field)" class="common-form__required" aria-hidden="true"> *</span>
            </span>
          </label>
        </template>

        <fieldset v-else-if="field.type === 'radio'" class="min-w-0" :aria-describedby="messageId(field)">
          <legend v-if="field.label" class="common-form__label">
            {{ field.label }}<span v-if="isRequired(field)" class="common-form__required" aria-hidden="true"> *</span>
          </legend>
          <div class="common-form__choices" :class="field.choiceLayout === 'row' ? 'common-form__choices--row' : ''">
            <label v-for="(option, optionIndex) in field.options ?? []" :key="`${String(option.value)}-${optionIndex}`" class="common-form__choice-label" :for="radioOptionId(field, optionIndex)">
              <CommonInput
                :id="radioOptionId(field, optionIndex)"
                type="radio"
                :name="field.name"
                :value="option.value"
                :model-value="fieldValue(field) as string | number | boolean | null | undefined"
                :disabled="isDisabled(field) || isReadonly(field) || option.disabled"
                :aria-readonly="isReadonly(field) || undefined"
                :aria-required="isRequired(field) || undefined"
                :aria-invalid="Boolean(fieldError(field))"
                :aria-describedby="messageId(field)"
                :class="['common-form__radio', field.inputClass]"
                v-bind="field.attrs"
                @update:model-value="updateField(field, option.value)"
                @blur="handleBlur(field)"
              />
              <span>{{ option.label }}<small v-if="option.hint">{{ option.hint }}</small></span>
            </label>
          </div>
        </fieldset>

        <template v-else>
          <label v-if="field.label" class="common-form__label" :for="fieldId(field)">
            {{ field.label }}<span v-if="isRequired(field)" class="common-form__required" aria-hidden="true"> *</span>
          </label>
          <slot
            :name="`field-${field.name}`"
            :field="field"
            :value="fieldValue(field)"
            :values="modelValue"
            :error="fieldError(field)"
            :input-attrs="customFieldBindings(field)"
            :update="(value: unknown) => updateField(field, value)"
            :handle-blur="() => handleBlur(field)"
          >
            <CommonSelect
              v-if="field.type === 'select'"
              :id="fieldId(field)"
              :model-value="fieldValue(field) as string | number | null | undefined"
              :disabled="isDisabled(field) || isReadonly(field)"
              :required="isRequired(field)"
              :aria-readonly="isReadonly(field) || undefined"
              :aria-invalid="Boolean(fieldError(field))"
              :aria-describedby="messageId(field)"
              :class="field.inputClass"
              v-bind="field.attrs"
              @update:model-value="updateSelectField(field, $event)"
              @blur="handleBlur(field)"
            >
              <option v-if="field.placeholder" value="" :disabled="isRequired(field)">{{ field.placeholder }}</option>
              <option v-for="option in field.options ?? []" :key="String(option.value)" :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
            </CommonSelect>

            <CommonTextarea
              v-else-if="field.type === 'textarea'"
              :id="fieldId(field)"
              :model-value="fieldValue(field) as string | number | null | undefined"
              :placeholder="field.placeholder"
              :rows="field.rows ?? 4"
              :disabled="isDisabled(field)"
              :readonly="isReadonly(field)"
              :required="isRequired(field)"
              :aria-invalid="Boolean(fieldError(field))"
              :aria-describedby="messageId(field)"
              :class="field.inputClass"
              v-bind="field.attrs"
              @update:model-value="updateField(field, $event)"
              @blur="handleBlur(field)"
            />

            <CommonDatePicker
              v-else-if="field.type === 'date' || field.type === 'datepicker'"
              :id="fieldId(field)"
              :model-value="String(fieldValue(field) ?? '')"
              :placeholder="field.placeholder"
              :disabled="isDisabled(field) || isReadonly(field)"
              :invalid="Boolean(fieldError(field))"
              :aria-readonly="isReadonly(field) || undefined"
              :aria-required="isRequired(field) || undefined"
              :aria-describedby="messageId(field)"
              :class="field.inputClass"
              v-bind="field.attrs"
              @update:model-value="updateField(field, $event)"
              @blur="handleBlur(field)"
            />

            <component
              :is="field.component"
              v-else-if="field.type === 'custom' && field.component"
              :id="fieldId(field)"
              :model-value="fieldValue(field)"
              :disabled="isDisabled(field)"
              :readonly="isReadonly(field)"
              :required="isRequired(field)"
              :aria-invalid="Boolean(fieldError(field))"
              :aria-describedby="messageId(field)"
              :class="field.inputClass"
              v-bind="field.attrs"
              @update:model-value="updateField(field, $event)"
              @blur="handleBlur(field)"
            />

            <CommonInput
              v-else
              :id="fieldId(field)"
              :model-value="fieldValue(field) as string | number | boolean | null | undefined"
              :model-modifiers="{ number: field.type === 'number' }"
              :type="field.type || 'text'"
              :placeholder="field.placeholder"
              :disabled="isDisabled(field)"
              :readonly="isReadonly(field)"
              :min="field.type === 'number' ? field.min : undefined"
              :max="field.type === 'number' ? field.max : undefined"
              :minlength="field.minLength ?? (field.type !== 'number' ? field.min : undefined)"
              :maxlength="field.maxLength ?? (field.type !== 'number' ? field.max : undefined)"
              :required="isRequired(field)"
              :aria-invalid="Boolean(fieldError(field))"
              :aria-describedby="messageId(field)"
              :class="field.inputClass"
              v-bind="field.attrs"
              @update:model-value="updateField(field, $event)"
              @blur="handleBlur(field)"
            />
          </slot>
        </template>

        <div :id="messageId(field)" class="common-form__message" aria-live="polite">
          <span v-if="fieldError(field)" class="common-form__error">{{ fieldError(field) }}</span>
          <span v-else-if="field.hint" class="common-form__hint">{{ field.hint }}</span>
          <span v-else aria-hidden="true">&nbsp;</span>
        </div>
      </div>
    </div>

    <slot name="messages" />
    <slot name="actions" />
  </form>
</template>

<style scoped>
.common-form__grid {
  display: grid;
  grid-template-columns: repeat(var(--common-form-columns), minmax(0, 1fr));
  gap: 1.25rem;
}

.common-form__grid--after-content { margin-top: 1.75rem; }

.common-form__field {
  display: grid;
  min-width: 0;
  align-content: start;
  grid-column: span var(--common-form-span);
  gap: 0.55rem;
}

.common-form__label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #4d5548;
}

.common-form__field :deep(.common-field:not([type="checkbox"]):not([type="radio"])) {
  width: 100%;
  border: 1px solid rgba(89, 102, 80, 0.3);
  border-radius: 0.3rem;
  background: rgba(255, 253, 247, 0.52);
  padding: 0.9rem 1rem;
  color: #30382c;
  font-size: 0.86rem;
  font-weight: 400;
  letter-spacing: 0;
  transition: border-color 250ms ease, background-color 250ms ease;
}

.common-form__field :deep(textarea.common-field) { resize: vertical; }

.common-form__field :deep(.common-field:not([type="checkbox"]):not([type="radio"]):focus) {
  border-color: #596650;
  background: #fbf8f0;
  outline: none;
}

.common-form__field :deep(.common-field[aria-invalid="true"]) { border-color: #9b6056; }
.common-form__field :deep(.common-field:disabled) { cursor: not-allowed; opacity: 0.62; }

.common-form__required,
.common-form__error {
  color: #8b5148;
}

.common-form__message {
  min-height: 1.25rem;
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.25rem;
}

.common-form__hint { color: #7c8278; }

.common-form__choice-label {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  color: #4d5548;
  font-size: 0.76rem;
  font-weight: 500;
  line-height: 1.5rem;
}

.common-form__choice-label small {
  display: block;
  color: #7c8278;
  font-size: 0.65rem;
  font-weight: 400;
}

.common-form__checkbox,
.common-form__radio {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  margin-top: 0.25rem;
  accent-color: #4c5d43;
}

.common-form__choices {
  display: grid;
  gap: 0.65rem;
}

.common-form__choices--row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}

@media (min-width: 640px) {
  .common-form__grid { grid-template-columns: repeat(var(--common-form-columns-sm), minmax(0, 1fr)); }
  .common-form__field { grid-column: span var(--common-form-span-sm); }
}

@media (min-width: 768px) {
  .common-form__grid { grid-template-columns: repeat(var(--common-form-columns-md), minmax(0, 1fr)); }
  .common-form__field { grid-column: span var(--common-form-span-md); }
}

@media (min-width: 1024px) {
  .common-form__grid { grid-template-columns: repeat(var(--common-form-columns-lg), minmax(0, 1fr)); }
  .common-form__field { grid-column: span var(--common-form-span-lg); }
}
</style>
