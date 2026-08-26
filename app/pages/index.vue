<script setup lang="ts">
type BookingResponse = {
  ok: boolean
  reference: string
  message: string
}

const services = [
  {
    number: '01',
    name: 'Thả lỏng toàn thân',
    description: 'Nhịp ấn chậm, sâu vừa đủ để đưa cơ thể trở lại trạng thái nhẹ tênh.',
    duration: '90 phút',
    price: '1.280.000đ',
  },
  {
    number: '02',
    name: 'Phục hồi làn da',
    description: 'Làm sạch dịu, cân bằng độ ẩm và chăm sóc theo tình trạng da trong ngày.',
    duration: '75 phút',
    price: '1.450.000đ',
  },
  {
    number: '03',
    name: 'Chăm sóc da đầu',
    description: 'Thảo mộc ấm, massage đầu và vai gáy giúp giải phóng cảm giác nặng mỏi.',
    duration: '60 phút',
    price: '920.000đ',
  },
  {
    number: '04',
    name: 'Nghi thức đá ấm',
    description: 'Nhiệt ấm lan chậm kết hợp tinh dầu gỗ, dành cho những ngày cần nghỉ sâu.',
    duration: '105 phút',
    price: '1.680.000đ',
  },
]

const isBookingOpen = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const bookingResult = ref<BookingResponse | null>(null)
const errors = reactive<Record<string, string>>({})
const form = reactive({
  name: '',
  phone: '',
  service: '',
  date: '',
  note: '',
})

const today = new Date().toISOString().slice(0, 10)

function openBooking(service = '') {
  form.service = service
  bookingResult.value = null
  submitError.value = ''
  isBookingOpen.value = true
}

function closeBooking() {
  if (!isSubmitting.value) isBookingOpen.value = false
}

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key])
  const phone = form.phone.replace(/\s/g, '')

  if (!form.name.trim()) errors.name = 'Vui lòng cho MIÊN biết tên của bạn.'
  if (!/^(\+84|0)\d{9}$/.test(phone)) errors.phone = 'Số điện thoại chưa đúng định dạng.'
  if (!form.service) errors.service = 'Vui lòng chọn một liệu trình.'
  if (!form.date) errors.date = 'Vui lòng chọn ngày bạn muốn ghé.'

  return Object.keys(errors).length === 0
}

async function submitBooking() {
  if (!validate()) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    bookingResult.value = await $fetch<BookingResponse>('/api/booking', {
      method: 'POST',
      body: form,
    })
  } catch {
    submitError.value = 'Chưa thể gửi yêu cầu lúc này. Bạn vui lòng thử lại sau ít phút.'
  } finally {
    isSubmitting.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeBooking()
}

watch(isBookingOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="min-h-[100dvh] overflow-x-hidden bg-[#f3efe5] text-[#293126]">
    <header class="absolute inset-x-0 top-0 z-20">
      <div class="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 md:px-10 lg:px-14">
        <a href="#top" class="group flex items-center gap-3" aria-label="MIÊN Spa, về đầu trang">
          <span class="grid size-9 place-items-center rounded-full border border-[#4c5d43]/35 transition-transform duration-500 group-hover:rotate-45">
            <span class="h-3.5 w-3.5 rounded-tl-full rounded-br-full bg-[#4c5d43]" />
          </span>
          <span class="text-[0.88rem] font-semibold tracking-[0.28em]">MIÊN</span>
        </a>

        <nav class="hidden items-center gap-8 text-[0.78rem] font-medium tracking-wide lg:flex" aria-label="Điều hướng chính">
          <a href="#lieu-trinh" class="nav-link">Liệu trình</a>
          <a href="#khong-gian" class="nav-link">Không gian</a>
          <a href="#cau-chuyen" class="nav-link">Câu chuyện</a>
        </nav>

        <button class="button-quiet" type="button" @click="openBooking()">
          Đặt một khoảng nghỉ
        </button>
      </div>
    </header>

    <main id="top">
      <section class="relative min-h-[100dvh] px-5 pb-10 pt-28 md:px-10 lg:px-14 lg:pb-14">
        <div class="mx-auto grid min-h-[calc(100dvh-10rem)] max-w-[1400px] items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
          <div class="relative z-10 max-w-[650px] py-10 lg:pl-[5vw]">
            <p class="reveal-up mb-8 text-[0.69rem] font-semibold uppercase tracking-[0.28em] text-[#66715d]">
              Chăm sóc cơ thể và làn da
            </p>
            <h1 class="reveal-up reveal-delay-1 font-display text-[clamp(3.2rem,5.5vw,6.5rem)] font-light leading-[0.88] tracking-[-0.055em] text-[#30382c]">
              <span class="block md:whitespace-nowrap">Một nhịp thở</span>
              <span class="ml-[10vw] block whitespace-nowrap italic text-[#66715d] lg:ml-[7vw]">thật chậm.</span>
            </h1>
            <p class="reveal-up reveal-delay-2 mt-10 max-w-[46ch] text-[0.97rem] leading-7 text-[#62675e] md:ml-[7vw]">
              MIÊN tạo ra những liệu trình vừa đủ, trong một không gian riêng tư để cơ thể được nghỉ trước khi quay lại nhịp sống thường ngày.
            </p>
            <div class="reveal-up reveal-delay-3 mt-9 flex flex-wrap items-center gap-5 md:ml-[7vw]">
              <button class="button-primary" type="button" @click="openBooking()">
                Chọn thời gian ghé
                <span aria-hidden="true">↗</span>
              </button>
              <a href="#lieu-trinh" class="text-link">Xem liệu trình</a>
            </div>
          </div>

          <div class="reveal-image relative min-h-[54vh] overflow-hidden rounded-[0.35rem] lg:min-h-[calc(100dvh-8rem)]">
            <img
              src="/images/mien-spa-hero.png"
              alt="Không gian trị liệu với chất liệu linen, travertine và cành olive"
              class="absolute inset-0 h-full w-full object-cover object-center"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-[#283025]/20 via-transparent to-[#f3efe5]/5" />
            <div class="absolute bottom-6 left-6 right-6 flex items-end justify-between text-[#f7f2e8] md:bottom-8 md:left-8 md:right-8">
              <p class="max-w-[15rem] text-xs leading-5 tracking-wide">Mỗi phòng chỉ đón một khách trong một khung giờ.</p>
              <span class="font-display text-4xl font-light italic">01</span>
            </div>
          </div>
        </div>
      </section>

      <section class="border-y border-[#77806d]/25 bg-[#ece6da] px-5 py-6 md:px-10 lg:px-14">
        <div class="mx-auto flex max-w-[1400px] flex-col justify-between gap-5 text-xs text-[#555e50] md:flex-row md:items-center">
          <p class="uppercase tracking-[0.2em]">Mở cửa mỗi ngày · 09:00 đến 21:00</p>
          <div class="flex flex-wrap gap-x-8 gap-y-2">
            <span>Thảo Điền, TP. Hồ Chí Minh</span>
            <span>Phục vụ theo lịch hẹn</span>
          </div>
        </div>
      </section>

      <section id="lieu-trinh" class="px-5 py-24 md:px-10 md:py-32 lg:px-14 lg:py-40">
        <div class="mx-auto max-w-[1400px]">
          <div class="grid gap-12 border-b border-[#77806d]/30 pb-14 lg:grid-cols-[0.8fr_1.2fr]">
            <p class="section-label">Các liệu trình</p>
            <div>
              <h2 class="max-w-[780px] font-display text-5xl font-light leading-[0.98] tracking-[-0.04em] md:text-7xl">
                Chọn theo điều cơ thể đang cần.
              </h2>
              <p class="mt-7 max-w-[56ch] leading-7 text-[#62675e]">
                Không có một công thức chung. Kỹ thuật viên sẽ lắng nghe và điều chỉnh nhịp độ, lực tay cùng sản phẩm cho từng lần bạn ghé.
              </p>
            </div>
          </div>

          <div>
            <article
              v-for="service in services"
              :key="service.number"
              class="service-row group grid gap-5 border-b border-[#77806d]/30 py-8 md:grid-cols-[0.35fr_1.1fr_1fr_auto] md:items-center md:py-10"
            >
              <span class="font-display text-xl italic text-[#808777]">{{ service.number }}</span>
              <h3 class="font-display text-3xl font-light tracking-[-0.025em] md:text-4xl">{{ service.name }}</h3>
              <p class="max-w-[42ch] text-sm leading-6 text-[#696e65]">{{ service.description }}</p>
              <div class="flex items-center justify-between gap-8 md:justify-end">
                <div class="text-right text-xs leading-5 text-[#62675e]">
                  <span class="block">{{ service.duration }}</span>
                  <span class="block font-semibold text-[#35402f]">{{ service.price }}</span>
                </div>
                <button
                  type="button"
                  class="grid size-11 shrink-0 place-items-center rounded-full border border-[#596650]/40 transition duration-500 group-hover:rotate-45 group-hover:bg-[#4c5d43] group-hover:text-[#f4efe5] active:scale-[0.96]"
                  :aria-label="`Đặt liệu trình ${service.name}`"
                  @click="openBooking(service.name)"
                >
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="khong-gian" class="bg-[#33402f] px-5 py-24 text-[#f1ecdf] md:px-10 md:py-32 lg:px-14 lg:py-40">
        <div class="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div class="relative min-h-[560px] overflow-hidden rounded-[0.35rem] bg-[#475242]">
            <img
              src="/images/mien-spa-hero.png"
              alt="Ánh sáng tự nhiên trong phòng trị liệu MIÊN"
              class="absolute inset-0 h-full w-full scale-[1.18] object-cover object-left opacity-80"
            >
            <div class="absolute inset-0 bg-[#1e271c]/25" />
            <p class="absolute bottom-7 left-7 max-w-[16rem] text-xs leading-5 text-[#f1ecdf]/80">
              Linen tự nhiên, ánh sáng dịu và mùi hương gỗ rất nhẹ.
            </p>
          </div>

          <div id="cau-chuyen" class="pb-4 lg:pb-12 lg:pl-[5vw]">
            <p class="mb-9 text-[0.69rem] font-semibold uppercase tracking-[0.28em] text-[#bcc5b4]">Tinh thần MIÊN</p>
            <h2 class="font-display text-5xl font-light leading-[0.98] tracking-[-0.04em] md:text-7xl">
              Ít hơn,<br><span class="italic text-[#c7cdbf]">nhưng đúng hơn.</span>
            </h2>
            <p class="mt-10 max-w-[45ch] text-sm leading-7 text-[#d0d5cb]">
              Chúng tôi bỏ bớt tiếng động, mùi hương nồng và những bước chăm sóc không cần thiết. Mỗi buổi trị liệu chỉ giữ lại điều có ích cho cơ thể bạn lúc ấy.
            </p>
            <dl class="mt-12 grid grid-cols-2 gap-x-8 gap-y-9 border-t border-[#d7dccf]/20 pt-8">
              <div>
                <dt class="font-display text-4xl font-light">12</dt>
                <dd class="mt-2 text-xs text-[#b8c0b2]">khách tối đa mỗi ngày</dd>
              </div>
              <div>
                <dt class="font-display text-4xl font-light">20′</dt>
                <dd class="mt-2 text-xs text-[#b8c0b2]">khoảng nghỉ giữa hai lịch</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section class="px-5 py-24 md:px-10 md:py-32 lg:px-14 lg:py-40">
        <div class="mx-auto max-w-[1400px]">
          <p class="section-label mb-14">Lời nhắn từ khách</p>
          <blockquote class="ml-auto max-w-[1040px]">
            <p class="font-display text-[clamp(2.6rem,5.2vw,5.8rem)] font-light leading-[1.02] tracking-[-0.045em]">
              “Tôi đến với đôi vai rất nặng. Chín mươi phút sau, cảm giác đầu tiên không phải là buồn ngủ, mà là <span class="italic text-[#66715d]">được trở về với mình.</span>”
            </p>
            <footer class="mt-9 flex items-center gap-4 text-xs text-[#62675e]">
              <span class="h-px w-12 bg-[#66715d]" />
              Minh Thư, khách của MIÊN từ 2024
            </footer>
          </blockquote>
        </div>
      </section>

      <section class="px-5 pb-5 md:px-10 md:pb-10 lg:px-14 lg:pb-14">
        <div class="mx-auto grid max-w-[1400px] gap-10 rounded-[0.4rem] bg-[#d9d4c4] px-6 py-16 md:px-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-20 lg:py-24">
          <div>
            <p class="section-label mb-8">Dành thời gian cho mình</p>
            <h2 class="max-w-[800px] font-display text-5xl font-light leading-[0.95] tracking-[-0.045em] md:text-7xl">
              Hẹn một khoảng nghỉ trong tuần này.
            </h2>
          </div>
          <div class="lg:pb-2">
            <p class="mb-7 max-w-[42ch] text-sm leading-6 text-[#5c6358]">
              Để lại thời gian phù hợp. MIÊN sẽ gọi lại trong giờ mở cửa để tư vấn và xác nhận phòng.
            </p>
            <button class="button-primary" type="button" @click="openBooking()">Gửi yêu cầu đặt lịch <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      </section>
    </main>

    <footer class="px-5 py-14 md:px-10 lg:px-14">
      <div class="mx-auto grid max-w-[1400px] gap-10 border-t border-[#77806d]/30 pt-10 md:grid-cols-[1fr_auto_auto] md:items-end md:gap-16">
        <div>
          <p class="font-display text-5xl font-light tracking-[-0.04em]">MIÊN</p>
          <p class="mt-3 text-xs text-[#656b61]">Một khoảng lặng cho cơ thể.</p>
        </div>
        <div class="text-xs leading-6 text-[#596056]">
          <p>18 Nguyễn Ư Dĩ, Thảo Điền</p>
          <p>TP. Hồ Chí Minh</p>
        </div>
        <div class="text-xs leading-6 text-[#596056]">
          <a href="tel:02873028628" class="block hover:text-[#2f392a]">028 7302 8628</a>
          <a href="mailto:hello@mien-spa.vn" class="block hover:text-[#2f392a]">hello@mien-spa.vn</a>
        </div>
      </div>
    </footer>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isBookingOpen" class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <button class="absolute inset-0 cursor-default bg-[#1d241b]/55 backdrop-blur-[3px]" aria-label="Đóng bảng đặt lịch" @click="closeBooking" />
          <aside class="absolute right-0 top-0 h-full w-full max-w-[580px] overflow-y-auto bg-[#f3efe5] px-6 py-7 shadow-[-24px_0_70px_rgba(38,45,34,0.16)] md:px-12 md:py-10">
            <div class="mb-14 flex items-center justify-between">
              <span class="text-[0.72rem] font-semibold tracking-[0.24em]">MIÊN</span>
              <button type="button" class="grid size-10 place-items-center rounded-full border border-[#596650]/35 text-xl transition hover:rotate-90 hover:bg-[#e4dfd2]" aria-label="Đóng" @click="closeBooking">×</button>
            </div>

            <div v-if="bookingResult" class="flex min-h-[65vh] flex-col justify-center">
              <span class="mb-8 grid size-14 place-items-center rounded-full bg-[#4c5d43] text-xl text-[#f4efe5]">✓</span>
              <p class="section-label mb-5">Đã nhận yêu cầu</p>
              <h2 id="booking-title" class="font-display text-5xl font-light leading-none tracking-[-0.04em]">Hẹn gặp bạn<br>tại MIÊN.</h2>
              <p class="mt-7 max-w-[42ch] leading-7 text-[#62675e]">{{ bookingResult.message }}</p>
              <p class="mt-5 text-xs text-[#757b70]">Mã yêu cầu: {{ bookingResult.reference }}</p>
              <button type="button" class="button-primary mt-10 self-start" @click="closeBooking">Hoàn tất</button>
            </div>

            <form v-else novalidate @submit.prevent="submitBooking">
              <p class="section-label mb-5">Đặt lịch</p>
              <h2 id="booking-title" class="font-display text-5xl font-light leading-none tracking-[-0.04em]">Bạn muốn ghé<br>vào lúc nào?</h2>
              <p class="mt-6 max-w-[45ch] text-sm leading-6 text-[#666c62]">MIÊN sẽ gọi lại để hiểu điều cơ thể bạn đang cần và xác nhận khung giờ phù hợp.</p>

              <div class="mt-10 grid gap-6">
                <label class="field-block">
                  <span>Họ và tên</span>
                  <input v-model="form.name" type="text" autocomplete="name" placeholder="Tên của bạn" :aria-invalid="Boolean(errors.name)">
                  <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
                </label>

                <label class="field-block">
                  <span>Số điện thoại</span>
                  <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="090 123 4567" :aria-invalid="Boolean(errors.phone)">
                  <small v-if="errors.phone" class="field-error">{{ errors.phone }}</small>
                </label>

                <div class="grid gap-6 sm:grid-cols-2">
                  <label class="field-block">
                    <span>Liệu trình</span>
                    <select v-model="form.service" :aria-invalid="Boolean(errors.service)">
                      <option value="" disabled>Chọn liệu trình</option>
                      <option v-for="service in services" :key="service.number" :value="service.name">{{ service.name }}</option>
                    </select>
                    <small v-if="errors.service" class="field-error">{{ errors.service }}</small>
                  </label>

                  <label class="field-block">
                    <span>Ngày bạn muốn ghé</span>
                    <input v-model="form.date" type="date" :min="today" :aria-invalid="Boolean(errors.date)">
                    <small v-if="errors.date" class="field-error">{{ errors.date }}</small>
                  </label>
                </div>

                <label class="field-block">
                  <span>Lời nhắn <i>không bắt buộc</i></span>
                  <textarea v-model="form.note" rows="3" placeholder="Chia sẻ điều bạn muốn MIÊN lưu ý" />
                </label>
              </div>

              <p v-if="submitError" class="mt-6 border-l-2 border-[#8b5148] pl-4 text-sm leading-6 text-[#7b4139]">{{ submitError }}</p>

              <button class="button-primary mt-8 w-full justify-center" type="submit" :disabled="isSubmitting">
                <template v-if="isSubmitting">
                  <span class="loading-line" />
                  Đang gửi yêu cầu
                </template>
                <template v-else>Gửi yêu cầu đặt lịch <span aria-hidden="true">↗</span></template>
              </button>
              <p class="mt-4 text-center text-[0.7rem] leading-5 text-[#777c72]">Bằng việc gửi yêu cầu, bạn đồng ý để MIÊN liên hệ xác nhận lịch hẹn.</p>
            </form>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
