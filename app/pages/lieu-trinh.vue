<script setup lang="ts">
type Service = {
  id: number;
  code: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  category: string;
};

useStoreSeo(
  "Liệu trình chăm sóc cơ thể và làn da | MIÊN Spa",
  "Khám phá các liệu trình tại MIÊN Spa, xem thời lượng, mức giá và chọn lịch hẹn phù hợp với điều cơ thể đang cần.",
  "/lieu-trinh",
);

const {
  data: response,
  pending,
  error,
  refresh,
} = await useAsyncData("public-services", () =>
  $fetch<{ data: Service[] }>("/api/services"),
);
const services = computed(() => response.value?.data ?? []);
const categories = computed(() => [
  "Tất cả",
  ...new Set(services.value.map((item) => item.category)),
]);
const activeCategory = ref("Tất cả");
const search = ref("");
const { openBooking } = useBookingDrawer();
const fallbackDescription =
  "Một nghi thức chăm sóc được điều chỉnh theo trạng thái cơ thể và làn da trong ngày.";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
const visibleServices = computed(() => {
  const term = normalize(search.value.trim());
  return services.value.filter(
    (item) =>
      (activeCategory.value === "Tất cả" ||
        item.category === activeCategory.value) &&
      (!term ||
        normalize(`${item.name} ${item.description} ${item.category}`).includes(
          term,
        )),
  );
});
const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
const numberLabel = (index: number) => String(index + 1).padStart(2, "0");
function resetFilters() {
  activeCategory.value = "Tất cả";
  search.value = "";
}
</script>

<template>
  <div class="min-h-[100dvh] overflow-x-hidden bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main>
      <SitePageHero
        eyebrow="Liệu trình tại MIÊN"
        title="Chọn theo điều"
        accent-title="cơ thể đang cần."
        description="Mỗi lần ghé bắt đầu bằng một cuộc trò chuyện ngắn. Kỹ thuật viên sẽ điều chỉnh nhịp độ, lực tay và sản phẩm theo trạng thái của bạn trong ngày."
        :breadcrumbs="[{ label: 'Trang chủ', to: '/' }, { label: 'Liệu trình' }]"
      />
      <section
        class="border-y border-[#78816f]/25 bg-[#e9e4d8] px-5 py-7 md:px-10 lg:px-14"
      >
        <div
          class="mx-auto flex max-w-[1400px] flex-col gap-5 md:flex-row md:items-center md:justify-between"
        >
          <p
            class="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#60695b]"
          >
            {{ services.length }} lựa chọn chăm sóc
          </p>
          <div class="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#687064]">
            <span>Phục vụ theo lịch hẹn</span><span>09:00–21:00 mỗi ngày</span>
          </div>
        </div>
      </section>

      <section class="px-5 py-20 md:px-10 md:py-28 lg:px-14 lg:py-32">
        <div class="mx-auto max-w-[1400px]">
          <div
            class="grid gap-6 border-b border-[#78816f]/25 pb-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end"
          >
            <div>
              <p class="section-label">Tìm một khoảng phù hợp</p>
              <p class="mt-4 text-xs text-[#71786e]" role="status">
                {{ visibleServices.length }} liệu trình phù hợp
              </p>
            </div>
            <label class="field-block max-w-xl lg:justify-self-end lg:w-full"
              ><span>Tìm theo tên hoặc nhu cầu</span>
              <CommonInput
                v-model="search"
                type="search"
                placeholder="Ví dụ: làn da, thư giãn, vai gáy…"
              />
            </label>
          </div>
          <div
            class="flex max-w-full gap-2 overflow-x-auto border-b border-[#78816f]/20 py-6"
          >
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              class="store-filter shrink-0"
              :class="activeCategory === category ? 'store-filter--active' : ''"
              :aria-pressed="activeCategory === category"
              @click="activeCategory = category"
            >
              {{ category }}
            </button>
          </div>
          <div
            v-if="pending"
            class="divide-y divide-[#78816f]/20"
            aria-label="Đang tải liệu trình"
          >
            <div
              v-for="index in 4"
              :key="index"
              class="grid gap-5 py-9 md:grid-cols-[80px_1fr_0.8fr_150px]"
            >
              <span
                class="h-5 w-9 animate-pulse rounded-full bg-[#ddd8cc]"
              /><span
                class="h-10 w-2/3 animate-pulse rounded-full bg-[#ddd8cc]"
              /><span class="h-16 animate-pulse rounded bg-[#e3ded2]" />
            </div>
          </div>
          <div
            v-else-if="error"
            class="border-b border-[#94685f]/25 py-16 text-center"
          >
            <p class="text-sm font-semibold text-[#754b43]">
              Chưa thể tải danh sách liệu trình.
            </p>
            <button
              type="button"
              class="text-link mt-4"
              @click="() => refresh()"
            >
              Thử lại
            </button>
          </div>
          <TransitionGroup
            v-else-if="visibleServices.length"
            name="service-list"
            tag="div"
          >
            <article
              v-for="(service, index) in visibleServices"
              :id="service.slug"
              :key="service.id"
              class="service-entry group grid scroll-mt-8 gap-6 border-b border-[#78816f]/25 py-9 md:grid-cols-[80px_1.05fr_0.9fr_auto] md:items-center md:py-12"
            >
              <div class="flex items-center justify-between md:block">
                <span class="font-display text-xl italic text-[#818879]">{{
                  numberLabel(index)
                }}</span
                ><span
                  class="text-[0.62rem] uppercase tracking-[0.14em] text-[#818879] md:hidden"
                  >{{ service.category }}</span
                >
              </div>
              <div>
                <p
                  class="hidden text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#768071] md:block"
                >
                  {{ service.category }}
                </p>
                <h2
                  class="mt-2 font-display text-4xl font-light leading-none tracking-[-0.035em] md:text-5xl"
                >
                  {{ service.name }}
                </h2>
              </div>
              <p class="max-w-[48ch] text-sm leading-7 text-[#676e64]">
                {{ service.description || fallbackDescription }}
              </p>
              <div
                class="flex items-center justify-between gap-7 md:justify-end"
              >
                <div
                  class="min-w-[112px] text-right text-xs leading-6 text-[#60685d]"
                >
                  <span class="block">{{ service.durationMinutes }} phút</span
                  ><strong class="block text-sm text-[#35402f]">{{
                    money(service.price)
                  }}</strong>
                </div>
                <button
                  type="button"
                  class="grid size-12 shrink-0 place-items-center rounded-full border border-[#596650]/40 transition duration-500 group-hover:rotate-45 group-hover:bg-[#4c5d43] group-hover:text-[#f4efe5] active:scale-[0.96]"
                  :aria-label="`Đặt lịch ${service.name}`"
                  @click="openBooking(service.id)"
                >
                  <AppIcon name="arrow" :size="17" />
                </button>
              </div>
            </article>
          </TransitionGroup>
          <div v-else class="border-b border-[#78816f]/20 py-16 text-center">
            <p class="text-sm text-[#6c7368]">
              Không tìm thấy liệu trình phù hợp.
            </p>
            <button type="button" class="text-link mt-4" @click="resetFilters">
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </section>
      <section
        class="bg-[#34412f] px-5 py-20 text-[#f1ecdf] md:px-10 md:py-28 lg:px-14"
      >
        <div
          class="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end"
        >
          <h2
            class="max-w-[780px] font-display text-5xl font-light leading-[0.95] tracking-[-0.04em] md:text-7xl"
          >
            Chưa biết nên bắt đầu từ đâu?
          </h2>
          <div>
            <p class="max-w-[44ch] text-sm leading-7 text-[#cdd4c8]">
              Chọn một khung giờ và kể MIÊN điều bạn đang cảm thấy. Chúng tôi sẽ
              cùng bạn chọn liệu trình khi gặp.
            </p>
            <button
              type="button"
              class="mt-7 inline-flex items-center gap-4 rounded-full border border-[#dbe1d5]/35 px-5 py-3.5 text-xs font-semibold transition hover:bg-[#f0ece2] hover:text-[#34412f] active:scale-[0.98]"
              @click="openBooking()"
            >
              Đặt lịch tư vấn
              <AppIcon name="arrow" :size="16" />
            </button>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.service-entry {
  animation: service-enter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.service-list-enter-active,
.service-list-leave-active,
.service-list-move {
  transition:
    opacity 0.24s ease,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.service-list-enter-from,
.service-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes service-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .service-entry {
    animation: none;
  }

  .service-list-enter-active,
  .service-list-leave-active,
  .service-list-move {
    transition: none;
  }
}
</style>
