<script setup lang="ts">
import type { CartProduct } from '~/types'
import { formatPrice } from '~/utils/currency'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const { lines, count, hydrate, remove } = useCart()
const products = ref<CartProduct[]>([])
const pending = ref(false)
const errorMessage = ref('')
const subtotal = computed(() => products.value.reduce((total, product) => total + product.price * product.requestedQuantity, 0))
let requestId = 0

function setOpen(value: boolean) {
  emit('update:open', value)
}

function toggle() {
  setOpen(!props.open)
}

function focusFirstItem() {
  setOpen(true)
  nextTick(() => root.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
}

function handleDocumentPointer(event: PointerEvent) {
  if (props.open && root.value && !root.value.contains(event.target as Node)) setOpen(false)
}

function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (props.open && (!(next instanceof Node) || !root.value?.contains(next))) setOpen(false)
}

function closeWithKeyboard() {
  setOpen(false)
  nextTick(() => trigger.value?.focus())
}

async function syncProducts() {
  const request = ++requestId
  if (!lines.value.length) {
    products.value = []
    errorMessage.value = ''
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: CartProduct[] }>('/api/cart/validate', { method: 'POST', body: { items: lines.value } })
    if (request === requestId) products.value = response.data.filter(product => Number.isInteger(product.id))
  } catch (error) {
    if (request === requestId) {
      const failure = error as { data?: { statusMessage?: string }; statusMessage?: string }
      errorMessage.value = failure.data?.statusMessage ?? failure.statusMessage ?? 'Chưa thể cập nhật giỏ hàng.'
    }
  } finally {
    if (request === requestId) pending.value = false
  }
}

function removeProduct(productId: number) {
  products.value = products.value.filter(product => product.id !== productId)
  remove(productId)
}

watch(lines, () => {
  if (props.open) void syncProducts()
}, { deep: true })
watch(() => props.open, (open) => {
  if (open) void syncProducts()
})

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointer)
  hydrate()
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointer))
</script>

<template>
  <div ref="root" class="relative" @focusout="handleFocusOut" @keydown.esc.stop.prevent="closeWithKeyboard">
    <button
      ref="trigger"
      type="button"
      class="relative grid size-10 place-items-center rounded-full border border-[#596650]/35 text-[#3f493a] transition hover:bg-[#e5e0d5] active:scale-[0.98]"
      aria-haspopup="menu"
      aria-controls="site-cart-menu"
      :aria-expanded="open"
      :aria-label="`Mở giỏ hàng, ${count} sản phẩm`"
      @click="toggle"
      @keydown.down.prevent="focusFirstItem"
    >
      <AppIcon name="cart" :size="18" />
      <span v-if="count" class="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#4c5d43] px-1 text-[0.6rem] font-semibold text-[#f7f2e8]" aria-live="polite">{{ count > 99 ? '99+' : count }}</span>
    </button>

    <Transition name="header-popover">
      <div v-if="open" id="site-cart-menu" class="fixed left-4 right-4 top-[5.1rem] z-40 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[25rem] sm:pt-3" role="menu" aria-label="Giỏ hàng nhanh">
        <div class="overflow-hidden rounded-lg border border-[#78816f]/20 bg-[#f8f4ea] shadow-[0_22px_60px_rgba(42,52,38,0.2)]">
          <div class="flex items-center justify-between border-b border-[#78816f]/15 px-5 py-4">
            <div><p class="text-sm font-semibold text-[#35402f]">Giỏ hàng</p><p class="mt-0.5 text-[0.66rem] text-[#777f74]">{{ count }} sản phẩm</p></div>
            <button type="button" class="grid size-8 place-items-center rounded-full transition hover:bg-[#e5e0d5]" aria-label="Đóng giỏ hàng" @click="setOpen(false)"><AppIcon name="close" :size="15" /></button>
          </div>

          <div v-if="pending && !products.length" class="grid gap-3 p-5" role="status" aria-label="Đang cập nhật giỏ hàng">
            <div v-for="index in 2" :key="index" class="grid grid-cols-[58px_1fr] gap-3"><span class="aspect-square animate-pulse rounded bg-[#e2ddd1]" /><span class="my-2 animate-pulse rounded bg-[#e2ddd1]" /></div>
          </div>
          <div v-else-if="errorMessage" class="p-6 text-center">
            <p class="text-xs leading-5 text-[#8b5148]" role="alert">{{ errorMessage }}</p>
            <button type="button" class="text-link mt-3" @click="syncProducts">Thử lại</button>
          </div>
          <div v-else-if="!lines.length" class="px-6 py-9 text-center">
            <span class="mx-auto grid size-11 place-items-center rounded-full bg-[#e8e4d9] text-[#61705a]"><AppIcon name="cart" :size="19" /></span>
            <p class="mt-4 font-display text-2xl font-light">Giỏ hàng đang trống.</p>
            <p class="mt-2 text-[0.68rem] leading-5 text-[#747b70]">Chọn một món chăm sóc để tiếp tục nghi thức tại nhà.</p>
            <NuxtLink to="/san-pham" class="text-link mt-4 inline-block" role="menuitem" @click="setOpen(false)">Xem sản phẩm</NuxtLink>
          </div>
          <template v-else>
            <div class="max-h-[min(50vh,25rem)] divide-y divide-[#78816f]/15 overflow-y-auto overscroll-contain px-5">
              <article v-for="product in products" :key="product.id" class="grid grid-cols-[58px_1fr_auto] gap-3 py-4">
                <NuxtLink :to="`/san-pham/${product.slug}`" class="aspect-square overflow-hidden rounded bg-[#e2ddd1]" role="menuitem" @click="setOpen(false)"><img :src="product.image" :alt="product.name" class="h-full w-full scale-[1.28] object-cover" :style="{ objectPosition: product.imagePosition }"></NuxtLink>
                <div class="min-w-0">
                  <NuxtLink :to="`/san-pham/${product.slug}`" class="line-clamp-2 text-xs font-semibold leading-5 text-[#374232]" role="menuitem" @click="setOpen(false)">{{ product.name }}</NuxtLink>
                  <p class="mt-1 text-[0.65rem] text-[#737a70]">{{ product.requestedQuantity }} × {{ formatPrice(product.price) }}</p>
                  <p v-if="product.message" class="mt-1 text-[0.62rem] text-[#8b5148]">{{ product.message }}</p>
                </div>
                <div class="flex flex-col items-end justify-between gap-2">
                  <strong class="whitespace-nowrap text-[0.68rem] tabular-nums text-[#3d4937]">{{ formatPrice(product.price * product.requestedQuantity) }}</strong>
                  <button type="button" class="grid size-8 place-items-center rounded-full text-[#83574f] transition hover:bg-[#eee1dc]" :aria-label="`Xóa ${product.name} khỏi giỏ`" role="menuitem" @click="removeProduct(product.id)"><AppIcon name="trash" :size="14" /></button>
                </div>
              </article>
            </div>
            <div class="border-t border-[#78816f]/15 bg-[#efebe1] px-5 py-4">
              <div class="flex items-center justify-between text-xs"><span>Tổng {{ count }} sản phẩm</span><strong class="text-sm tabular-nums">{{ formatPrice(subtotal) }}</strong></div>
              <NuxtLink to="/gio-hang" class="button-primary mt-4 w-full justify-center" role="menuitem" @click="setOpen(false)">Xem giỏ hàng <AppIcon name="arrow" :size="15" /></NuxtLink>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.header-popover-enter-active,
.header-popover-leave-active { transition: opacity 160ms ease, transform 240ms cubic-bezier(0.16, 1, 0.3, 1); }
.header-popover-enter-from,
.header-popover-leave-to { opacity: 0; transform: translateY(-5px) scale(0.985); }
</style>
