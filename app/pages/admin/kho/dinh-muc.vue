<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Định mức dịch vụ | MIÊN Admin' })

type Usage = { id?: number; productId: number; product?: string; sku?: string; quantity: number; note?: string | null }
type Service = { id: number; code: string; name: string; usages: Usage[] }
type Product = { id: number; name: string; sku: string; unit: string }
const { data: response, pending, error, refresh } = await useAsyncData('inventory-recipes', () => $fetch<{ data: { services: Service[]; products: Product[] } }>('/api/admin/inventory/recipes'))
const services = computed(() => response.value?.data.services ?? [])
const products = computed(() => response.value?.data.products ?? [])
const selectedId = ref<number | null>(null); const search = ref(''); const items = ref<Usage[]>([]); const saving = ref(false); const message = ref(''); const mutationError = ref('')
const filtered = computed(() => services.value.filter(service => `${service.name} ${service.code}`.toLowerCase().includes(search.value.toLowerCase())))
const selected = computed(() => services.value.find(service => service.id === selectedId.value) ?? null)
watch(services, rows => { if (!selectedId.value && rows[0]) select(rows[0]) }, { immediate: true })

function select(service: Service) { selectedId.value = service.id; items.value = service.usages.map(usage => ({ productId: usage.productId, quantity: usage.quantity, note: usage.note ?? '' })); message.value = ''; mutationError.value = '' }
function addItem() { items.value.push({ productId: products.value.find(product => !items.value.some(item => item.productId === product.id))?.id ?? 0, quantity: 1, note: '' }) }
function errorMessage(value: unknown) { const failure = value as { data?: { statusMessage?: string }; message?: string }; return failure.data?.statusMessage ?? failure.message ?? 'Không thể lưu định mức.' }
async function save() {
  if (!selected.value) return
  if (items.value.some(item => !item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) { mutationError.value = 'Vui lòng chọn sản phẩm và nhập lượng dùng lớn hơn 0.'; return }
  saving.value = true; mutationError.value = ''; message.value = ''
  try { await $fetch(`/api/admin/inventory/recipes/${selected.value.id}`, { method: 'PUT', body: { items: items.value } }); message.value = `Đã lưu định mức cho ${selected.value.name}.`; await refresh(); const current = services.value.find(service => service.id === selectedId.value); if (current) select(current); message.value = `Đã lưu định mức cho ${selected.value?.name ?? 'dịch vụ'}.` } catch (failure) { mutationError.value = errorMessage(failure) } finally { saving.value = false }
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="border-b border-[#78816f]/20 pb-8"><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Tiêu hao tự động</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Định mức dịch vụ</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Khai báo lượng vật tư cho một lần thực hiện. Khi lịch hẹn hoàn tất, hệ thống tự xuất theo lô gần hết hạn trước.</p></header>
    <div v-if="error" class="mt-6 border-l-2 border-[#9a6258] bg-[#f2e4df] px-4 py-3 text-xs text-[#7d443c]">Không thể tải danh sách định mức.</div>
    <div v-else class="mt-7 grid gap-7 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.5fr)]">
      <aside class="border-r-0 border-[#78816f]/20 lg:border-r lg:pr-7">
        <label class="admin-field"><span>Tìm dịch vụ</span><input v-model="search" placeholder="Tên hoặc mã dịch vụ"></label>
        <div v-if="pending" class="mt-5 grid gap-2"><span v-for="index in 5" :key="index" class="h-14 animate-pulse bg-[#e9e5da]" /></div>
        <div v-else class="mt-5 grid max-h-[620px] gap-1 overflow-y-auto">
          <button v-for="service in filtered" :key="service.id" type="button" class="grid grid-cols-[1fr_auto] items-center gap-4 rounded-sm px-4 py-3 text-left transition active:scale-[0.99]" :class="selectedId === service.id ? 'bg-[#dfe5da] text-[#35402f]' : 'hover:bg-[#ece8de]'" @click="select(service)"><span><strong class="block text-xs font-semibold">{{ service.name }}</strong><small class="mt-1 block text-[0.65rem] text-[#7a8176]">{{ service.code }}</small></span><span class="text-[0.65rem] tabular-nums text-[#667061]">{{ service.usages.length }} vật tư</span></button>
          <AdminEmptyState v-if="!filtered.length" title="Không tìm thấy dịch vụ" description="Thử một từ khóa khác." />
        </div>
      </aside>
      <main v-if="selected" class="min-w-0">
        <div class="flex flex-col gap-4 border-b border-[#78816f]/20 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-[0.63rem] uppercase tracking-[0.15em] text-[#7b8277]">{{ selected.code }}</p><h2 class="mt-2 text-xl font-semibold tracking-tight text-[#35402f]">{{ selected.name }}</h2></div><AppButton label="Thêm vật tư" icon="plus" variant="secondary" @click="addItem" /></div>
        <div v-if="message" class="mt-5 border-l-2 border-[#64735c] bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]">{{ message }}</div><div v-if="mutationError" class="mt-5 border-l-2 border-[#9a6258] bg-[#f2e4df] px-4 py-3 text-xs text-[#7d443c]">{{ mutationError }}</div>
        <div class="mt-6 grid gap-4">
          <div v-for="(item, index) in items" :key="index" class="grid gap-4 border-t border-[#78816f]/15 pt-4 first:border-0 first:pt-0 md:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1fr)_40px]">
            <label class="admin-field"><span>Sản phẩm</span><select v-model.number="item.productId"><option :value="0" disabled>Chọn vật tư</option><option v-for="product in products" :key="product.id" :value="product.id" :disabled="items.some((row, rowIndex) => rowIndex !== index && row.productId === product.id)">{{ product.name }} · {{ product.sku }}</option></select></label>
            <label class="admin-field"><span>Lượng / lần</span><input v-model.number="item.quantity" type="number" min="0.001" step="0.001"></label>
            <label class="admin-field"><span>Ghi chú</span><input v-model="item.note" placeholder="Ví dụ: dùng cho vùng mặt"></label>
            <button type="button" class="mt-5 grid size-10 place-items-center rounded-full text-[#8a5d54] transition hover:bg-[#ead8d3] active:scale-[0.96]" aria-label="Xóa vật tư" @click="items.splice(index, 1)"><AppIcon name="trash" :size="16" /></button>
          </div>
          <AdminEmptyState v-if="!items.length" title="Chưa có vật tư" description="Thêm sản phẩm và lượng dùng cho một lần thực hiện dịch vụ." />
        </div>
        <div class="mt-7 flex justify-end border-t border-[#78816f]/20 pt-6"><AppButton :label="saving ? 'Đang lưu…' : 'Lưu định mức'" icon="check" :disabled="saving" @click="save" /></div>
      </main>
    </div>
  </section>
</template>
