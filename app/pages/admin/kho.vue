<script setup lang="ts">
import type { AdminColumn, AdminRow } from '~/types'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Quản lý kho | MIÊN Admin' })

type Stock = { productId: number; product: string; sku: string; locationId: number | null; location: string; quantity: number; reserved: number; available: number; minimum: number }
type InventoryDocument = { id: number; reference: string; type: 'receipt' | 'adjustment' | 'transfer'; status: 'draft' | 'posted' | 'cancelled'; occurredAt: string; sourceLocation: string; destinationLocation: string; supplierName: string | null; invoiceNumber: string | null; itemCount: number; totalQuantity: number }
type InventoryTransaction = { id: number; product: string; sku: string; location: string; type: string; quantityDelta: number; quantityAfter: number; referenceType: string | null; referenceId: number | null; note: string | null; createdAt: string }
type InventoryWorkspace = { stocks: Stock[]; documents: InventoryDocument[]; transactions: InventoryTransaction[]; options: { products: Array<{ id: number; name: string; sku: string }>; locations: Array<{ id: number; name: string; code: string }> } }

const activeView = ref<'stocks' | 'documents' | 'transactions'>('stocks')
const drawerOpen = ref(false)
const saving = ref(false)
const postingId = ref<number | null>(null)
const cancellingId = ref<number | null>(null)
const mutationError = ref('')
const successMessage = ref('')
const { data: response, pending, error, refresh } = await useAsyncData('admin-inventory', () => $fetch<{ data: InventoryWorkspace }>('/api/admin/inventory'))
const workspace = computed<InventoryWorkspace>(() => response.value?.data ?? { stocks: [], documents: [], transactions: [], options: { products: [], locations: [] } })

const stockColumns: AdminColumn[] = [
  { key: 'product', label: 'Sản phẩm' }, { key: 'sku', label: 'SKU' }, { key: 'location', label: 'Kho' },
  { key: 'quantity', label: 'Tồn thực tế', type: 'number', align: 'right' }, { key: 'reserved', label: 'Đã giữ', type: 'number', align: 'right' }, { key: 'available', label: 'Khả dụng', type: 'number', align: 'right' },
]
const transactionColumns: AdminColumn[] = [
  { key: 'createdAt', label: 'Thời điểm', type: 'date' }, { key: 'product', label: 'Sản phẩm' }, { key: 'location', label: 'Kho' }, { key: 'typeLabel', label: 'Nghiệp vụ' },
  { key: 'quantityDelta', label: 'Biến động', type: 'number', align: 'right' }, { key: 'quantityAfter', label: 'Sau giao dịch', type: 'number', align: 'right' },
]
const documentColumns: AdminColumn[] = [
  { key: 'reference', label: 'Mã chứng từ' }, { key: 'occurredAt', label: 'Thời điểm', type: 'date' }, { key: 'typeLabel', label: 'Nghiệp vụ' },
  { key: 'movement', label: 'Luân chuyển' }, { key: 'itemCount', label: 'Số dòng', type: 'number', align: 'right' }, { key: 'totalQuantity', label: 'Tổng lượng', type: 'number', align: 'right' }, { key: 'status', label: 'Trạng thái', type: 'status' },
]
const transactionLabels: Record<string, string> = { opening: 'Tồn đầu kỳ', purchase: 'Nhập kho', sale: 'Bán hàng', service_usage: 'Dùng cho dịch vụ', adjustment: 'Điều chỉnh', transfer_in: 'Nhận điều chuyển', transfer_out: 'Xuất điều chuyển', return: 'Hàng trả lại' }
const documentLabels = { receipt: 'Nhập kho', adjustment: 'Điều chỉnh', transfer: 'Điều chuyển' } as const
const statusLabels = { draft: 'Bản nháp', posted: 'Đã ghi sổ', cancelled: 'Đã hủy' } as const
const stockRows = computed<AdminRow[]>(() => workspace.value.stocks.map(row => ({ id: `${row.productId}-${row.locationId ?? 0}`, product: row.product, sku: row.sku, location: row.location, quantity: row.quantity, reserved: row.reserved, available: row.available })))
const transactionRows = computed<AdminRow[]>(() => workspace.value.transactions.map(row => ({ id: row.id, createdAt: row.createdAt, product: row.product, location: row.location, typeLabel: transactionLabels[row.type] ?? row.type, quantityDelta: row.quantityDelta, quantityAfter: row.quantityAfter })))
const documentRows = computed<AdminRow[]>(() => workspace.value.documents.map(document => ({ id: document.id, reference: document.reference, occurredAt: document.occurredAt, typeLabel: documentLabels[document.type], movement: document.type === 'transfer' ? `${document.sourceLocation} → ${document.destinationLocation}` : document.destinationLocation, itemCount: document.itemCount, totalQuantity: document.totalQuantity, status: statusLabels[document.status] })))
const lowStock = computed(() => workspace.value.stocks.filter(row => row.locationId && row.available <= row.minimum).length)
const draftCount = computed(() => workspace.value.documents.filter(document => document.status === 'draft').length)

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
    if (post) activeView.value = 'transactions'
    else activeView.value = 'documents'
  } catch (failure) {
    if (created) {
      drawerOpen.value = false
      activeView.value = 'documents'
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
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <div class="grid gap-7 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Luân chuyển hàng hóa</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Quản lý kho</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Theo dõi số dư, nhập hàng và mọi biến động tồn qua chứng từ có thể đối soát.</p></div>
      <AppButton label="Tạo chứng từ" icon="plus" @click="drawerOpen = true; mutationError = ''" />
    </div>

    <div class="mt-7 grid gap-px overflow-hidden border-y border-[#78816f]/20 bg-[#78816f]/20 sm:grid-cols-3">
      <div class="bg-[#f6f3eb] px-5 py-5"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">SKU đang quản lý</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#35402f]">{{ workspace.options.products.length }}</p></div>
      <div class="bg-[#f6f3eb] px-5 py-5"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">Dưới mức tối thiểu</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#76564e]">{{ lowStock }}</p></div>
      <div class="bg-[#f6f3eb] px-5 py-5"><p class="text-[0.62rem] uppercase tracking-[0.16em] text-[#7b8277]">Chứng từ nháp</p><p class="mt-2 text-2xl font-semibold tabular-nums text-[#35402f]">{{ draftCount }}</p></div>
    </div>

    <div class="mt-7 flex max-w-full gap-1 overflow-x-auto pb-1">
      <button type="button" class="filter-tab" :class="activeView === 'stocks' ? 'filter-tab--active' : ''" @click="activeView = 'stocks'">Tồn hiện tại</button>
      <button type="button" class="filter-tab" :class="activeView === 'documents' ? 'filter-tab--active' : ''" @click="activeView = 'documents'">Chứng từ</button>
      <button type="button" class="filter-tab" :class="activeView === 'transactions' ? 'filter-tab--active' : ''" @click="activeView = 'transactions'">Lịch sử kho</button>
      <button type="button" class="ml-auto grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#566150] transition hover:bg-[#e7e3d8] active:scale-[0.96]" aria-label="Làm mới dữ liệu" @click="() => refresh()"><AppIcon name="refresh" :size="17" /></button>
    </div>

    <div v-if="successMessage" class="mt-5 flex items-center gap-2 border-l-2 border-[#64735c] bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]" role="status"><AppIcon name="check" :size="16" />{{ successMessage }}</div>
    <div v-if="mutationError" class="mt-5 border-l-2 border-[#9a6258] bg-[#f2e4df] px-4 py-3 text-xs text-[#7d443c]" role="alert">{{ mutationError }}</div>
    <div v-if="error" class="mt-5 border border-[#aa746c]/25 bg-[#f1e6e0] px-6 py-8 text-center text-xs text-[#65443e]">{{ errorMessage(error) }}</div>

    <div v-else class="mt-5">
      <AdminDataTable v-if="activeView === 'stocks'" :columns="stockColumns" :rows="stockRows" :loading="pending" :actions="false" />
      <AdminDataTable v-else-if="activeView === 'transactions'" :columns="transactionColumns" :rows="transactionRows" :loading="pending" :actions="false" />
      <div v-else>
        <AdminDataTable :columns="documentColumns" :rows="documentRows" :loading="pending">
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

    <AdminInventoryDocumentDrawer :open="drawerOpen" :products="workspace.options.products" :locations="workspace.options.locations" :saving="saving" :api-error="mutationError" @close="drawerOpen = false" @save="saveDocument" />
  </section>
</template>
