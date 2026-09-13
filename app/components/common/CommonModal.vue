<script setup lang="ts">
type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  size?: ModalSize
  closeLabel?: string
  closeOnBackdrop?: boolean
}>(), {
  description: '',
  size: 'md',
  closeLabel: 'Đóng',
  closeOnBackdrop: true,
})

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = useId()
let previousActiveElement: HTMLElement | null = null
let previousOverflow = ''

const sizeClass = computed(() => ({
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}[props.size]))

function close() { emit('close') }
function handleBackdrop() { if (props.closeOnBackdrop) close() }

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
  if (!focusable.length) {
    event.preventDefault()
    panel.value.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(() => props.open, async (open) => {
  if (!import.meta.client) return
  if (open) {
    previousActiveElement = document.activeElement as HTMLElement | null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeydown)
    await nextTick()
    const autofocusTarget = panel.value?.querySelector<HTMLElement>('[autofocus]')
    const firstControl = panel.value?.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]:not([tabindex="-1"])')
    ;(autofocusTarget ?? firstControl ?? panel.value)?.focus()
  } else {
    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', handleKeydown)
    previousActiveElement?.focus()
  }
}, { flush: 'post', immediate: true })

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="common-modal">
      <div v-if="open" class="fixed inset-0 z-[80] grid items-end p-0 sm:place-items-center sm:p-5" role="presentation">
        <button type="button" class="absolute inset-0 cursor-default bg-[#20271e]/55 backdrop-blur-[2px]" :aria-label="closeLabel" @click="handleBackdrop" />
        <section
          ref="panel"
          class="relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-[#f8f5ed] shadow-[0_28px_90px_rgba(26,33,24,0.3)] outline-none sm:max-h-[88dvh] sm:rounded-sm"
          :class="sizeClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
        >
          <header class="flex shrink-0 items-start justify-between gap-6 border-b border-[#78816f]/20 px-5 py-5 sm:px-7 sm:py-6">
            <div class="min-w-0">
              <div :id="titleId"><slot name="title"><h2 class="text-xl font-semibold tracking-[-0.025em] text-[#30392d]">{{ title }}</h2></slot></div>
              <p v-if="description" :id="descriptionId" class="mt-1.5 max-w-2xl text-xs leading-5 text-[#737a70]">{{ description }}</p>
            </div>
            <button type="button" class="grid size-9 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#53604e] transition hover:bg-[#e7e2d7] active:translate-y-px" :aria-label="closeLabel" @click="close"><AppIcon name="close" :size="16" /></button>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"><slot /></div>
          <footer v-if="$slots.footer" class="shrink-0 border-t border-[#78816f]/20 bg-[#f2eee4] px-5 py-4 sm:px-7"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.common-modal-enter-active,
.common-modal-leave-active { transition: opacity 180ms ease; }
.common-modal-enter-active section,
.common-modal-leave-active section { transition: transform 220ms ease, opacity 180ms ease; }
.common-modal-enter-from,
.common-modal-leave-to { opacity: 0; }
.common-modal-enter-from section,
.common-modal-leave-to section { opacity: 0; transform: translateY(18px) scale(0.985); }
</style>
