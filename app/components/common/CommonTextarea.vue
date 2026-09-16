<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  modelModifiers?: { trim?: boolean; number?: boolean }
  showOutline?: boolean
}>(), {
  modelValue: undefined,
  modelModifiers: () => ({}),
  showOutline: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
const element = ref<HTMLTextAreaElement | null>(null)
const attrs = useAttrs()
const effectiveValue = computed(() => props.modelValue === undefined ? attrs.value as string | number | null | undefined : props.modelValue)

function update(event: Event) {
  let value: string | number = (event.target as HTMLTextAreaElement).value
  if (props.modelModifiers.trim) value = value.trim()
  if (props.modelModifiers.number) {
    const number = Number.parseFloat(value)
    if (!Number.isNaN(number)) value = number
  }
  emit('update:modelValue', value)
}

function focus(options?: FocusOptions) { element.value?.focus(options) }
defineExpose({ element, focus })
</script>

<template>
  <textarea
    ref="element"
    class="common-field"
    v-bind="$attrs"
    :value="effectiveValue ?? ''"
    :style="showOutline ? undefined : { outline: 'none' }"
    @input="update"
  />
</template>
