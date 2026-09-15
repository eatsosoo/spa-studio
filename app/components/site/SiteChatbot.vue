<script setup lang="ts">
type Source = { label: string; url?: string }
type Message = { role: 'user' | 'assistant'; content: string; sources?: Source[] }
type ServiceOption = { name: string; durationMinutes: number; price: string }

const open = ref(false)
const bookingOpen = ref(false)
const sending = ref(false)
const booking = ref(false)
const text = ref('')
const error = ref('')
const token = ref('')
const messages = ref<Message[]>([{ role: 'assistant', content: 'Chào bạn, mình là trợ lý của MIÊN. Bạn muốn tìm hiểu liệu trình, giá hay đặt một khung giờ ghé?' }])
const services = ref<ServiceOption[]>([])
const form = reactive({ name: '', phone: '', service: '', date: '', time: '09:00', note: '' })
const bookingResult = ref<{ reference: string; message: string } | null>(null)
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
const times = Array.from({ length: 24 }, (_, index) => { const minutes = 9 * 60 + index * 30; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` })

onMounted(async () => {
  token.value = localStorage.getItem('mien-chat-token') ?? ''
  try { services.value = (await $fetch<{ data: ServiceOption[] }>('/api/chat/options')).data } catch { /* Chat vẫn dùng được nếu danh sách tải chậm. */ }
})

async function send() {
  const message = text.value.trim()
  if (!message || sending.value) return
  messages.value.push({ role: 'user', content: message }); text.value = ''; error.value = ''; sending.value = true
  try {
    const response = await $fetch<{ data: { token: string; answer: string; sources: Source[]; wantsBooking: boolean; lead: { customerName?: string; phone?: string; serviceName?: string; preferredAt?: string } } }>('/api/chat/message', { method: 'POST', body: { token: token.value || undefined, message, pageUrl: location.pathname } })
    token.value = response.data.token; localStorage.setItem('mien-chat-token', token.value)
    messages.value.push({ role: 'assistant', content: response.data.answer, sources: response.data.sources })
    if (response.data.lead.customerName) form.name = response.data.lead.customerName
    if (response.data.lead.phone) form.phone = response.data.lead.phone
    if (response.data.lead.serviceName && services.value.some(item => item.name === response.data.lead.serviceName)) form.service = response.data.lead.serviceName
    bookingOpen.value = response.data.wantsBooking
  } catch { error.value = 'Trợ lý đang tạm gián đoạn. Bạn có thể mở form đặt lịch để MIÊN liên hệ lại.' } finally { sending.value = false }
}

async function submitBooking() {
  error.value = ''; booking.value = true
  try {
    const response = await $fetch<{ token: string; reference: string; message: string }>('/api/chat/booking', { method: 'POST', body: { token: token.value, ...form } })
    token.value = response.token; localStorage.setItem('mien-chat-token', token.value)
    bookingResult.value = response
    messages.value.push({ role: 'assistant', content: `${response.message} Mã yêu cầu: ${response.reference}.` })
  } catch (failure) {
    const item = failure as { data?: { statusMessage?: string } }
    error.value = item.data?.statusMessage ?? 'Chưa thể gửi yêu cầu đặt lịch.'
  } finally { booking.value = false }
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7">
    <Transition name="chat-panel">
      <section v-if="open" class="mb-3 flex h-[min(720px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#78816f]/25 bg-[#f8f5ed] shadow-[0_28px_80px_rgba(35,43,31,.28)]" role="dialog" aria-label="Trợ lý MIÊN">
        <header class="flex items-center justify-between bg-[#303b2c] px-5 py-4 text-[#f7f2e8]"><div><p class="text-sm font-semibold">Tư vấn MIÊN Spa</p><p class="mt-0.5 text-[0.68rem] text-[#c8d0c3]"><span class="mr-1 text-[#91c989]">●</span>Trợ lý AI · dữ liệu từ hệ thống</p></div><button type="button" class="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Đóng chatbot" @click="open = false"><AppIcon name="close" :size="17" /></button></header>
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div class="grid gap-4"><article v-for="(message, index) in messages" :key="index" class="max-w-[88%] rounded-xl px-4 py-3 text-xs leading-5" :class="message.role === 'user' ? 'ml-auto bg-[#4c5d43] text-white' : 'bg-white text-[#3b4437] shadow-sm'"><p class="whitespace-pre-wrap">{{ message.content }}</p><div v-if="message.sources?.some(item => item.url)" class="mt-2 flex flex-wrap gap-2"><NuxtLink v-for="source in message.sources.filter(item => item.url).slice(0, 3)" :key="source.label" :to="source.url" class="underline underline-offset-2">{{ source.label }}</NuxtLink></div></article></div>
          <p v-if="sending" class="mt-4 text-xs text-[#71796d]">MIÊN đang kiểm tra thông tin…</p>
          <div v-if="bookingOpen" class="mt-5 rounded-xl border border-[#78816f]/20 bg-[#eee9df] p-4">
            <div class="flex items-center justify-between"><h3 class="text-sm font-semibold text-[#354031]">Thông tin đặt lịch</h3><button type="button" class="text-xs text-[#687363] underline" @click="bookingOpen = false">Thu gọn</button></div>
            <p v-if="bookingResult" class="mt-4 text-xs leading-5 text-[#53604e]">{{ bookingResult.message }}<br><strong>Mã: {{ bookingResult.reference }}</strong></p>
            <form v-else class="mt-4 grid gap-3" @submit.prevent="submitBooking">
              <CommonInput v-model="form.name" required autocomplete="name" placeholder="Họ và tên" class="bg-white" />
              <CommonInput v-model="form.phone" required type="tel" autocomplete="tel" placeholder="Số điện thoại" class="bg-white" />
              <CommonSelect v-model="form.service" required class="bg-white"><option value="" disabled>Chọn liệu trình</option><option v-for="service in services" :key="service.name" :value="service.name">{{ service.name }} · {{ Number(service.price).toLocaleString('vi-VN') }}đ</option></CommonSelect>
              <div class="grid grid-cols-2 gap-3"><CommonInput v-model="form.date" required type="date" :min="today" class="bg-white" /><CommonSelect v-model="form.time" required class="bg-white"><option v-for="time in times" :key="time">{{ time }}</option></CommonSelect></div>
              <CommonTextarea v-model="form.note" rows="2" placeholder="Lời nhắn (không bắt buộc)" class="bg-white p-3" />
              <AppButton :label="booking ? 'Đang gửi…' : 'Xác nhận gửi yêu cầu'" type="submit" :disabled="booking" />
              <p class="text-[0.62rem] leading-4 text-[#747b70]">MIÊN sẽ liên hệ xác nhận; đây chưa phải lịch đã được giữ chỗ.</p>
            </form>
          </div>
          <button v-else type="button" class="mt-4 text-xs font-semibold text-[#53634d] underline underline-offset-4" @click="bookingOpen = true">Đặt lịch qua chatbot</button>
          <p v-if="error" class="mt-4 text-xs leading-5 text-[#844f47]" role="alert">{{ error }}</p>
        </div>
        <form class="flex gap-2 border-t border-[#78816f]/18 bg-white p-3" @submit.prevent="send"><CommonInput v-model="text" maxlength="1500" placeholder="Nhập câu hỏi của bạn…" class="min-w-0 flex-1" /><button type="submit" class="grid size-11 shrink-0 place-items-center rounded-full bg-[#4c5d43] text-white disabled:opacity-50" :disabled="sending || !text.trim()" aria-label="Gửi"><AppIcon name="arrow" :size="17" /></button></form>
      </section>
    </Transition>
    <button type="button" class="ml-auto grid size-14 place-items-center rounded-full bg-[#303b2c] text-[#f7f2e8] shadow-[0_15px_40px_rgba(35,43,31,.3)] transition hover:-translate-y-1" :aria-label="open ? 'Đóng trợ lý MIÊN' : 'Mở trợ lý MIÊN'" @click="open = !open"><AppIcon :name="open ? 'close' : 'sparkles'" :size="21" /></button>
  </div>
</template>

<style scoped>
.chat-panel-enter-active,.chat-panel-leave-active{transition:opacity .18s ease,transform .24s cubic-bezier(.16,1,.3,1)}
.chat-panel-enter-from,.chat-panel-leave-to{opacity:0;transform:translateY(14px) scale(.98)}
</style>
