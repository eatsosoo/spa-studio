<script setup lang="ts">
defineOptions({ inheritAttrs: false })

type ModelValue = string | number | null | undefined

const props = withDefaults(defineProps<{
  modelValue?: ModelValue
  modelModifiers?: { number?: boolean }
}>(), {
  modelValue: undefined,
  modelModifiers: () => ({}),
})

const emit = defineEmits<{ 'update:modelValue': [value: ModelValue] }>()
const element = ref<HTMLSelectElement | null>(null)
const attrs = useAttrs()
const effectiveValue = computed(() => props.modelValue === undefined ? attrs.value as ModelValue : props.modelValue)

function update(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!props.modelModifiers.number) emit('update:modelValue', value)
  else {
    const number = Number.parseFloat(value)
    emit('update:modelValue', Number.isNaN(number) ? value : number)
  }
}

function focus(options?: FocusOptions) { element.value?.focus(options) }
defineExpose({ element, focus })
</script>

<template>
  <select ref="element" class="common-field" v-bind="$attrs" :value="effectiveValue ?? ''" @change="update">
    <slot />
  </select>
</template>
