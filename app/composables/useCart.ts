import type { CartLine, Product } from '~/types'

const STORAGE_KEY = 'mien-spa-cart-v1'

export function useCart() {
  const lines = useState<CartLine[]>('store-cart-lines', () => [])
  const hydrated = useState('store-cart-hydrated', () => false)
  const persistenceReady = useState('store-cart-persistence-ready', () => false)

  function persist() {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.value))
  }

  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
      if (Array.isArray(parsed)) {
        lines.value = parsed
          .map(item => ({ productId: Number((item as CartLine).productId), quantity: Math.floor(Number((item as CartLine).quantity)) }))
          .filter(item => Number.isInteger(item.productId) && item.productId > 0 && Number.isInteger(item.quantity) && item.quantity > 0)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    hydrated.value = true
    if (!persistenceReady.value) {
      persistenceReady.value = true
      watch(lines, persist, { deep: true })
    }
  }

  onMounted(hydrate)

  const count = computed(() => lines.value.reduce((sum, item) => sum + item.quantity, 0))

  function add(product: Pick<Product, 'id' | 'stock'>, quantity = 1) {
    const requested = Math.max(1, Math.floor(quantity))
    const current = lines.value.find(item => item.productId === product.id)
    const nextQuantity = Math.min(product.stock, (current?.quantity ?? 0) + requested)
    if (nextQuantity <= 0) return false
    if (current) current.quantity = nextQuantity
    else lines.value.push({ productId: product.id, quantity: nextQuantity })
    persist()
    return true
  }

  function setQuantity(productId: number, quantity: number) {
    const item = lines.value.find(line => line.productId === productId)
    if (!item) return
    const normalized = Math.floor(quantity)
    if (normalized <= 0) remove(productId)
    else item.quantity = normalized
    persist()
  }

  function remove(productId: number) {
    lines.value = lines.value.filter(item => item.productId !== productId)
    persist()
  }

  function replace(nextLines: CartLine[]) {
    lines.value = nextLines
    persist()
  }

  function clear() {
    lines.value = []
    persist()
  }

  return { lines, count, hydrated, hydrate, add, setQuantity, remove, replace, clear }
}
