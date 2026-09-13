<script setup lang="ts">
export type CommonTabItem = {
  id: string
  label: string
  disabled?: boolean
  panelId?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  items: CommonTabItem[]
  ariaLabel?: string
}>(), {
  ariaLabel: 'Chuyển nội dung',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null)
const componentId = useId()
const activeIndex = computed(() => Math.max(0, props.items.findIndex(item => item.id === props.modelValue)))
const indicatorStyle = computed(() => ({
  width: `${100 / Math.max(props.items.length, 1)}%`,
  transform: `translateX(${activeIndex.value * 100}%)`,
}))

function tabId(index: number) {
  return componentId + '-tab-' + index
}

function select(item: CommonTabItem) {
  if (!item.disabled) emit('update:modelValue', item.id)
}

function moveFocus(event: KeyboardEvent, currentIndex: number) {
  const enabled = props.items
    .map((item, index) => ({ item, index }))
    .filter(entry => !entry.item.disabled)
  if (!enabled.length) return

  const currentPosition = enabled.findIndex(entry => entry.index === currentIndex)
  let nextPosition = currentPosition
  if (event.key === 'ArrowRight') nextPosition = (currentPosition + 1) % enabled.length
  else if (event.key === 'ArrowLeft') nextPosition = (currentPosition - 1 + enabled.length) % enabled.length
  else if (event.key === 'Home') nextPosition = 0
  else if (event.key === 'End') nextPosition = enabled.length - 1
  else return

  event.preventDefault()
  const next = enabled[nextPosition]
  if (!next) return
  select(next.item)
  nextTick(() => root.value?.querySelector<HTMLElement>('#' + CSS.escape(tabId(next.index)))?.focus())
}
</script>

<template>
  <div
    ref="root"
    class="common-tabs max-w-full overflow-x-auto rounded-lg border border-[#78816f]/25 bg-[#efebe1] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <div class="relative flex min-w-[292px] items-stretch">
      <span
        class="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-[#fffcf6] shadow-[0_2px_8px_rgba(52,64,47,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        :style="indicatorStyle"
        aria-hidden="true"
      />
      <button
        v-for="(item, index) in items"
        :id="tabId(index)"
        :key="item.id"
        type="button"
        role="tab"
        class="relative z-[1] flex min-h-9 flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-[0.66rem] font-semibold transition-[color,transform] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#75866b] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        :class="modelValue === item.id ? 'text-[#34402f]' : 'text-[#727a6f] hover:text-[#4f5b49]'"
        :aria-selected="modelValue === item.id"
        :aria-controls="item.panelId"
        :tabindex="modelValue === item.id ? 0 : -1"
        :disabled="item.disabled"
        @click="select(item)"
        @keydown="moveFocus($event, index)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
