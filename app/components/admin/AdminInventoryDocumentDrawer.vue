<script setup lang="ts">
type ProductOption = { id: number; name: string; sku: string }
type LocationOption = { id: number; name: string; code: string }
type DocumentType = 'receipt' | 'adjustment' | 'transfer'
type LineItem = { productId: number | ''; quantity: number; unitCost: number | ''; direction: 'increase' | 'decrease'; reasonCode: string; batchNumber: string; expiryDate: string; note: string }

const props = defineProps<{ open: boolean; products: ProductOption[]; locations: LocationOption[]; saving?: boolean; apiError?: string }>()
const emit = defineEmits<{ close: []; save: [value: Record<string, unknown>, post: boolean] }>()
const type = ref<DocumentType>('receipt')
const sourceLocationId = ref<number | ''>('')
const destinationLocationId = ref<number | ''>('')
const occurredAt = ref('')
const supplierName = ref('')
const invoiceNumber = ref('')
const note = ref('')
const items = ref<LineItem[]>([])
const errors = reactive<Record<string, string>>({})

function localDateTime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function emptyItem(): LineItem {
  return { productId: '', quantity: 1, unitCost: '', direction: 'increase', reasonCode: '', batchNumber: '', expiryDate: '', note: '' }
}

function reset() {
  type.value = 'receipt'
  sourceLocationId.value = ''
  destinationLocationId.value = props.locations[0]?.id ?? ''
  occurredAt.value = localDateTime()
  supplierName.value = ''
  invoiceNumber.value = ''
  note.value = ''
  items.value = [emptyItem()]
  Object.keys(errors).forEach(key => delete errors[key])
}

watch(() => props.open, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) reset()
})
watch(type, () => {
  Object.keys(errors).forEach(key => delete errors[key])
  if (type.value === 'transfer') sourceLocationId.value ||= props.locations[0]?.id ?? ''
})
onBeforeUnmount(() => { document.body.style.overflow = '' })

function close() {
  if (!props.saving) emit('close')
}

function removeItem(index: number) {
  if (items.value.length > 1) items.value.splice(index, 1)
}

function submit(post: boolean) {
  Object.keys(errors).forEach(key => delete errors[key])
  if (!occurredAt.value) errors.occurredAt = 'Vui lòng chọn thời điểm chứng từ.'
  if (!destinationLocationId.value) errors.destinationLocationId = type.value === 'transfer' ? 'Vui lòng chọn kho nhận.' : 'Vui lòng chọn kho.'
  if (type.value === 'transfer' && !sourceLocationId.value) errors.sourceLocationId = 'Vui lòng chọn kho nguồn.'
  if (type.value === 'transfer' && sourceLocationId.value === destinationLocationId.value) errors.destinationLocationId = 'Kho nhận phải khác kho nguồn.'
  const usedProducts = new Set<number>()
  items.value.forEach((item, index) => {
    if (!item.productId) errors[`product-${index}`] = 'Vui lòng chọn sản phẩm.'
    else if (usedProducts.has(Number(item.productId))) errors[`product-${index}`] = 'Sản phẩm đã có trong chứng từ.'
    else usedProducts.add(Number(item.productId))
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) errors[`quantity-${index}`] = 'Số lượng phải lớn hơn 0.'
    if (type.value === 'adjustment' && !item.reasonCode.trim()) errors[`reason-${index}`] = 'Vui lòng nhập lý do điều chỉnh.'
    if (item.unitCost !== '' && Number(item.unitCost) < 0) errors[`cost-${index}`] = 'Đơn giá không hợp lệ.'
  })
  if (Object.keys(errors).length) return
  emit('save', {
    type: type.value,
    sourceLocationId: sourceLocationId.value || null,
    destinationLocationId: destinationLocationId.value || null,
    occurredAt: new Date(occurredAt.value).toISOString(),
    supplierName: supplierName.value,
    invoiceNumber: invoiceNumber.value,
    note: note.value,
    items: items.value,
  }, post)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tạo chứng từ kho" @keydown.esc="close">
        <button type="button" class="absolute inset-0 cursor-default bg-[#20271e]/45 backdrop-blur-[2px]" aria-label="Đóng" :disabled="saving" @click="close" />
        <aside class="absolute right-0 top-0 h-full w-full max-w-[680px] overflow-y-auto bg-[#f6f3eb] px-5 py-7 shadow-[-24px_0_70px_rgba(38,45,34,0.14)] md:px-9 md:py-9">
          <div class="flex items-start justify-between gap-6 border-b border-[#78816f]/20 pb-7">
            <div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#788170]">Luân chuyển hàng hóa</p><h2 class="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#30392d]">Tạo chứng từ kho</h2></div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full border border-[#78816f]/25 transition hover:bg-[#e7e3d9] disabled:opacity-50" aria-label="Đóng" :disabled="saving" @click="close"><AppIcon name="close" /></button>
          </div>

          <form class="mt-7 grid gap-6" novalidate @submit.prevent="submit(true)">
            <div v-if="apiError" class="border-l-2 border-[#9a6258] bg-[#f2e4df] px-4 py-3 text-xs leading-5 text-[#7d443c]" role="alert">{{ apiError }}</div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="admin-field"><span>Loại chứng từ</span><select v-model="type"><option value="receipt">Nhập kho</option><option value="adjustment">Điều chỉnh kiểm kê</option><option value="transfer">Điều chuyển kho</option></select></label>
              <label class="admin-field"><span>Thời điểm</span><input v-model="occurredAt" type="datetime-local" :aria-invalid="Boolean(errors.occurredAt)"><small v-if="errors.occurredAt" class="text-[#8b5148]">{{ errors.occurredAt }}</small></label>
              <label v-if="type === 'transfer'" class="admin-field"><span>Kho nguồn</span><select v-model.number="sourceLocationId" :aria-invalid="Boolean(errors.sourceLocationId)"><option value="" disabled>Chọn kho nguồn</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }} · {{ location.code }}</option></select><small v-if="errors.sourceLocationId" class="text-[#8b5148]">{{ errors.sourceLocationId }}</small></label>
              <label class="admin-field"><span>{{ type === 'transfer' ? 'Kho nhận' : 'Kho' }}</span><select v-model.number="destinationLocationId" :aria-invalid="Boolean(errors.destinationLocationId)"><option value="" disabled>Chọn kho</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }} · {{ location.code }}</option></select><small v-if="errors.destinationLocationId" class="text-[#8b5148]">{{ errors.destinationLocationId }}</small></label>
              <label v-if="type === 'receipt'" class="admin-field"><span>Nhà cung cấp</span><input v-model="supplierName" placeholder="Tên nhà cung cấp"></label>
              <label v-if="type === 'receipt'" class="admin-field"><span>Số hóa đơn</span><input v-model="invoiceNumber" placeholder="Số hóa đơn hoặc phiếu giao"></label>
            </div>

            <section class="border-t border-[#78816f]/20 pt-6">
              <div class="flex items-center justify-between"><div><p class="text-xs font-semibold text-[#364032]">Sản phẩm</p><p class="mt-1 text-[0.68rem] text-[#7c8378]">Mỗi sản phẩm xuất hiện một lần trong chứng từ.</p></div><AppButton label="Thêm dòng" icon="plus" variant="secondary" @click="items.push(emptyItem())" /></div>
              <div class="mt-4 grid gap-4">
                <div v-for="(item, index) in items" :key="index" class="relative grid gap-4 border-t border-[#78816f]/15 pt-5 first:border-0 first:pt-0 sm:grid-cols-2">
                  <label class="admin-field sm:col-span-2"><span>Sản phẩm {{ index + 1 }}</span><select v-model.number="item.productId" :aria-invalid="Boolean(errors[`product-${index}`])"><option value="" disabled>Chọn sản phẩm</option><option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }} · {{ product.sku }}</option></select><small v-if="errors[`product-${index}`]" class="text-[#8b5148]">{{ errors[`product-${index}`] }}</small></label>
                  <label class="admin-field"><span>Số lượng</span><input v-model.number="item.quantity" type="number" min="0.001" step="0.001" :aria-invalid="Boolean(errors[`quantity-${index}`])"><small v-if="errors[`quantity-${index}`]" class="text-[#8b5148]">{{ errors[`quantity-${index}`] }}</small></label>
                  <label v-if="type === 'receipt'" class="admin-field"><span>Đơn giá nhập</span><input v-model.number="item.unitCost" type="number" min="0" step="1" placeholder="Không bắt buộc"><small v-if="errors[`cost-${index}`]" class="text-[#8b5148]">{{ errors[`cost-${index}`] }}</small></label>
                  <label v-if="type === 'adjustment'" class="admin-field"><span>Chiều điều chỉnh</span><select v-model="item.direction"><option value="increase">Tăng tồn</option><option value="decrease">Giảm tồn</option></select></label>
                  <label v-if="type === 'adjustment'" class="admin-field"><span>Lý do</span><input v-model="item.reasonCode" placeholder="Kiểm kê lệch, hỏng, hết hạn…" :aria-invalid="Boolean(errors[`reason-${index}`])"><small v-if="errors[`reason-${index}`]" class="text-[#8b5148]">{{ errors[`reason-${index}`] }}</small></label>
                  <label v-if="type === 'receipt'" class="admin-field"><span>Số lô</span><input v-model="item.batchNumber" placeholder="Không bắt buộc"></label>
                  <label v-if="type === 'receipt'" class="admin-field"><span>Hạn sử dụng</span><input v-model="item.expiryDate" type="date"></label>
                  <button v-if="items.length > 1" type="button" class="absolute right-0 top-4 grid size-8 place-items-center rounded-full text-[#855c53] transition hover:bg-[#ead8d3] first:top-0" :aria-label="`Xóa dòng ${index + 1}`" @click="removeItem(index)"><AppIcon name="trash" :size="15" /></button>
                </div>
              </div>
            </section>

            <label class="admin-field"><span>Ghi chú chứng từ</span><textarea v-model="note" rows="3" placeholder="Thông tin cần lưu để đối soát" /></label>
            <div class="flex flex-col-reverse gap-3 border-t border-[#78816f]/20 pt-6 sm:flex-row sm:justify-end">
              <AppButton label="Hủy" variant="ghost" :disabled="saving" @click="close" />
              <AppButton :label="saving ? 'Đang lưu…' : 'Lưu nháp'" variant="secondary" :disabled="saving" @click="submit(false)" />
              <AppButton :label="saving ? 'Đang ghi sổ…' : 'Lưu và ghi sổ'" type="submit" icon="check" :disabled="saving" />
            </div>
          </form>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
