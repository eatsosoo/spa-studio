<script setup lang="ts">
defineOptions({ inheritAttrs: false })

type ModelValue = string | number | boolean | null | undefined

const props = withDefaults(defineProps<{
  modelValue?: ModelValue
  modelModifiers?: { trim?: boolean; number?: boolean }
}>(), {
  modelValue: undefined,
  modelModifiers: () => ({}),
})

const emit = defineEmits<{ 'update:modelValue': [value: ModelValue] }>()
const attrs = useAttrs()
const element = ref<HTMLInputElement | null>(null)
const inputType = computed(() => String(attrs.type ?? 'text'))
const effectiveValue = computed(() => props.modelValue === undefined ? attrs.value as ModelValue : props.modelValue)
const inputValue = computed(() => inputType.value === 'file' ? undefined : inputType.value === 'checkbox' || inputType.value === 'radio' ? attrs.value : effectiveValue.value)
const checked = computed(() => {
  if (inputType.value === 'checkbox') return Boolean(effectiveValue.value)
  if (inputType.value === 'radio') return String(effectiveValue.value ?? '') === String(attrs.value ?? '')
  return undefined
})

function normalize(value: string): string | number {
  const trimmed = props.modelModifiers.trim ? value.trim() : value
  if (!props.modelModifiers.number) return trimmed
  const number = Number.parseFloat(trimmed)
  return Number.isNaN(number) ? trimmed : number
}

function update(event: Event) {
  const target = event.target as HTMLInputElement
  if (inputType.value === 'checkbox') emit('update:modelValue', target.checked)
  else if (inputType.value === 'radio') {
    if (target.checked) emit('update:modelValue', normalize(target.value))
  } else if (inputType.value !== 'file') emit('update:modelValue', normalize(target.value))
}

function focus(options?: FocusOptions) { element.value?.focus(options) }
function click() { element.value?.click() }

defineExpose({ element, focus, click })
</script>

<template>
  <input
    ref="element"
    v-bind="$attrs"
    :value="inputValue"
    :checked="checked"
    @input="update"
  >
</template>
