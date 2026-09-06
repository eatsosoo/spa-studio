<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Tài liệu hệ thống | MIÊN Admin' })

type DocView = 'overview' | 'database' | 'api'
type SearchItem = { type: string; title: string; detail: string; view: Exclude<DocView, 'overview'>; anchor: string; keywords: string }

const route = useRoute()
const searchQuery = ref('')
const validViews: DocView[] = ['overview', 'database', 'api']
const currentView = computed<DocView>(() => {
  const requested = String(route.query.view ?? 'overview') as DocView
  return validViews.includes(requested) ? requested : 'overview'
})

const tabs: Array<{ label: string; value: DocView; icon: string }> = [
  { label: 'Tổng quan', value: 'overview', icon: 'book' },
  { label: 'Database', value: 'database', icon: 'database' },
  { label: 'API', value: 'api', icon: 'api' },
]

const databaseGroups = [
  { id: 'db-auth', name: 'Xác thực và phân quyền', description: 'Tài khoản, phiên đăng nhập và quyền theo vai trò tại từng chi nhánh.', tables: ['users', 'auth_sessions', 'password_reset_tokens', 'roles', 'permissions', 'user_roles', 'role_permissions'] },
  { id: 'db-people', name: 'Chi nhánh, nhân sự và khách hàng', description: 'Hồ sơ vận hành, cấu hình lương theo thời gian và lịch sử khách hàng.', tables: ['branches', 'employees', 'employee_salary_configs', 'customers'] },
  { id: 'db-services', name: 'Dịch vụ và lịch hẹn', description: 'Danh mục liệu trình, lịch hẹn và snapshot dịch vụ tại thời điểm phục vụ.', tables: ['service_categories', 'services', 'appointments', 'appointment_services'] },
  { id: 'db-inventory', name: 'Sản phẩm và kho', description: 'Tồn tổng hợp, chi tiết theo lô, giữ hàng, chứng từ và sổ biến động.', tables: ['product_categories', 'products', 'inventory_locations', 'inventory_stocks', 'inventory_lots', 'inventory_reservations', 'inventory_documents', 'inventory_document_items', 'inventory_transactions'] },
  { id: 'db-orders', name: 'Bán hàng', description: 'Đơn hàng website, dòng hàng và lịch sử trạng thái; giá vốn được chốt khi hoàn tất.', tables: ['sales_orders', 'sales_order_items', 'sales_order_status_history'] },
  { id: 'db-payroll', name: 'Chấm công và lương', description: 'Chấm công, kỳ lương, bảng lương tổng hợp và các dòng đối soát.', tables: ['attendance_records', 'payroll_periods', 'payrolls', 'payroll_items'] },
  { id: 'db-promotions', name: 'Khuyến mãi', description: 'Chương trình giảm giá, phạm vi áp dụng, coupon và lượt sử dụng.', tables: ['promotions', 'promotion_products', 'promotion_services', 'coupons', 'coupon_redemptions'] },
  { id: 'db-content', name: 'Nội dung và hệ thống', description: 'Bài viết, cấu hình dùng chung và nhật ký các thao tác nhạy cảm.', tables: ['post_categories', 'posts', 'system_settings', 'audit_logs', 'service_product_usages'] },
]

const databaseRules = [
  ['Tiền tệ', 'Dùng DECIMAL(14,2); không dùng số thực để tránh sai lệch khi cộng dồn.'],
  ['Thời gian', 'Ngày giờ nghiệp vụ lưu UTC và hiển thị theo timezone của chi nhánh.'],
  ['Xóa dữ liệu', 'Khách hàng, nhân viên, sản phẩm và bài viết dùng soft delete.'],
  ['Tồn kho', 'Mọi thay đổi tồn phải đi qua inventory service và ghi ledger trong cùng transaction.'],
  ['Chứng từ', 'Chứng từ đã posted là bất biến; sửa sai bằng điều chỉnh hoặc chứng từ đảo.'],
  ['Xuất lô', 'Ưu tiên FEFO: hạn gần nhất, sau đó ngày nhập; lô không hạn dùng được xuất sau.'],
]

const apiGroups = [
  {
    id: 'api-storefront', name: 'Danh mục công khai', description: 'Dữ liệu hiển thị trên website, không yêu cầu phiên quản trị.',
    endpoints: [
      ['GET', '/api/products', 'Danh sách sản phẩm; hỗ trợ lọc theo ids.'],
      ['GET', '/api/products/:slug', 'Chi tiết một sản phẩm theo slug.'],
      ['GET', '/api/posts', 'Danh sách bài viết đã xuất bản.'],
      ['GET', '/api/posts/:slug', 'Chi tiết bài viết theo slug.'],
    ],
  },
  {
    id: 'api-commerce', name: 'Đặt lịch và bán hàng', description: 'Các thao tác từ website; payload được kiểm tra ở server.',
    endpoints: [
      ['POST', '/api/booking', 'Tạo yêu cầu đặt lịch và mã tham chiếu.'],
      ['POST', '/api/cart/validate', 'Kiểm tra giá, trạng thái và tồn khả dụng của giỏ.'],
      ['POST', '/api/orders', 'Tạo đơn idempotent và giữ hàng theo lô trong 24 giờ.'],
      ['GET', '/api/orders/:reference?token=…', 'Tra cứu đơn bằng mã đơn và access token.'],
    ],
  },
  {
    id: 'api-auth', name: 'Phiên quản trị', description: 'Cookie phiên là HttpOnly; token chỉ được lưu dưới dạng SHA-256 hash.',
    endpoints: [
      ['POST', '/api/auth/login', 'Xác thực mật khẩu scrypt và tạo session.'],
      ['GET', '/api/auth/me', 'Lấy hồ sơ người quản trị hiện tại.'],
      ['PATCH', '/api/auth/profile', 'Cập nhật hồ sơ tài khoản đang đăng nhập.'],
      ['POST', '/api/auth/logout', 'Thu hồi session và xóa cookie.'],
    ],
  },
  {
    id: 'api-admin', name: 'Vận hành quản trị', description: 'Được bảo vệ bởi middleware; resource chung gồm bookings, customers, employees, posts, products và services.',
    endpoints: [
      ['GET', '/api/admin/:resource', 'Danh sách resource có phân trang.'],
      ['POST', '/api/admin/:resource', 'Tạo bản ghi mới.'],
      ['GET', '/api/admin/:resource/:id', 'Đọc chi tiết bản ghi.'],
      ['PATCH', '/api/admin/:resource/:id', 'Cập nhật bản ghi.'],
      ['DELETE', '/api/admin/:resource/:id', 'Xóa hoặc soft delete tùy resource.'],
      ['GET', '/api/admin/dashboard', 'Dữ liệu tổng quan vận hành.'],
      ['GET', '/api/admin/schedule', 'Lịch hẹn theo khoảng ngày.'],
    ],
  },
  {
    id: 'api-inventory', name: 'Kho và đơn hàng', description: 'Các lệnh thay đổi trạng thái chạy trong transaction và ghi lịch sử.',
    endpoints: [
      ['GET', '/api/admin/inventory', 'Workspace tồn kho, lô, chứng từ và báo cáo.'],
      ['POST', '/api/admin/inventory/documents', 'Tạo chứng từ kho ở trạng thái draft.'],
      ['POST', '/api/admin/inventory/documents/:id/post', 'Ghi sổ chứng từ và cập nhật tồn.'],
      ['POST', '/api/admin/inventory/documents/:id/cancel', 'Hủy chứng từ còn hợp lệ để hủy.'],
      ['GET', '/api/admin/inventory/recipes', 'Đọc định mức vật tư của dịch vụ.'],
      ['PUT', '/api/admin/inventory/recipes/:serviceId', 'Thay toàn bộ định mức của một dịch vụ.'],
      ['POST', '/api/admin/orders/:id/confirm', 'Xác nhận đơn hàng.'],
      ['POST', '/api/admin/orders/:id/pay', 'Ghi nhận thanh toán và chốt giá vốn.'],
      ['POST', '/api/admin/orders/:id/fulfillment', 'Chuyển trạng thái đóng gói hoặc giao hàng.'],
      ['POST', '/api/admin/orders/:id/cancel', 'Hủy đơn và giải phóng hàng giữ.'],
    ],
  },
]

const tableCount = computed(() => databaseGroups.reduce((total, group) => total + group.tables.length, 0))
const endpointCount = computed(() => apiGroups.reduce((total, group) => total + group.endpoints.length, 0))

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const searchIndex = computed<SearchItem[]>(() => [
  ...databaseGroups.map(group => ({ type: 'Database', title: group.name, detail: `${group.description} ${group.tables.join(', ')}`, view: 'database' as const, anchor: group.id, keywords: group.tables.join(' ') })),
  ...apiGroups.flatMap(group => group.endpoints.map(endpoint => ({ type: 'API', title: `${endpoint[0]} ${endpoint[1]}`, detail: `${group.name} · ${endpoint[2]}`, view: 'api' as const, anchor: group.id, keywords: `${group.name} ${endpoint.join(' ')}` }))),
])
const searchResults = computed(() => {
  const query = fold(searchQuery.value.trim())
  if (!query) return []
  const terms = query.split(/\s+/).filter(Boolean)
  return searchIndex.value.filter(item => terms.every(term => fold(`${item.title} ${item.detail} ${item.keywords}`).includes(term))).slice(0, 30)
})

function tabTo(value: DocView) {
  return value === 'overview' ? '/admin/tai-lieu' : { path: '/admin/tai-lieu', query: { view: value } }
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="grid gap-8 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_minmax(320px,0.62fr)] lg:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Thư viện nội bộ</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Tài liệu hệ thống</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Tra cứu cấu trúc dữ liệu, hợp đồng API và cách mỗi chức năng đi qua hệ thống MIÊN.</p>
      </div>
      <div class="relative">
        <label for="documentation-search" class="mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#70796b]">Tìm trong toàn bộ tài liệu</label>
        <AppIcon name="search" :size="17" class="pointer-events-none absolute bottom-3.5 left-4 text-[#7b8475]" />
        <input id="documentation-search" v-model="searchQuery" type="search" class="h-11 w-full border border-[#78816f]/25 bg-[#f9f7f1] pl-11 pr-11 text-xs text-[#30382d] outline-none transition focus:border-[#5c6d55] focus:bg-white" placeholder="Tên bảng, endpoint hoặc chức năng…">
        <button v-if="searchQuery" type="button" class="absolute bottom-1.5 right-2 grid size-8 place-items-center text-[#788076] transition hover:text-[#35402f] active:scale-[0.96]" aria-label="Xóa tìm kiếm" @click="searchQuery = ''"><AppIcon name="close" :size="15" /></button>
      </div>
    </header>

    <nav class="mt-6 flex gap-1 overflow-x-auto border-b border-[#78816f]/20" aria-label="Chuyên mục tài liệu">
      <NuxtLink v-for="tab in tabs" :key="tab.value" :to="tabTo(tab.value)" class="group flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[0.7rem] font-semibold transition active:translate-y-px" :class="currentView === tab.value && !searchQuery ? 'border-[#596b53] text-[#35402f]' : 'border-transparent text-[#7b8277] hover:text-[#4e5b49]'">
        <AppIcon :name="tab.icon" :size="15" />{{ tab.label }}
      </NuxtLink>
    </nav>

    <section v-if="searchQuery" class="mt-9">
      <div class="flex items-end justify-between gap-4 border-b border-[#78816f]/20 pb-4">
        <div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#75806f]">Kết quả tìm kiếm</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">{{ searchResults.length }} mục phù hợp</h2></div>
        <button type="button" class="text-[0.68rem] font-semibold text-[#5e6c58] hover:underline" @click="searchQuery = ''">Đóng tìm kiếm</button>
      </div>
      <div v-if="searchResults.length" class="divide-y divide-[#78816f]/15">
        <NuxtLink v-for="result in searchResults" :key="`${result.view}-${result.title}`" :to="{ path: '/admin/tai-lieu', query: { view: result.view }, hash: `#${result.anchor}` }" class="group grid gap-2 py-5 transition sm:grid-cols-[110px_1fr_auto] sm:items-center" @click="searchQuery = ''">
          <span class="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#7d8579]">{{ result.type }}</span>
          <div><h3 class="font-mono text-[0.74rem] font-semibold text-[#35402f]">{{ result.title }}</h3><p class="mt-1 max-w-3xl text-[0.68rem] leading-5 text-[#737b70]">{{ result.detail }}</p></div>
          <AppIcon name="arrow" :size="15" class="hidden text-[#778272] transition-transform group-hover:translate-x-1 sm:block" />
        </NuxtLink>
      </div>
      <AdminEmptyState v-else title="Không tìm thấy nội dung" description="Thử tên bảng, đường dẫn API hoặc một từ khóa ngắn hơn." />
    </section>

    <template v-else-if="currentView === 'overview'">
      <div class="mt-9 grid gap-px overflow-hidden border-y border-[#78816f]/20 bg-[#78816f]/20 sm:grid-cols-2">
        <div class="bg-[#f6f3eb] p-5"><p class="text-[0.58rem] uppercase tracking-[0.14em] text-[#7b8277]">Schema hiện tại</p><p class="mt-3 text-2xl font-semibold tabular-nums text-[#35402f]">{{ tableCount }} bảng</p></div>
        <div class="bg-[#f6f3eb] p-5"><p class="text-[0.58rem] uppercase tracking-[0.14em] text-[#7b8277]">API được lập chỉ mục</p><p class="mt-3 text-2xl font-semibold tabular-nums text-[#35402f]">{{ endpointCount }} endpoint</p></div>
      </div>
      <div class="mt-10 grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
        <aside>
          <p class="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#75806f]">Bắt đầu từ đâu</p>
          <h2 class="mt-3 max-w-sm text-2xl font-semibold tracking-[-0.035em] text-[#30392d]">Đi từ câu hỏi đến đúng lớp của hệ thống.</h2>
          <p class="mt-4 max-w-sm text-xs leading-6 text-[#71796e]">Tìm nơi dữ liệu được lưu ở Database và cách các thành phần giao tiếp qua API.</p>
        </aside>
        <div class="divide-y divide-[#78816f]/18 border-y border-[#78816f]/18">
          <NuxtLink v-for="item in tabs.slice(1)" :key="item.value" :to="tabTo(item.value)" class="group grid grid-cols-[40px_1fr_auto] items-center gap-4 py-5 active:translate-y-px">
            <span class="grid size-10 place-items-center rounded-full bg-[#e6e3d9] text-[#5d6b57]"><AppIcon :name="item.icon" :size="17" /></span>
            <div><h3 class="text-xs font-semibold text-[#30392d]">{{ item.label }}</h3><p class="mt-1 text-[0.67rem] text-[#747c71]">{{ item.value === 'database' ? 'Bảng, quan hệ và quy ước dữ liệu' : 'Endpoint, mục đích và phạm vi truy cập' }}</p></div>
            <AppIcon name="arrow" :size="15" class="text-[#7c8577] transition-transform group-hover:translate-x-1" />
          </NuxtLink>
        </div>
      </div>
      <div class="mt-12 border-l-2 border-[#75836e] bg-[#e9e6dc] px-5 py-4 text-xs leading-6 text-[#646d60]">Tài liệu mô tả mã nguồn hiện tại. Khi thay đổi schema, route API hoặc transaction nghiệp vụ, cần cập nhật trang này trong cùng pull request.</div>
    </template>

    <template v-else-if="currentView === 'database'">
      <div class="mt-9 grid gap-9 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section>
          <div class="border-b border-[#78816f]/20 pb-5"><p class="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#75806f]">MySQL 8 · Drizzle ORM</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Bản đồ dữ liệu theo nghiệp vụ</h2></div>
          <article v-for="group in databaseGroups" :id="group.id" :key="group.id" class="scroll-mt-28 border-b border-[#78816f]/15 py-6">
            <div class="grid gap-4 md:grid-cols-[0.7fr_1.3fr]"><div><h3 class="text-sm font-semibold text-[#34402f]">{{ group.name }}</h3><p class="mt-2 max-w-sm text-[0.67rem] leading-5 text-[#747c71]">{{ group.description }}</p></div><div class="flex flex-wrap content-start gap-2"><code v-for="table in group.tables" :key="table" class="border border-[#7a8375]/18 bg-[#ece9e0] px-2.5 py-1.5 font-mono text-[0.63rem] text-[#53604e]">{{ table }}</code></div></div>
          </article>
        </section>
        <aside class="xl:sticky xl:top-24 xl:self-start">
          <div class="bg-[#e6e2d7] p-6"><p class="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[#707b69]">Quy ước bắt buộc</p><div class="mt-5 divide-y divide-[#78816f]/18 border-y border-[#78816f]/18"><div v-for="rule in databaseRules" :key="rule[0]" class="py-4"><strong class="text-[0.68rem] text-[#35402f]">{{ rule[0] }}</strong><p class="mt-1 text-[0.64rem] leading-5 text-[#6f776c]">{{ rule[1] }}</p></div></div></div>
        </aside>
      </div>
    </template>

    <template v-else-if="currentView === 'api'">
      <section class="mt-9">
        <div class="grid gap-4 border-b border-[#78816f]/20 pb-5 md:grid-cols-[0.7fr_1.3fr]"><div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#75806f]">Nuxt server routes</p><h2 class="mt-2 text-xl font-semibold tracking-[-0.03em]">Hợp đồng API hiện tại</h2></div><p class="max-w-xl text-xs leading-6 text-[#71796e]">Các endpoint admin được middleware bảo vệ. Lỗi validation trả mã 422; xung đột nghiệp vụ như thiếu tồn thường trả 409.</p></div>
        <article v-for="group in apiGroups" :id="group.id" :key="group.id" class="scroll-mt-28 border-b border-[#78816f]/18 py-7">
          <div class="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-10"><div><h3 class="text-sm font-semibold text-[#34402f]">{{ group.name }}</h3><p class="mt-2 max-w-sm text-[0.67rem] leading-5 text-[#747c71]">{{ group.description }}</p></div><div class="divide-y divide-[#78816f]/14 border-y border-[#78816f]/14"><div v-for="endpoint in group.endpoints" :key="`${endpoint[0]}-${endpoint[1]}`" class="grid gap-2 py-3.5 sm:grid-cols-[58px_minmax(220px,0.9fr)_1.1fr] sm:items-center"><span class="w-fit bg-[#dfe4da] px-2 py-1 font-mono text-[0.57rem] font-semibold text-[#506149]">{{ endpoint[0] }}</span><code class="break-all font-mono text-[0.65rem] font-semibold text-[#3f4b3a]">{{ endpoint[1] }}</code><p class="text-[0.65rem] leading-5 text-[#747c71]">{{ endpoint[2] }}</p></div></div></div>
        </article>
      </section>
    </template>

  </section>
</template>
