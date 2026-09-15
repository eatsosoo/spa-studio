<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Khách từ chatbot | MIÊN' })

type Lead = { id: number; customerName: string | null; phone: string | null; serviceName: string | null; preferredAt: string | null; note: string | null; status: 'incomplete' | 'complete' | 'booked' | 'contacted' | 'closed'; appointmentId: number | null; sessionStatus: string; lastMessageAt: string }
type ChatMessage = { id: number; role: 'user' | 'assistant'; content: string; createdAt: string }
const leads = ref<Lead[]>([])
const search = ref('')
const filter = ref<'all' | 'complete' | 'incomplete'>('all')
const loading = ref(true)
const selected = ref<Lead | null>(null)
const messages = ref<ChatMessage[]>([])
const error = ref('')

const visible = computed(() => leads.value.filter(item => {
  const complete = ['complete', 'booked', 'contacted', 'closed'].includes(item.status)
  const statusMatch = filter.value === 'all' || (filter.value === 'complete' ? complete : !complete)
  const term = search.value.trim().toLocaleLowerCase('vi')
  return statusMatch && (!term || `${item.customerName} ${item.phone} ${item.serviceName}`.toLocaleLowerCase('vi').includes(term))
}))
const counts = computed(() => ({ all: leads.value.length, complete: leads.value.filter(item => item.status !== 'incomplete').length, incomplete: leads.value.filter(item => item.status === 'incomplete').length }))

async function load() { loading.value = true; try { leads.value = (await $fetch<{ data: Lead[] }>('/api/admin/chat-leads')).data } catch { error.value = 'Không thể tải danh sách khách từ chatbot.' } finally { loading.value = false } }
async function openConversation(lead: Lead) { selected.value = lead; messages.value = (await $fetch<{ data: { messages: ChatMessage[] } }>(`/api/admin/chat-leads/${lead.id}`)).data.messages }
async function update(lead: Lead, body: Record<string, unknown>) { await $fetch(`/api/admin/chat-leads/${lead.id}`, { method: 'PATCH', body }); await load(); selected.value = null }
async function hide(lead: Lead) { await $fetch(`/api/admin/chat-leads/${lead.id}`, { method: 'DELETE' }); await load(); selected.value = null }
onMounted(load)
</script>

<template>
  <main class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="border-b border-[#78816f]/20 pb-8"><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Tư vấn và chuyển đổi</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Khách từ chatbot</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Thông tin khách để lại khi trò chuyện với trợ lý AI. Lịch tạo từ chatbot luôn ở trạng thái chờ xác nhận.</p></header>
    <div class="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div class="flex gap-1"><button v-for="item in [{ key: 'all', label: 'Tất cả' }, { key: 'complete', label: 'Đủ thông tin' }, { key: 'incomplete', label: 'Còn thiếu' }]" :key="item.key" type="button" class="filter-tab" :class="filter === item.key ? 'filter-tab--active' : ''" @click="filter = item.key as typeof filter">{{ item.label }} {{ counts[item.key as keyof typeof counts] }}</button></div><label class="admin-search max-w-sm"><AppIcon name="search" :size="16" /><CommonInput v-model="search" type="search" placeholder="Tìm tên, SĐT, liệu trình…" /></label></div>
    <p v-if="error" class="mt-5 text-xs text-[#844f47]" role="alert">{{ error }}</p>
    <section class="mt-5 overflow-x-auto rounded-xl border border-[#78816f]/20 bg-[#fbf9f3]"><table class="w-full min-w-[1080px] text-left text-xs"><thead class="border-b border-[#78816f]/20 bg-[#eeeadf] text-[0.62rem] uppercase tracking-[0.13em] text-[#747c70]"><tr><th class="px-5 py-4">Khách hàng</th><th class="px-5 py-4">Điện thoại</th><th class="px-5 py-4">Thời gian</th><th class="px-5 py-4">Liệu trình</th><th class="px-5 py-4">Trạng thái</th><th class="px-5 py-4">Chat cuối</th><th class="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody><tr v-for="lead in visible" :key="lead.id" class="border-b border-[#78816f]/14"><td class="px-5 py-5 font-semibold">{{ lead.customerName || 'Chưa có tên' }}</td><td class="px-5 py-5"><a v-if="lead.phone" :href="`tel:${lead.phone}`" class="underline">{{ lead.phone }}</a><span v-else>—</span></td><td class="px-5 py-5">{{ lead.preferredAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lead.preferredAt)) : 'Chưa chọn' }}</td><td class="px-5 py-5">{{ lead.serviceName || 'Chưa chọn' }}</td><td class="px-5 py-5"><StatusBadge :label="lead.status === 'incomplete' ? 'Còn thiếu' : lead.status === 'booked' ? 'Đã tạo lịch' : lead.status === 'contacted' ? 'Đã liên hệ' : lead.status === 'closed' ? 'Đã đóng' : 'Đủ thông tin'" /></td><td class="px-5 py-5 tabular-nums">{{ new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lead.lastMessageAt)) }}</td><td class="px-5 py-5 text-right"><button type="button" class="font-semibold underline underline-offset-4" @click="openConversation(lead)">Xem hội thoại</button></td></tr><tr v-if="!visible.length"><td colspan="7" class="px-5 py-16 text-center text-[#7b8277]">{{ loading ? 'Đang tải…' : 'Chưa có khách phù hợp.' }}</td></tr></tbody></table></section>
    <CommonModal :open="Boolean(selected)" title="Hội thoại chatbot" :description="selected?.customerName || selected?.phone || 'Khách chưa định danh'" size="lg" @close="selected = null"><div class="grid gap-3"><article v-for="message in messages" :key="message.id" class="max-w-[85%] rounded-lg px-4 py-3 text-xs leading-5" :class="message.role === 'user' ? 'ml-auto bg-[#384533] text-white' : 'bg-white'">{{ message.content }}</article></div><template #footer><div class="flex flex-wrap justify-end gap-2"><AppButton v-if="selected?.status !== 'contacted'" label="Đánh dấu đã liên hệ" variant="secondary" @click="selected && update(selected, { status: 'contacted' })" /><AppButton label="Ẩn hội thoại" variant="secondary" @click="selected && hide(selected)" /><AppButton label="Đóng" @click="selected = null" /></div></template></CommonModal>
  </main>
</template>
