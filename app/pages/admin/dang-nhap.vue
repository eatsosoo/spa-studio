<script setup lang="ts">
import AppButton from "~/components/common/AppButton.vue";
import type { AdminSessionUser } from "~/composables/useAdminAuth";

definePageMeta({ layout: false });
useHead({ title: "Đăng nhập quản trị | MIÊN Spa" });

const route = useRoute();
const { user } = useAdminAuth();
const form = reactive({ identifier: "", password: "" });
const errors = reactive<Record<string, string>>({});
const apiError = ref("");
const pending = ref(false);
const showPassword = ref(false);

async function submit() {
  Object.keys(errors).forEach((key) => delete errors[key]);
  apiError.value = "";
  if (!form.identifier.trim())
    errors.identifier = "Vui lòng nhập tên đăng nhập hoặc email.";
  if (!form.password) errors.password = "Vui lòng nhập mật khẩu.";
  if (Object.keys(errors).length) return;

  pending.value = true;
  try {
    const response = await $fetch<{ data: AdminSessionUser }>(
      "/api/auth/login",
      { method: "POST", body: form },
    );
    user.value = response.data;
    const redirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/admin")
        ? route.query.redirect
        : "/admin";
    await navigateTo(redirect);
  } catch (failure) {
    const error = failure as {
      data?: { statusMessage?: string };
      statusMessage?: string;
    };
    apiError.value =
      error.data?.statusMessage ??
      error.statusMessage ??
      "Không thể đăng nhập. Vui lòng thử lại.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main
    class="grid min-h-[100dvh] bg-[#f3efe5] text-[#30382d] lg:grid-cols-[0.82fr_1.18fr]"
  >
    <section
      class="relative hidden overflow-hidden bg-[#303b2c] px-12 py-14 text-[#f3eee4] lg:flex lg:flex-col lg:justify-between xl:px-16"
    >
      <div
        class="pointer-events-none absolute -right-24 top-[18%] size-80 rounded-full border border-[#d7dfd0]/10"
      />
      <div
        class="pointer-events-none absolute -right-4 top-[29%] size-44 rounded-tl-full rounded-br-full bg-[#aeb9a4]/10 motion-safe:animate-[auth-float_7s_ease-in-out_infinite]"
      />
      <NuxtLink to="/" class="relative flex items-center gap-3 text-[#f5f0e6]">
        <span
          class="grid size-9 place-items-center rounded-full border border-[#dce3d7]/35"
          ><span
            class="h-3.5 w-3.5 rounded-tl-full rounded-br-full bg-[#cbd3c4]"
        /></span>
        <span class="text-xs font-semibold tracking-[0.28em]">MIÊN</span>
      </NuxtLink>
      <div class="relative max-w-md pb-[8vh]">
        <p
          class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#aeb8a8]"
        >
          Không gian vận hành
        </p>
        <h1
          class="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-5xl"
        >
          Một nhịp quản lý<br />nhẹ và rõ ràng.
        </h1>
        <p class="mt-6 max-w-[38ch] text-sm leading-7 text-[#b8c0b3]">
          Theo dõi lịch hẹn, khách hàng và đội ngũ trong cùng một không gian
          được thiết kế cho sự tập trung.
        </p>
      </div>
      <p class="relative text-[0.65rem] leading-5 text-[#909b8b]">
        Khu vực dành riêng cho đội ngũ quản trị MIÊN.
      </p>
    </section>

    <section
      class="flex min-h-[100dvh] items-center px-5 py-10 sm:px-10 lg:px-[10vw]"
    >
      <div class="mx-auto w-full max-w-md reveal-up">
        <NuxtLink to="/" class="mb-14 flex items-center gap-3 lg:hidden"
          ><span
            class="grid size-9 place-items-center rounded-full border border-[#596650]/30"
            ><span
              class="h-3.5 w-3.5 rounded-tl-full rounded-br-full bg-[#596650]" /></span
          ><span class="text-xs font-semibold tracking-[0.28em]"
            >MIÊN</span
          ></NuxtLink
        >
        <p
          class="text-[0.65rem] font-semibold uppercase tracking-[0.19em] text-[#74806e]"
        >
          Quản trị MIÊN Spa
        </p>
        <h2
          class="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl"
        >
          Chào bạn quay lại.
        </h2>
        <p class="mt-3 text-sm leading-6 text-[#737a70]">
          Đăng nhập để tiếp tục công việc hôm nay.
        </p>

        <form class="mt-10 grid gap-6" novalidate @submit.prevent="submit">
          <div
            v-if="apiError"
            class="rounded-sm border border-[#a96e64]/30 bg-[#f0dfda] px-4 py-3 text-xs leading-5 text-[#78473f]"
            role="alert"
          >
            {{ apiError }}
          </div>
          <label class="admin-field">
            <span>Tên đăng nhập hoặc email</span>
            <span class="relative"
              ><AppIcon
                name="mail"
                :size="17"
                class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#778170]" /><input
                v-model="form.identifier"
                class="!py-3.5 !pl-11"
                autocomplete="username"
                placeholder="admin hoặc ten@mien.vn"
                :aria-invalid="Boolean(errors.identifier)"
            /></span>
            <small v-if="errors.identifier" class="text-[#8b5148]">{{
              errors.identifier
            }}</small>
          </label>
          <label class="admin-field">
            <span>Mật khẩu</span>
            <span class="relative"
              ><AppIcon
                name="lock"
                :size="17"
                class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#778170]" /><input
                v-model="form.password"
                class="!py-3.5 !pl-11 !pr-12"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Nhập mật khẩu"
                :aria-invalid="Boolean(errors.password)" /><button
                type="button"
                class="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[#697461] transition hover:bg-[#e5e1d7]"
                :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                @click="showPassword = !showPassword"
              >
                <AppIcon
                  :name="showPassword ? 'eye-off' : 'eye'"
                  :size="17"
                /></button
            ></span>
            <small v-if="errors.password" class="text-[#8b5148]">{{
              errors.password
            }}</small>
          </label>
          <AppButton
            :label="pending ? 'Đang xác thực…' : 'Đăng nhập'"
            type="submit"
            icon="arrow"
            :disabled="pending"
            class="mt-2 w-full"
          />
        </form>

        <p
          class="mt-10 border-t border-[#78816f]/20 pt-6 text-[0.68rem] leading-5 text-[#858b82]"
        >
          Nếu chưa có tài khoản đầu tiên, cấu hình thông tin bootstrap trong tệp
          môi trường rồi đăng nhập bằng thông tin đó.
        </p>
      </div>
    </section>
  </main>
</template>
