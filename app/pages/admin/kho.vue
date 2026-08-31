<script setup lang="ts">
import type { AdminColumn, AdminRow } from '~/types'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Quản lý kho | MIÊN Admin' })

type Stock = { productId: number; product: string; sku: string; locationId: number | null; location: string; quantity: number; reserved: number; available: number; minimum: number }
type InventoryDocument = { id: number; reference: string; type: 'receipt' | 'adjustment' | 'transfer' | 'return'; status: 'draft' | 'posted' | 'cancelled'; occurredAt: string; sourceLocation: string; destinationLocation: string; supplierName: string | null; invoiceNumber: string | null; itemCount: number; totalQuantity: number }
type InventoryTransaction = { id: number; product: string; sku: string; location: string; lot: string; type: string; quantityDelta: number; quantityAfter: number; note: string | null; createdAt: string }
type InventoryLot = { id: number; product: string; sku: string; location: string; batchNumber: string; receivedAt: string; expiryDate: string | null; quantity: number; reserved: number; available: number; unitCost: number; stockValue: number; expiryState: 'none' | 'expired' | 'soon' | 'good'; status: string }
type InventoryWorkspace = { stocks: Stock[]; documents: InventoryDocument[]; transactions: InventoryTransaction[]; lots: InventoryLot[]; alerts: { lowStock: number; expiring: number; expired: number; drafts: number }; reports: { movement: Array<{ day: string; incoming: number; outgoing: number }>; inventoryValue: number }; options: { products: Array<{ id: number; name: string; sku: string }>; locations: Array<{ id: number; name: string; code: string }>; orders: Array<{ id: number; reference: string }> } }

const route = useRoute()
const router = useRouter()
type View = 'stocks' | 'documents' | 'transactions' | 'lots'
const activeView = ref<View>(['documents', 'transactions', 'lots'].includes(String(route.query.view)) ? route.query.view as View : 'stocks')
watch(() => route.query.view, value => { activeView.value = ['documents', 'transactions', 'lots'].includes(String(value)) ? value as View : 'stocks' })
function setView(view: View) { router.replace({ query: view === 'stocks' ? {} : { view } }) }
const drawerOpen = ref(false)
const saving = ref(false)
const postingId = ref<number | null>(null)
const cancellingId = ref<number | null>(null)
const mutationError = ref('')
const successMessage = ref('')
const { data: response, pending, error, refresh } = await useAsyncData('admin-inventory', () => $fetch<{ data: InventoryWorkspace }>('/api/admin/inventory'))
const workspace = computed<InventoryWorkspace>(() => response.value?.data ?? { stocks: [], documents: [], transactions: [], lots: [], alerts: { lowStock: 0, expiring: 0, expired: 0, drafts: 0 }, reports: { movement: [], inventoryValue: 0 }, options: { products: [], locations: [], orders: [] } })

const stockColumns: AdminColumn[] = [
  { key: 'product', label: 'Sản phẩm' }, { key: 'sku', label: 'SKU' }, { key: 'location', label: 'Kho' },
  { key: 'quantity', label: 'Tồn thực tế', type: 'number', align: 'right' }, { key: 'reserved', label: 'Đã giữ', type: 'number', align: 'right' }, { key: 'available', label: 'Khả dụng', type: 'number', align: 'right' },
]
const transactionColumns: AdminColumn[] = [
  { key: 'createdAt', label: 'Thời điểm', type: 'date' }, { key: 'product', label: 'Sản phẩm' }, { key: 'lot', label: 'Lô' }, { key: 'location', label: 'Kho' }, { key: 'typeLabel', label: 'Nghiệp vụ' },
  { key: 'quantityDelta', label: 'Biến động', type: 'number', align: 'right' }, { key: 'quantityAfter', label: 'Sau giao dịch', type: 'number', align: 'right' },
]
const lotColumns: AdminColumn[] = [
  { key: 'product', label: 'Sản phẩm' }, { key: 'batchNumber', label: 'Số lô' }, { key: 'location', label: 'Kho' }, { key: 'expiryDate', label: 'Hạn dùng', type: 'date' }, { key: 'available', label: 'Khả dụng', type: 'number', align: 'right' }, { key: 'unitCost', label: 'Giá vốn', type: 'money', align: 'right' }, { key: 'expiryLabel', label: 'Tình trạng', type: 'status' },
]
const documentColumns: AdminColumn[] = [
  { key: 'reference', label: 'Mã chứng từ' }, { key: 'occurredAt', label: 'Thời điểm', type: 'date' }, { key: 'typeLabel', label: 'Nghiệp vụ' },
  { key: 'movement', label: 'Luân chuyển' }, { key: 'itemCount', label: 'Số dòng', type: 'number', align: 'right' }, { key: 'totalQuantity', label: 'Tổng lượng', type: 'number', align: 'right' }, { key: 'status', label: 'Trạng thái', type: 'status' },
]
const transactionLabels: Record<string, string> = { opening: 'Tồn đầu kỳ', purchase: 'Nhập kho', sale: 'Bán hàng', service_usage: 'Dùng cho dịch vụ', adjustment: 'Điều chỉnh', transfer_in: 'Nhận điều chuyển', transfer_out: 'Xuất điều chuyển', return: 'Hàng trả lại' }
const documentLabels = { receipt: 'Nhập kho', adjustment: 'Điều chỉnh', transfer: 'Điều chuyển', return: 'Khách trả hàng' } as const
const statusLabels = { draft: 'Bản nháp', posted: 'Đã ghi sổ', cancelled: 'Đã hủy' } as const
const stockRows = computed<AdminRow[]>(() => workspace.value.stocks.map(row => ({ id: `${row.productId}-${row.locationId ?? 0}`, product: row.product, sku: row.sku, location: row.location, quantity: row.quantity, reserved: row.reserved, available: row.available })))
const transactionRows = computed<AdminRow[]>(() => workspace.value.transactions.map(row => ({ id: row.id, createdAt: row.createdAt, product: row.product, lot: row.lot, location: row.location, typeLabel: transactionLabels[row.type] ?? row.type, quantityDelta: row.quantityDelta, quantityAfter: row.quantityAfter })))
const documentRows = computed<AdminRow[]>(() => workspace.value.documents.map(document => ({ id: document.id, reference: document.reference, occurredAt: document.occurredAt, typeLabel: documentLabels[document.type], movement: document.type === 'transfer' ? `${document.sourceLocation} → ${document.destinationLocation}` : document.destinationLocation, itemCount: document.itemCount, totalQuantity: document.totalQuantity, status: statusLabels[document.status] })))
const lotRows = computed<AdminRow[]>(() => workspace.value.lots.map(lot => ({ id: lot.id, product: lot.product, batchNumber: lot.batchNumber, location: lot.location, expiryDate: lot.expiryDate ?? 'Không hạn dùng', available: lot.available, unitCost: lot.unitCost, expiryLabel: { expired: 'Đã hết hạn', soon: 'Sắp hết hạn', good: 'Còn hạn', none: 'Không hạn dùng' }[lot.expiryState] })))
const movementMax = computed(() => Math.max(1, ...workspace.value.reports.movement.flatMap(point => [point.incoming, point.outgoing])))

function errorMessage(value: unknown) {
  const failure = value as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
  return failure?.data?.statusMessage ?? failure?.data?.message ?? failure?.statusMessage ?? failure?.message ?? 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'
}

async function saveDocument(value: Record<string, unknown>, post: boolean) {
  saving.value = true
  mutationError.value = ''
  successMessage.value = ''
  let created: { data: { id: number; reference: string } } | null = null
  try {
    created = await $fetch<{ data: { id: number; reference: string } }>('/api/admin/inventory/documents', { method: 'POST', body: value })
    if (post) await $fetch(`/api/admin/inventory/documents/${created.data.id}/post`, { method: 'POST' })
    drawerOpen.value = false
    successMessage.value = post ? `Đã ghi sổ chứng từ ${created.data.reference}.` : `Đã lưu nháp chứng từ ${created.data.reference}.`
    await refresh()
    if (post) setView('transactions')
    else setView('documents')
  } catch (failure) {
    if (created) {
      drawerOpen.value = false
      setView('documents')
      mutationError.value = `${errorMessage(failure)} Chứng từ ${created.data.reference} đã được giữ ở trạng thái nháp.`
      await refresh()
    } else mutationError.value = errorMessage(failure)
  } finally {
    saving.value = false
  }
}

async function postDocument(id: string | number | undefined) {
  if (id === undefined) return
  const document = workspace.value.documents.find(item => item.id === Number(id))
  if (!document) return
  postingId.value = document.id
  mutationError.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/admin/inventory/documents/${document.id}/post`, { method: 'POST' })
    successMessage.value = `Đã ghi sổ chứng từ ${document.reference}.`
    await refresh()
  } catch (failure) {
    mutationError.value = errorMessage(failure)
  } finally {
    postingId.value = null
  }
}

async function cancelDocument(id: string | number | undefined) {
  if (id === undefined) return
  const document = workspace.value.documents.find(item => item.id === Number(id))
  if (!document) return
  cancellingId.value = document.id
  mutationError.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/admin/inventory/documents/${document.id}/cancel`, { method: 'POST' })
    successMessage.value = `Đã hủy chứng từ nháp ${document.reference}.`
    await refresh()
  } catch (failure) {
    mutationError.value = errorMessage(failure)
  } finally {
    cancellingId.value = null
  }
}
</script>

<template>
  <NuxtPage v-if="route.path !== '/admin/kho'" />
  <section v-else class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <div class="grid gap-7 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Luân chuyển hàng hóa</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Quản lý kho</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Theo dõi số dư, nhập hàng và mọi biến động tồn qua chứng từ có thể đối soát.</p></div>
      <AppButton label="Tạo chứng từ" icon="plus" @click="drawerOpen = true; mutationError = ''" />
    </div>

    <div class="mt-7 grid gap-px overflow-hidden border-y border-[#78816f]/20 bg-[#78816f]/20 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" class="bg-[#f6f3eb] px-5 py-5 text-left transition hover:bg-[#efebe1] active:scale-[0.99]" @click="setView('stocks')"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">SKU đang quản lý</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#35402f]">{{ workspace.options.products.length }}</p></button>
      <button type="button" class="bg-[#f6f3eb] px-5 py-5 text-left transition hover:bg-[#efebe1] active:scale-[0.99]" @click="setView('stocks')"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">Dưới mức tối thiểu</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#8a574e]">{{ workspace.alerts.lowStock }}</p></button>
      <button type="button" class="bg-[#f6f3eb] px-5 py-5 text-left transition hover:bg-[#efebe1] active:scale-[0.99]" @click="setView('lots')"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">Hết hạn / trong 30 ngày</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#8a574e]">{{ workspace.alerts.expired }} <span class="text-sm font-normal text-[#81726b]">/ {{ workspace.alerts.expiring }}</span></p></button>
      <button type="button" class="bg-[#f6f3eb] px-5 py-5 text-left transition hover:bg-[#efebe1] active:scale-[0.99]" @click="setView('documents')"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">Chứng từ chờ ghi sổ</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#35402f]">{{ workspace.alerts.drafts }}</p></button>
    </div>

    <div v-if="activeView === 'stocks' && workspace.reports.movement.length" class="mt-7 grid gap-6 border-y border-[#78816f]/20 py-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.7fr)]">
      <section>
        <div class="flex items-end justify-between gap-4"><div><p class="text-xs font-semibold text-[#35402f]">Nhịp nhập — xuất 14 ngày</p><p class="mt-1 text-[0.68rem] text-[#7b8277]">Nhìn nhanh ngày có biến động bất thường.</p></div><div class="flex gap-4 text-[0.65rem] text-[#72796e]"><span class="flex items-center gap-1.5"><i class="size-2 rounded-full bg-[#66775f]" />Nhập</span><span class="flex items-center gap-1.5"><i class="size-2 rounded-full bg-[#a46e62]" />Xuất</span></div></div>
        <div class="mt-6 flex h-40 items-end gap-2 border-b border-[#78816f]/20 px-1">
          <div v-for="point in workspace.reports.movement" :key="point.day" class="group flex min-w-0 flex-1 items-end justify-center gap-0.5" :title="`${point.day}: nhập ${point.incoming}, xuất ${point.outgoing}`">
            <span class="w-2 max-w-[36%] bg-[#66775f] transition-[transform,opacity] duration-300 group-hover:-translate-y-1 group-hover:opacity-80" :style="{ height: `${Math.max(3, point.incoming / movementMax * 136)}px` }" />
            <span class="w-2 max-w-[36%] bg-[#a46e62] transition-[transform,opacity] duration-300 group-hover:-translate-y-1 group-hover:opacity-80" :style="{ height: `${Math.max(3, point.outgoing / movementMax * 136)}px` }" />
          </div>
        </div>
      </section>
      <aside class="border-l-0 border-[#78816f]/20 lg:border-l lg:pl-6"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">Giá trị tồn theo lô</p><p class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#35402f]">{{ workspace.reports.inventoryValue.toLocaleString('vi-VN') }} <span class="text-sm font-normal">đ</span></p><p class="mt-4 text-xs leading-5 text-[#72796e]">Giá trị được tính từ số lượng còn lại nhân giá vốn thực tế của từng lô.</p><NuxtLink to="/admin/kho/bao-cao" class="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#53654d] hover:underline">Xem báo cáo chi tiết <AppIcon name="chevron" :size="13" /></NuxtLink></aside>
    </div>

    <div class="mt-7 flex max-w-full gap-1 overflow-x-auto pb-1">
      <button type="button" class="filter-tab" :class="activeView === 'stocks' ? 'filter-tab--active' : ''" @click="setView('stocks')">Tồn hiện tại</button>
      <button type="button" class="filter-tab" :class="activeView === 'documents' ? 'filter-tab--active' : ''" @click="setView('documents')">Chứng từ</button>
      <button type="button" class="filter-tab" :class="activeView === 'lots' ? 'filter-tab--active' : ''" @click="setView('lots')">Lô & hạn dùng</button>
      <button type="button" class="filter-tab" :class="activeView === 'transactions' ? 'filter-tab--active' : ''" @click="setView('transactions')">Lịch sử kho</button>
      <button type="button" class="ml-auto grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-[0.96]" aria-label="Làm mới dữ liệu" @click="() => refresh()"><AppIcon name="refresh" :size="17" /></button>
    </div>

    <div v-if="successMessage" class="mt-5 flex items-center gap-2 border-l-2 border-[#64735c] bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]" role="status"><AppIcon name="check" :size="16" />{{ successMessage }}</div>
    <div v-if="mutationError" class="mt-5 border-l-2 border-[#9a6258] bg-[#f2e4df] px-4 py-3 text-xs text-[#7d443c]" role="alert">{{ mutationError }}</div>
    <div v-if="error" class="mt-5 border border-[#aa746c]/25 bg-[#f1e6e0] px-6 py-8 text-center text-xs text-[#65443e]">{{ errorMessage(error) }}</div>

    <div v-else class="mt-5">
      <AdminDataTable v-if="activeView === 'stocks'" :columns="stockColumns" :rows="stockRows" :loading="pending" :actions="false" paginate />
      <AdminDataTable v-else-if="activeView === 'lots'" :columns="lotColumns" :rows="lotRows" :loading="pending" :actions="false" paginate />
      <AdminDataTable v-else-if="activeView === 'transactions'" :columns="transactionColumns" :rows="transactionRows" :loading="pending" :actions="false" paginate />
      <div v-else>
        <AdminDataTable :columns="documentColumns" :rows="documentRows" :loading="pending" paginate>
          <template #actions="{ row }">
            <div v-if="workspace.documents.find(item => item.id === Number(row.id))?.status === 'draft'" class="flex justify-end gap-1">
              <button type="button" class="grid size-8 place-items-center rounded-full text-[#866158] transition hover:bg-[#ead8d3]" :disabled="postingId !== null || cancellingId !== null" :aria-label="`Hủy chứng từ ${row.reference}`" @click="cancelDocument(row.id)"><AppIcon name="close" :size="15" /></button>
              <button type="button" class="grid size-8 place-items-center rounded-full text-[#4f6548] transition hover:bg-[#dfe7db]" :disabled="postingId !== null || cancellingId !== null" :aria-label="`Ghi sổ chứng từ ${row.reference}`" @click="postDocument(row.id)"><AppIcon name="check" :size="15" /></button>
            </div>
          </template>
        </AdminDataTable>
        <AdminEmptyState v-if="!pending && !workspace.documents.length" title="Chưa có chứng từ" description="Tạo phiếu nhập, điều chỉnh hoặc điều chuyển đầu tiên." />
      </div>
    </div>

    <AdminInventoryDocumentDrawer :open="drawerOpen" :products="workspace.options.products" :locations="workspace.options.locations" :orders="workspace.options.orders" :saving="saving" :api-error="mutationError" @close="drawerOpen = false" @save="saveDocument" />
  </section>
</template>
