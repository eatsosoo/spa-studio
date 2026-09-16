<script setup lang="ts">
const props = defineProps<{ open: boolean; collapsed: boolean }>();
const emit = defineEmits<{ close: []; toggleCollapse: []; expand: [] }>();

const route = useRoute();
const { can } = useAdminAuth();
const inventoryOpen = ref(route.path.startsWith("/admin/kho"));
const documentationOpen = ref(route.path.startsWith("/admin/tai-lieu"));
const flowsOpen = ref(route.path.startsWith("/admin/luong-chuc-nang"));

watch(() => props.collapsed, (collapsed) => {
  if (!collapsed) return;
  inventoryOpen.value = false;
  documentationOpen.value = false;
  flowsOpen.value = false;
});

const { data: flowNavigationData } = await useAsyncData(
  "feature-flow-navigation",
  () =>
    queryCollection("flows")
      .select("id", "stem", "title", "order")
      .order("order", "ASC")
      .all(),
);
const flowNavigation = computed(() =>
  (flowNavigationData.value ?? []).map((flow) => ({
    label: flow.title,
    to: `/admin/luong-chuc-nang/${flow.stem.split("/").at(-1)}`,
  })),
);

watch(
  () => route.fullPath,
  (path) => {
    if (path.startsWith("/admin/kho")) inventoryOpen.value = true;
    if (path.startsWith("/admin/tai-lieu")) documentationOpen.value = true;
    if (path.startsWith("/admin/luong-chuc-nang")) flowsOpen.value = true;
  },
);

const primaryItems = [
  { label: "Tổng quan", to: "/admin", icon: "dashboard", permission: "dashboard.read" },
  { label: "Khách hàng", to: "/admin/khach-hang", icon: "users", permission: "customers.read" },
  { label: "Sản phẩm", to: "/admin/san-pham", icon: "products", permission: "products.read" },
  { label: "Đơn hàng", to: "/admin/don-hang", icon: "cart", permission: "orders.read" },
  { label: "Liệu trình", to: "/admin/lieu-trinh", icon: "services", permission: "services.read" },
];
const items = [
  { label: "Đặt lịch", to: "/admin/dat-lich", icon: "calendar", permission: "appointments.read" },
  { label: "Khách từ chatbot", to: "/admin/khach-chatbot", icon: "mail", permission: "customers.read" },
  { label: "Nhân viên", to: "/admin/nhan-vien", icon: "staff", permission: "employees.read" },
  { label: "Tài khoản & phân quyền", to: "/admin/phan-quyen", icon: "settings", permission: "users.read" },
  { label: "Bài viết", to: "/admin/bai-viet", icon: "posts", permission: "posts.read" },
  { label: "Viết bài AI", to: "/admin/viet-bai-ai", icon: "sparkles", permission: "posts.read" },
  { label: "Hướng dẫn AI", to: "/admin/huong-dan-ai", icon: "settings", permission: "posts.read" },
  { label: "Thư viện ảnh", to: "/admin/thu-vien-anh", icon: "folder", permission: "posts.read" },
];
const inventoryItems = [
  { label: "Tổng quan kho", to: "/admin/kho" },
  { label: "Chứng từ nhập xuất", to: "/admin/kho?view=documents" },
  { label: "Lô và hạn dùng", to: "/admin/kho?view=lots" },
  { label: "Lịch sử biến động", to: "/admin/kho?view=transactions" },
  { label: "Định mức dịch vụ", to: "/admin/kho/dinh-muc" },
  { label: "Báo cáo kho", to: "/admin/kho/bao-cao" },
];
const documentationItems = [
  { label: "Tổng quan", to: "/admin/tai-lieu" },
  { label: "Database", to: "/admin/tai-lieu?view=database" },
  { label: "API", to: "/admin/tai-lieu?view=api" },
];

function isActive(to: string) {
  return to === "/admin" ? route.path === to : route.path.startsWith(to);
}

function isInventoryActive(to: string) {
  const [path, query] = to.split("?");
  if (route.path !== path) return false;
  const view = new URLSearchParams(query ?? "").get("view");
  return view ? route.query.view === view : !route.query.view;
}

function isDocumentationActive(to: string) {
  const [path, query] = to.split("?");
  if (route.path !== path) return false;
  const view = new URLSearchParams(query ?? "").get("view");
  return view ? route.query.view === view : !route.query.view;
}

function toggleSection(section: 'inventory' | 'documentation' | 'flows') {
  if (props.collapsed && window.matchMedia('(min-width: 1024px)').matches) {
    emit('expand');
    if (section === 'inventory') inventoryOpen.value = true;
    if (section === 'documentation') documentationOpen.value = true;
    if (section === 'flows') flowsOpen.value = true;
    return;
  }
  if (section === 'inventory') inventoryOpen.value = !inventoryOpen.value;
  if (section === 'documentation') documentationOpen.value = !documentationOpen.value;
  if (section === 'flows') flowsOpen.value = !flowsOpen.value;
}
</script>

<template>
  <Transition name="fade">
    <button
      v-if="open"
      class="fixed inset-0 z-30 bg-[#1d241b]/35 backdrop-blur-[2px] lg:hidden"
      aria-label="Đóng menu quản trị"
      @click="$emit('close')"
    />
  </Transition>

  <aside
    class="admin-sidebar"
    :data-collapsed="collapsed ? 'true' : undefined"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div
      class="admin-sidebar-header flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-6"
    >
      <NuxtLink to="/" class="admin-sidebar-brand flex items-center gap-3 text-[#f5f0e6]" title="Xem website">
        <span
          class="grid size-8 place-items-center rounded-full border border-[#dce3d7]/35"
        >
          <span class="h-3 w-3 rounded-tl-full rounded-br-full bg-[#cbd3c4]" />
        </span>
        <span class="admin-sidebar-label text-xs font-semibold tracking-[0.26em]">MIÊN</span>
      </NuxtLink>
      <button
        type="button"
        class="admin-sidebar-toggle hidden size-9 shrink-0 place-items-center rounded-full text-[#cdd4c8] transition hover:bg-white/10 lg:grid"
        :aria-label="collapsed ? 'Mở rộng menu quản trị' : 'Thu gọn menu quản trị'"
        :title="collapsed ? 'Mở rộng menu' : 'Thu gọn menu'"
        :aria-expanded="!collapsed"
        @click="$emit('toggleCollapse')"
      >
        <AppIcon :name="collapsed ? 'arrow' : 'arrow-left'" :size="17" />
      </button>
      <button
        type="button"
        class="grid size-9 place-items-center rounded-full text-[#cdd4c8] hover:bg-white/10 lg:hidden"
        aria-label="Đóng menu"
        @click="$emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <div
        class="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-6"
      >
        <p
          class="admin-sidebar-heading mb-3 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#99a494]"
        >
          Vận hành
        </p>
        <nav class="grid gap-1" aria-label="Điều hướng quản trị">
          <NuxtLink
            v-for="item in primaryItems.filter(item => can(item.permission))"
            :key="item.to"
            :to="item.to"
            class="admin-nav-item"
            :class="isActive(item.to) ? 'admin-nav-item--active' : ''"
            :title="collapsed ? item.label : undefined"
            @click="$emit('close')"
          >
            <AppIcon :name="item.icon" :size="18" />
            <span class="admin-sidebar-label">{{ item.label }}</span>
            <span
              v-if="item.to === '/admin/dat-lich'"
              class="ml-auto rounded-full bg-[#d9dfd2]/15 px-2 py-0.5 text-[0.64rem]"
              >3</span
            >
          </NuxtLink>
          <div v-if="can('inventory.read')" class="mt-1">
            <button
              type="button"
              class="admin-nav-item w-full text-left"
              :title="collapsed ? 'Quản lý kho' : undefined"
              :class="
                route.path.startsWith('/admin/kho')
                  ? 'admin-nav-item--active'
                  : ''
              "
              :aria-expanded="inventoryOpen"
              aria-controls="inventory-submenu"
              @click="toggleSection('inventory')"
            >
              <AppIcon name="warehouse" :size="18" />
              <span class="admin-sidebar-label">Quản lý kho</span>
              <AppIcon
                name="chevron-down"
                :size="13"
                class="admin-sidebar-chevron ml-auto opacity-60 transition-transform"
                :class="inventoryOpen ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-show="inventoryOpen"
              id="inventory-submenu"
              class="admin-sidebar-submenu ml-7 mt-1 grid gap-0.5 border-l border-white/10 pl-3"
            >
              <NuxtLink
                v-for="child in inventoryItems"
                :key="child.to"
                :to="child.to"
                class="rounded-sm px-3 py-2 text-[0.69rem] text-[#aeb8aa] transition hover:bg-white/[0.06] hover:text-white"
                :class="
                  isInventoryActive(child.to)
                    ? 'bg-white/[0.08] text-[#f4f0e8]'
                    : ''
                "
                @click="$emit('close')"
                >{{ child.label }}</NuxtLink
              >
            </div>
          </div>
          <NuxtLink
            v-for="item in items.filter(item => can(item.permission) || (item.to === '/admin/phan-quyen' && can('roles.read')))"
            :key="item.to"
            :to="item.to"
            class="admin-nav-item"
            :class="isActive(item.to) ? 'admin-nav-item--active' : ''"
            :title="collapsed ? item.label : undefined"
            @click="$emit('close')"
          >
            <AppIcon :name="item.icon" :size="18" />
            <span class="admin-sidebar-label">{{ item.label }}</span>
            <span
              v-if="item.to === '/admin/dat-lich'"
              class="ml-auto rounded-full bg-[#d9dfd2]/15 px-2 py-0.5 text-[0.64rem]"
              >3</span
            >
          </NuxtLink>
          <div v-if="can('audit.read')" class="mt-1">
            <button
              type="button"
              class="admin-nav-item w-full text-left"
              :title="collapsed ? 'Tài liệu' : undefined"
              :class="
                route.path.startsWith('/admin/tai-lieu')
                  ? 'admin-nav-item--active'
                  : ''
              "
              :aria-expanded="documentationOpen"
              aria-controls="documentation-submenu"
              @click="toggleSection('documentation')"
            >
              <AppIcon name="book" :size="18" />
              <span class="admin-sidebar-label">Tài liệu</span>
              <AppIcon
                name="chevron-down"
                :size="13"
                class="admin-sidebar-chevron ml-auto opacity-60 transition-transform"
                :class="documentationOpen ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-show="documentationOpen"
              id="documentation-submenu"
              class="admin-sidebar-submenu ml-7 mt-1 grid gap-0.5 border-l border-white/10 pl-3"
            >
              <NuxtLink
                v-for="child in documentationItems"
                :key="child.to"
                :to="child.to"
                class="rounded-sm px-3 py-2 text-[0.69rem] text-[#aeb8aa] transition hover:bg-white/[0.06] hover:text-white"
                :class="
                  isDocumentationActive(child.to)
                    ? 'bg-white/[0.08] text-[#f4f0e8]'
                    : ''
                "
                @click="$emit('close')"
                >{{ child.label }}</NuxtLink
              >
            </div>
          </div>
          <div v-if="can('audit.read')" class="mt-1">
            <button
              type="button"
              class="admin-nav-item w-full text-left"
              :title="collapsed ? 'Luồng chức năng' : undefined"
              :class="
                route.path.startsWith('/admin/luong-chuc-nang')
                  ? 'admin-nav-item--active'
                  : ''
              "
              :aria-expanded="flowsOpen"
              aria-controls="feature-flow-submenu"
              @click="toggleSection('flows')"
            >
              <AppIcon name="flow" :size="18" />
              <span class="admin-sidebar-label">Luồng chức năng</span>
              <AppIcon
                name="chevron-down"
                :size="13"
                class="admin-sidebar-chevron ml-auto opacity-60 transition-transform"
                :class="flowsOpen ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-show="flowsOpen"
              id="feature-flow-submenu"
              class="admin-sidebar-submenu ml-7 mt-1 grid gap-0.5 border-l border-white/10 pl-3"
            >
              <NuxtLink
                to="/admin/luong-chuc-nang"
                class="rounded-sm px-3 py-2 text-[0.69rem] text-[#aeb8aa] transition hover:bg-white/[0.06] hover:text-white"
                :class="
                  route.path === '/admin/luong-chuc-nang'
                    ? 'bg-white/[0.08] text-[#f4f0e8]'
                    : ''
                "
                @click="$emit('close')"
                >Tất cả luồng</NuxtLink
              >
              <NuxtLink
                v-for="flow in flowNavigation"
                :key="flow.to"
                :to="flow.to"
                class="rounded-sm px-3 py-2 text-[0.69rem] leading-4 text-[#aeb8aa] transition hover:bg-white/[0.06] hover:text-white"
                :class="
                  route.path === flow.to ? 'bg-white/[0.08] text-[#f4f0e8]' : ''
                "
                @click="$emit('close')"
                >{{ flow.label }}</NuxtLink
              >
            </div>
          </div>
        </nav>
      </div>

      <div class="admin-sidebar-footer shrink-0 border-t border-white/10 bg-[#303b2c] px-6 py-5">
        <NuxtLink
          to="/"
          class="flex items-center gap-3 text-xs text-[#b7c0b2] transition hover:text-white"
          :title="collapsed ? 'Xem website' : undefined"
        >
          <AppIcon name="external" :size="17" />
          <span class="admin-sidebar-label">Xem website</span>
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>
