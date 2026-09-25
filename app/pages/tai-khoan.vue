<script setup lang="ts">
import CustomerFeedbackPanel from "./danh-gia.vue";
import CustomerAppointmentsPanel from "./lich-cua-toi.vue";
import CustomerOrdersPanel from "./don-hang/index.vue";
import type { CustomerAccount } from "~/composables/useCustomerAuth";
import type { CommonFormField, CommonFormModel } from "~/types/common-form";

useStoreSeo(
  "Hồ sơ của tôi | MIÊN Spa",
  "Cập nhật hồ sơ, theo dõi điểm thành viên và bảo mật tài khoản MIÊN Spa.",
  "/tai-khoan",
);

type Profile = {
  id: number;
  name: string;
  phone: string;
  email: string;
  gender: "female" | "male" | "other" | null;
  dateOfBirth: string | null;
  address: string;
  marketingConsent: boolean;
  loyaltyPoints: number;
  totalSpent: number;
  hasPassword: boolean;
  createdAt: string;
  stats: { completedAppointments: number; upcomingAppointments: number };
};
type ProfileForm = CommonFormModel & {
  name: string;
  phone: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  marketingConsent: boolean;
};
type PasswordForm = CommonFormModel & {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AccountTab = "profile" | "appointments" | "orders" | "feedback";

const route = useRoute();
const { customer, loaded } = useCustomerAuth();
const { data: meResponse } = await useAsyncData("profile-customer-me", () =>
  $fetch<{ data: CustomerAccount | null }>("/api/customer-auth/me"),
);
customer.value = meResponse.value?.data ?? null;
loaded.value = true;
if (!customer.value) {
  await navigateTo({
    path: "/dang-nhap",
    query: { redirect: route.fullPath },
  });
}
const {
  data: profileResponse,
  pending,
  error: profileLoadError,
  refresh,
} = await useAsyncData(
  "customer-profile",
  () =>
    customer.value
      ? $fetch<{ data: Profile }>("/api/customer/profile")
      : Promise.resolve(null),
  { watch: [customer] },
);
const profile = computed(() => profileResponse.value?.data);
const form = reactive<ProfileForm>({
  name: "",
  phone: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  marketingConsent: false,
});
const passwordForm = reactive<PasswordForm>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const passwordCommonForm = ref<{ resetValidation: () => void } | null>(null);
const profileBusy = ref(false);
const passwordBusy = ref(false);
const profileMessage = ref("");
const passwordMessage = ref("");
const profileError = ref("");
const passwordError = ref("");

const activeTab = computed<AccountTab>(() => {
  if (route.query.tab === "lich-hen") return "appointments";
  if (route.query.tab === "don-hang") return "orders";
  if (route.query.tab === "danh-gia") return "feedback";
  return "profile";
});

const activePanel = computed(() => {
  if (activeTab.value === "appointments") return CustomerAppointmentsPanel;
  if (activeTab.value === "orders") return CustomerOrdersPanel;
  if (activeTab.value === "feedback") return CustomerFeedbackPanel;
  return null;
});

const pageHeading = computed(() => {
  if (activeTab.value === "appointments") return "Lịch hẹn của bạn.";
  if (activeTab.value === "orders") return "Đơn hàng của bạn.";
  if (activeTab.value === "feedback") return "Đánh giá của bạn.";
  return `Hồ sơ của ${profile.value?.name || customer.value?.name || "bạn"}.`;
});

watch(
  profile,
  (value) => {
    if (!value) return;
    Object.assign(form, {
      name: value.name,
      phone: value.phone,
      email: value.email,
      gender: value.gender ?? "",
      dateOfBirth: value.dateOfBirth ?? "",
      address: value.address,
      marketingConsent: value.marketingConsent,
    });
  },
  { immediate: true },
);

const profileFields = computed<CommonFormField[]>(() => [
  {
    name: "name",
    label: "Họ và tên",
    type: "text",
    required: true,
    minLength: 2,
    attrs: { autocomplete: "name" },
    messages: {
      required: "Vui lòng nhập họ và tên.",
      minLength: "Họ tên cần có ít nhất 2 ký tự.",
    },
  },
  {
    name: "phone",
    label: "Số điện thoại",
    type: "tel",
    disabled: true,
    hint: "Số điện thoại dùng để đăng nhập.",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "ten@email.com",
    attrs: { autocomplete: "email" },
  },
  {
    name: "gender",
    label: "Giới tính",
    type: "select",
    placeholder: "Không chia sẻ",
    options: [
      { label: "Nữ", value: "female" },
      { label: "Nam", value: "male" },
      { label: "Khác", value: "other" },
    ],
  },
  { name: "dateOfBirth", label: "Ngày sinh", type: "date" },
  {
    name: "address",
    label: "Địa chỉ",
    type: "text",
    placeholder: "Địa chỉ liên hệ",
    columns: { sm: 2 },
    attrs: { autocomplete: "street-address" },
    maxLength: 255,
  },
  {
    name: "marketingConsent",
    label: "Nhận thông tin về ưu đãi và nội dung chăm sóc phù hợp từ MIÊN.",
    type: "checkbox",
    columns: { sm: 2 },
  },
]);

const passwordFields = computed<CommonFormField[]>(() => [
  {
    name: "currentPassword",
    label: "Mật khẩu hiện tại",
    type: "password",
    required: true,
    showWhen: () => Boolean(profile.value?.hasPassword),
    attrs: { autocomplete: "current-password" },
    messages: { required: "Vui lòng nhập mật khẩu hiện tại." },
  },
  {
    name: "newPassword",
    label: "Mật khẩu mới",
    type: "password",
    required: true,
    minLength: 8,
    pattern: /^(?=.*[A-Za-zÀ-ỹ])(?=.*\d).+$/,
    hint: "Tối thiểu 8 ký tự, gồm chữ và số.",
    attrs: { autocomplete: "new-password" },
    messages: {
      required: "Vui lòng nhập mật khẩu mới.",
      minLength: "Mật khẩu mới cần ít nhất 8 ký tự.",
      pattern: "Mật khẩu mới cần gồm cả chữ và số.",
    },
  },
  {
    name: "confirmPassword",
    label: "Xác nhận mật khẩu mới",
    type: "password",
    required: true,
    attrs: { autocomplete: "new-password" },
    validate: (value, values) =>
      value === values.newPassword || "Mật khẩu xác nhận chưa khớp.",
    messages: { required: "Vui lòng xác nhận mật khẩu mới." },
  },
]);

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
const tier = computed(() =>
  (profile.value?.totalSpent ?? 0) >= 10_000_000
    ? "An"
    : (profile.value?.totalSpent ?? 0) >= 3_000_000
      ? "Mộc"
      : "Khách mới",
);
const nextTier = computed(() =>
  tier.value === "Khách mới"
    ? {
        name: "Mộc",
        remaining: Math.max(0, 3_000_000 - (profile.value?.totalSpent ?? 0)),
      }
    : tier.value === "Mộc"
      ? {
          name: "An",
          remaining: Math.max(0, 10_000_000 - (profile.value?.totalSpent ?? 0)),
        }
      : null,
);

function errorText(value: unknown) {
  const failure = value as {
    data?: { statusMessage?: string };
    statusMessage?: string;
    message?: string;
  };
  return (
    failure.data?.statusMessage ??
    failure.statusMessage ??
    failure.message ??
    "Chưa thể thực hiện lúc này."
  );
}

async function saveProfile() {
  profileBusy.value = true;
  profileError.value = "";
  profileMessage.value = "";
  try {
    await $fetch("/api/customer/profile", {
      method: "PATCH",
      body: {
        name: form.name,
        email: form.email,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        address: form.address,
        marketingConsent: form.marketingConsent,
      },
    });
    profileMessage.value = "Hồ sơ đã được cập nhật.";
    if (customer.value)
      customer.value = {
        ...customer.value,
        name: form.name,
        email: form.email,
      };
    await refresh();
  } catch (error) {
    profileError.value = errorText(error);
  } finally {
    profileBusy.value = false;
  }
}

async function changePassword() {
  passwordError.value = "";
  passwordMessage.value = "";
  passwordBusy.value = true;
  try {
    await $fetch("/api/customer/change-password", {
      method: "POST",
      body: passwordForm,
    });
    passwordMessage.value = profile.value?.hasPassword
      ? "Mật khẩu đã được thay đổi. Các phiên đăng nhập khác đã được đăng xuất."
      : "Mật khẩu đăng nhập đã được tạo.";
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
    passwordCommonForm.value?.resetValidation();
    await refresh();
  } catch (error) {
    passwordError.value = errorText(error);
  } finally {
    passwordBusy.value = false;
  }
}

function updateProfileForm(values: CommonFormModel) {
  Object.assign(form, values);
}

function updatePasswordForm(values: CommonFormModel) {
  Object.assign(passwordForm, values);
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main
      class="mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10 md:pt-16 lg:px-14"
    >
      <template v-if="customer">
        <header
          class="grid gap-7 border-b border-[#78816f]/25 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <div>
            <p class="section-label">Tài khoản khách hàng</p>
            <h1
              class="mt-3 font-display text-5xl font-light tracking-[-0.04em]"
            >
              {{ pageHeading }}
            </h1>
          </div>
          <CustomerAccountTabs />
        </header>

        <Transition name="account-panel" mode="out-in">
          <component
            :is="activePanel"
            v-if="activePanel"
            :key="activeTab"
            embedded
          />
          <div v-else key="profile" class="account-profile-panel">
            <div
              v-if="pending"
              class="mt-8 space-y-4"
              aria-live="polite"
              aria-label="Đang tải hồ sơ"
            >
              <div class="h-24 animate-pulse bg-[#e5dfd1]" />
              <div class="h-56 animate-pulse bg-[#e5dfd1]" />
            </div>
            <section
              v-else-if="profileLoadError"
              class="mt-8 border border-[#a96e64]/30 bg-[#f0dfda] p-6 text-[#78473f]"
              role="alert"
            >
              <h2 class="text-lg font-semibold">Chưa thể tải hồ sơ.</h2>
              <p class="mt-2 text-sm">{{ errorText(profileLoadError) }}</p>
              <AppButton
                class="mt-5"
                label="Thử lại"
                variant="secondary"
                icon="refresh"
                @click="refresh"
              />
            </section>
            <template v-else-if="profile">
          <section class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article class="bg-[#e5dfd1] p-6">
              <p class="section-label">Hạng thành viên</p>
              <p class="mt-3 text-2xl font-semibold">{{ tier }}</p>
            </article>
            <article class="bg-[#e5dfd1] p-6">
              <p class="section-label">Điểm MIÊN</p>
              <p class="mt-3 text-2xl font-semibold tabular-nums">
                {{ profile.loyaltyPoints.toLocaleString("vi-VN") }}
              </p>
            </article>
            <article class="bg-[#e5dfd1] p-6">
              <p class="section-label">Liệu trình hoàn tất</p>
              <p class="mt-3 text-2xl font-semibold tabular-nums">
                {{ profile.stats.completedAppointments }}
              </p>
            </article>
            <article class="bg-[#e5dfd1] p-6">
              <p class="section-label">Lịch sắp tới</p>
              <p class="mt-3 text-2xl font-semibold tabular-nums">
                {{ profile.stats.upcomingAppointments }}
              </p>
            </article>
          </section>

          <section
            class="mt-6 bg-[#4c5d43] p-6 text-[#f5f0e6] md:flex md:items-center md:justify-between md:gap-8"
          >
            <div>
              <p
                class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] opacity-65"
              >
                Hành trình thành viên
              </p>
              <p class="mt-2 text-lg">
                Tổng đồng hành: <strong>{{ money(profile.totalSpent) }}</strong>
              </p>
            </div>
            <p v-if="nextTier" class="mt-4 text-sm opacity-75 md:mt-0">
              Còn {{ money(nextTier.remaining) }} để lên hạng
              {{ nextTier.name }}.
            </p>
            <p v-else class="mt-4 text-sm opacity-75 md:mt-0">
              Bạn đang ở hạng thành viên cao nhất.
            </p>
          </section>

          <div class="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <CommonForm
              :model-value="form"
              :fields="profileFields"
              :columns="{ base: 1, sm: 2 }"
              :disabled="profileBusy"
              class="border border-[#78816f]/20 bg-[#f8f4eb] p-6 md:p-8"
              @update:model-value="updateProfileForm"
              @submit="saveProfile"
            >
              <p class="section-label">Thông tin cá nhân</p>
              <h2 class="mt-3 text-2xl font-semibold">
                Điều MIÊN nên nhớ về bạn
              </h2>
              <template #messages>
                <div class="mt-3 min-h-6" aria-live="polite">
                  <p
                    v-if="profileError"
                    class="text-sm text-[#8b5148]"
                    role="alert"
                  >
                    {{ profileError }}
                  </p>
                  <p
                    v-else-if="profileMessage"
                    class="text-sm text-[#56704f]"
                    role="status"
                  >
                    {{ profileMessage }}
                  </p>
                </div>
              </template>
              <template #actions>
                <AppButton
                  class="mt-3"
                  :label="profileBusy ? 'Đang lưu…' : 'Lưu hồ sơ'"
                  icon="check"
                  type="submit"
                  :disabled="profileBusy"
                />
              </template>
            </CommonForm>

            <CommonForm
              ref="passwordCommonForm"
              :model-value="passwordForm"
              :fields="passwordFields"
              :disabled="passwordBusy"
              class="self-start border border-[#78816f]/20 bg-[#ece7da] p-6 md:p-8"
              @update:model-value="updatePasswordForm"
              @submit="changePassword"
            >
              <p class="section-label">Bảo mật</p>
              <h2 class="mt-3 text-2xl font-semibold">
                {{
                  profile.hasPassword
                    ? "Đổi mật khẩu"
                    : "Tạo mật khẩu đăng nhập"
                }}
              </h2>
              <p class="mt-3 text-xs leading-5 text-[#737a70]">
                Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.
              </p>
              <template #messages>
                <div class="mt-3 min-h-6" aria-live="polite">
                  <p
                    v-if="passwordError"
                    class="text-sm text-[#8b5148]"
                    role="alert"
                  >
                    {{ passwordError }}
                  </p>
                  <p
                    v-else-if="passwordMessage"
                    class="text-sm text-[#56704f]"
                    role="status"
                  >
                    {{ passwordMessage }}
                  </p>
                </div>
              </template>
              <template #actions>
                <AppButton
                  class="mt-3"
                  :label="
                    passwordBusy
                      ? 'Đang lưu…'
                      : profile.hasPassword
                        ? 'Đổi mật khẩu'
                        : 'Tạo mật khẩu'
                  "
                  icon="lock"
                  type="submit"
                  :disabled="passwordBusy"
                />
              </template>
            </CommonForm>
          </div>
            </template>
          </div>
        </Transition>
      </template>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.account-panel-enter-active,
.account-panel-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.account-panel-enter-from,
.account-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .account-panel-enter-active,
  .account-panel-leave-active {
    transition: none;
  }

  .account-panel-enter-from,
  .account-panel-leave-to {
    transform: none;
  }
}
</style>
