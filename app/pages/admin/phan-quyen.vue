<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Phân quyền | MIÊN Admin' })

type Role = { id: number; code: string; name: string; description: string | null; isSystem: boolean; permissionIds: number[] }
type Permission = { id: number; code: string; module: string; action: string; description: string | null }
type Account = { id: number; username: string; employeeName: string | null; status: string; roleIds: number[]; roleNames: string[] }
type Employee = { id: number; name: string; code: string }
const { can, user } = useAdminAuth()
const canUsers = computed(() => can('users.read'))
const canRoles = computed(() => can('roles.read'))
const canManageRoles = computed(() => can('roles.manage'))
const isOwner = computed(() => user.value?.roles.some(role => role.code === 'owner') ?? false)
const canCreateUser = computed(() => can('users.create'))
const canUpdateUser = computed(() => can('users.update'))
const tab = ref<'accounts' | 'roles' | 'permissions'>(canUsers.value ? 'accounts' : 'roles')
const errorMessage = ref('')
const successMessage = ref('')
const busy = ref(false)

const { data: accountData, refresh: refreshAccounts } = await useAsyncData('access-accounts', () => canUsers.value
  ? $fetch<{ data: { accounts: Account[]; employees: Employee[] } }>('/api/admin/accounts')
  : Promise.resolve({ data: { accounts: [], employees: [] } }), { watch: [canUsers] })
const { data: roleData, refresh: refreshRoles } = await useAsyncData('access-roles', () => canRoles.value
  ? $fetch<{ data: Role[] }>('/api/admin/roles') : Promise.resolve({ data: [] as Role[] }), { watch: [canRoles] })
const { data: permissionData } = await useAsyncData('access-permissions', () => canRoles.value
  ? $fetch<{ data: Permission[] }>('/api/admin/permissions') : Promise.resolve({ data: [] as Permission[] }), { watch: [canRoles] })

const accounts = computed(() => accountData.value?.data.accounts ?? [])
const employees = computed(() => accountData.value?.data.employees ?? [])
const roles = computed(() => roleData.value?.data ?? [])
const permissions = computed(() => permissionData.value?.data ?? [])
const modules = computed(() => [...new Set(permissions.value.map(item => item.module))])
const accountForm = reactive({ id: 0, employeeId: 0, username: '', password: '', status: 'active', roleIds: [] as number[] })
const roleForm = reactive({ id: 0, code: '', name: '', description: '', permissionIds: [] as number[] })
const accountOpen = ref(false)
const roleOpen = ref(false)

function startAccount(account?: Account) {
  Object.assign(accountForm, account
    ? { id: account.id, employeeId: 0, username: account.username, password: '', status: account.status, roleIds: [...account.roleIds] }
    : { id: 0, employeeId: 0, username: '', password: '', status: 'active', roleIds: [] })
  errorMessage.value = ''
  accountOpen.value = true
}
function startRole(role?: Role) {
  Object.assign(roleForm, role
    ? { id: role.id, code: role.code, name: role.name, description: role.description ?? '', permissionIds: [...role.permissionIds] }
    : { id: 0, code: '', name: '', description: '', permissionIds: [] })
  errorMessage.value = ''
  roleOpen.value = true
}
function toggleId(values: number[], id: number) {
  const index = values.indexOf(id)
  if (index === -1) values.push(id)
  else values.splice(index, 1)
}
function failureText(error: unknown) {
  const value = error as { data?: { statusMessage?: string }; statusMessage?: string }
  return value.data?.statusMessage ?? value.statusMessage ?? 'Không thể lưu thay đổi.'
}
async function saveAccount() {
  busy.value = true
  errorMessage.value = ''
  try {
    if (accountForm.id) {
      await $fetch(`/api/admin/accounts/${accountForm.id}`, { method: 'PATCH', body: {
        status: accountForm.status,
        ...(accountForm.password ? { password: accountForm.password } : {}),
        ...(canRoles.value ? { roleIds: accountForm.roleIds } : {}),
      } })
    } else {
      await $fetch('/api/admin/accounts', { method: 'POST', body: {
        employeeId: accountForm.employeeId, username: accountForm.username, password: accountForm.password,
        roleIds: canRoles.value ? accountForm.roleIds : [],
      } })
    }
    accountOpen.value = false
    successMessage.value = 'Đã lưu tài khoản nhân viên.'
    await refreshAccounts()
  } catch (error) { errorMessage.value = failureText(error) }
  finally { busy.value = false }
}
async function saveRole() {
  busy.value = true
  errorMessage.value = ''
  try {
    await $fetch(roleForm.id ? `/api/admin/roles/${roleForm.id}` : '/api/admin/roles', { method: roleForm.id ? 'PATCH' : 'POST', body: {
      code: roleForm.code, name: roleForm.name, description: roleForm.description, permissionIds: roleForm.permissionIds,
    } })
    roleOpen.value = false
    successMessage.value = 'Đã lưu vai trò và quyền.'
    await refreshRoles()
  } catch (error) { errorMessage.value = failureText(error) }
  finally { busy.value = false }
}
async function deleteRole(role: Role) {
  if (!confirm(`Xóa vai trò “${role.name}”?`)) return
  busy.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' })
    successMessage.value = 'Đã xóa vai trò.'
    await refreshRoles()
  } catch (error) { errorMessage.value = failureText(error) }
  finally { busy.value = false }
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <div class="border-b border-[#78816f]/20 pb-7">
      <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Quản trị hệ thống</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Tài khoản & phân quyền</h1>
      <p class="mt-3 text-sm text-[#6d746a]">Liên kết tài khoản nhân viên, gán vai trò và quản lý quyền theo từng phân hệ.</p>
    </div>
    <div class="mt-6 flex flex-wrap gap-2 border-b border-[#78816f]/20 pb-4">
      <button v-if="canUsers" class="filter-tab" :class="tab === 'accounts' ? 'filter-tab--active' : ''" @click="tab = 'accounts'">Tài khoản</button>
      <button v-if="canRoles" class="filter-tab" :class="tab === 'roles' ? 'filter-tab--active' : ''" @click="tab = 'roles'">Vai trò</button>
      <button v-if="canRoles" class="filter-tab" :class="tab === 'permissions' ? 'filter-tab--active' : ''" @click="tab = 'permissions'">Danh mục quyền</button>
    </div>
    <p v-if="successMessage" class="mt-5 rounded-sm bg-[#e3e9df] px-4 py-3 text-xs text-[#40503a]">{{ successMessage }}</p>
    <p v-if="errorMessage && !accountOpen && !roleOpen" class="mt-5 rounded-sm bg-[#f1e6e0] px-4 py-3 text-xs text-[#8b5148]">{{ errorMessage }}</p>

    <div v-if="tab === 'accounts' && canUsers" class="mt-7">
      <div class="mb-5 flex items-center justify-between gap-3"><h2 class="text-lg font-semibold">Tài khoản nhân viên</h2><AppButton v-if="canCreateUser" label="Tạo tài khoản" icon="plus" @click="startAccount()" /></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[650px] text-left text-xs"><thead><tr class="border-b border-[#78816f]/20 text-[#78816f]"><th class="py-3">Nhân viên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th class="text-right">Thao tác</th></tr></thead><tbody><tr v-for="account in accounts" :key="account.id" class="border-b border-[#78816f]/15"><td class="py-4 font-semibold">{{ account.employeeName || 'Chưa liên kết' }}</td><td>{{ account.username }}</td><td>{{ account.roleNames.join(', ') || 'Chưa gán' }}</td><td>{{ account.status === 'active' ? 'Hoạt động' : 'Đã khóa' }}</td><td class="text-right"><button v-if="canUpdateUser && account.id !== user?.id && (isOwner || !account.roleIds.some(id => roles.find(role => role.id === id)?.code === 'owner'))" class="text-[#506348] underline" @click="startAccount(account)">Chỉnh sửa</button></td></tr></tbody></table></div>
      <p v-if="!accounts.length" class="py-8 text-sm text-[#737a70]">Chưa có tài khoản nhân viên.</p>
    </div>

    <div v-if="tab === 'roles' && canRoles" class="mt-7">
      <div class="mb-5 flex items-center justify-between gap-3"><h2 class="text-lg font-semibold">Vai trò</h2><AppButton v-if="canManageRoles" label="Tạo vai trò" icon="plus" @click="startRole()" /></div>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><article v-for="role in roles" :key="role.id" class="rounded-sm border border-[#78816f]/20 bg-[#fbf8f0] p-5"><div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold">{{ role.name }}</h3><p class="mt-1 font-mono text-[0.68rem] text-[#78816f]">{{ role.code }}</p></div><span v-if="role.isSystem" class="rounded-full bg-[#e4e9df] px-2 py-1 text-[0.62rem] text-[#506348]">Hệ thống</span></div><p class="mt-3 min-h-10 text-xs leading-5 text-[#737a70]">{{ role.description || 'Chưa có mô tả' }}</p><p class="mt-2 text-xs text-[#566052]">{{ role.permissionIds.length }} quyền</p><div v-if="canManageRoles && role.code !== 'owner'" class="mt-4 flex gap-4 border-t border-[#78816f]/15 pt-4 text-xs"><button class="text-[#506348] underline" @click="startRole(role)">Chỉnh sửa</button><button v-if="!role.isSystem" class="text-[#8b5148] underline" @click="deleteRole(role)">Xóa</button></div></article></div>
    </div>

    <div v-if="tab === 'permissions' && canRoles" class="mt-7"><h2 class="text-lg font-semibold">Danh mục quyền</h2><p class="mt-2 text-xs text-[#737a70]">Mã quyền được khai báo cùng API; chọn quyền cho role ở tab Vai trò.</p><div v-for="module in modules" :key="module" class="mt-6"><h3 class="border-b border-[#78816f]/20 pb-2 text-sm font-semibold capitalize">{{ module }}</h3><div class="grid gap-2 pt-3 md:grid-cols-2"><div v-for="permission in permissions.filter(item => item.module === module)" :key="permission.id" class="rounded-sm bg-[#fbf8f0] px-4 py-3 text-xs"><span class="font-mono font-semibold">{{ permission.code }}</span><span class="ml-3 text-[#737a70]">{{ permission.description }}</span></div></div></div></div>

    <div v-if="accountOpen" class="fixed inset-0 z-50 grid place-items-center bg-[#20271e]/50 p-4" role="dialog" aria-modal="true"><form class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-md bg-[#f6f3eb] p-6 shadow-2xl" @submit.prevent="saveAccount"><h2 class="text-xl font-semibold">{{ accountForm.id ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản nhân viên' }}</h2><div class="mt-5 grid gap-4"><label v-if="!accountForm.id" class="grid gap-1 text-xs">Nhân viên<select v-model.number="accountForm.employeeId" required class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2"><option :value="0" disabled>Chọn nhân viên</option><option v-for="employee in employees" :key="employee.id" :value="employee.id">{{ employee.name }} ({{ employee.code }})</option></select></label><label class="grid gap-1 text-xs">Tên đăng nhập<input v-model="accountForm.username" :disabled="!!accountForm.id" required class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2" /></label><label class="grid gap-1 text-xs">{{ accountForm.id ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu' }}<input v-model="accountForm.password" type="password" :required="!accountForm.id" minlength="8" autocomplete="new-password" class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2" /></label><label v-if="accountForm.id" class="grid gap-1 text-xs">Trạng thái<select v-model="accountForm.status" class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2"><option value="active">Hoạt động</option><option value="disabled">Đã khóa</option></select></label><fieldset v-if="canRoles" class="border-t border-[#78816f]/20 pt-4"><legend class="text-xs font-semibold">Vai trò tại chi nhánh MAIN</legend><div class="mt-2 grid grid-cols-2 gap-2"><label v-for="role in roles" :key="role.id" class="flex items-center gap-2 text-xs"><input type="checkbox" :checked="accountForm.roleIds.includes(role.id)" @change="toggleId(accountForm.roleIds, role.id)" />{{ role.name }}</label></div></fieldset></div><p v-if="errorMessage" class="mt-4 text-xs text-[#8b5148]">{{ errorMessage }}</p><div class="mt-6 flex justify-end gap-3"><AppButton type="button" label="Hủy" variant="secondary" @click="accountOpen = false" /><AppButton type="submit" :label="busy ? 'Đang lưu…' : 'Lưu tài khoản'" :disabled="busy" /></div></form></div>

    <div v-if="roleOpen" class="fixed inset-0 z-50 grid place-items-center bg-[#20271e]/50 p-4" role="dialog" aria-modal="true"><form class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-[#f6f3eb] p-6 shadow-2xl" @submit.prevent="saveRole"><h2 class="text-xl font-semibold">{{ roleForm.id ? 'Chỉnh sửa vai trò' : 'Tạo vai trò' }}</h2><div class="mt-5 grid gap-4"><label class="grid gap-1 text-xs">Mã vai trò<input v-model="roleForm.code" :disabled="!!roleForm.id" required pattern="[a-z][a-z0-9_]{2,79}" class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2" /></label><label class="grid gap-1 text-xs">Tên vai trò<input v-model="roleForm.name" required class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2" /></label><label class="grid gap-1 text-xs">Mô tả<textarea v-model="roleForm.description" class="rounded-sm border border-[#78816f]/30 bg-white px-3 py-2" /></label></div><div class="mt-5 border-t border-[#78816f]/20 pt-4"><h3 class="text-sm font-semibold">Quyền của vai trò</h3><div v-for="module in modules" :key="module" class="mt-4"><p class="mb-2 text-xs font-semibold capitalize">{{ module }}</p><div class="grid gap-2 sm:grid-cols-2"><label v-for="permission in permissions.filter(item => item.module === module)" :key="permission.id" class="flex items-start gap-2 text-xs"><input type="checkbox" class="mt-0.5" :checked="roleForm.permissionIds.includes(permission.id)" @change="toggleId(roleForm.permissionIds, permission.id)" /><span>{{ permission.description || permission.code }} <span class="block font-mono text-[0.62rem] text-[#78816f]">{{ permission.code }}</span></span></label></div></div></div><p v-if="errorMessage" class="mt-4 text-xs text-[#8b5148]">{{ errorMessage }}</p><div class="mt-6 flex justify-end gap-3"><AppButton type="button" label="Hủy" variant="secondary" @click="roleOpen = false" /><AppButton type="submit" :label="busy ? 'Đang lưu…' : 'Lưu vai trò'" :disabled="busy" /></div></form></div>
  </section>
</template>
