import type { AdminSessionUser } from '~/composables/useAdminAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return
  const { user } = useAdminAuth()
  const isLogin = to.path === '/admin/dang-nhap'

  if (!user.value) {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const response = await $fetch<{ data: AdminSessionUser }>('/api/auth/me', { headers })
      user.value = response.data
    } catch {
      user.value = null
    }
  }

  if (isLogin && user.value) return navigateTo('/admin')
  if (!isLogin && !user.value) return navigateTo({ path: '/admin/dang-nhap', query: { redirect: to.fullPath } })
  if (isLogin || !user.value || to.path === '/admin/ho-so') return

  const pagePermissions: Array<[string, string]> = [
    ['/admin/phan-quyen', 'users.read'], ['/admin/khach-hang', 'customers.read'],
    ['/admin/san-pham', 'products.read'], ['/admin/don-hang', 'orders.read'],
    ['/admin/danh-gia', 'feedback.read'],
    ['/admin/lieu-trinh', 'services.read'], ['/admin/dat-lich', 'appointments.read'],
    ['/admin/khach-chatbot', 'customers.read'], ['/admin/nhan-vien', 'employees.read'],
    ['/admin/kho', 'inventory.read'], ['/admin/bai-viet', 'posts.read'],
    ['/admin/kinh-nghiem', 'posts.read'], ['/admin/viet-bai-ai', 'posts.read'],
    ['/admin/huong-dan-ai', 'posts.read'], ['/admin/thu-vien-anh', 'posts.read'],
    ['/admin/cau-hinh', 'settings.read'], ['/admin/tai-lieu', 'audit.read'],
    ['/admin/luong-chuc-nang', 'audit.read'],
  ]
  const required = to.path === '/admin' ? 'dashboard.read' : pagePermissions.find(([path]) => to.path.startsWith(path))?.[1]
  const allowed = (code: string) => user.value!.roles.some(role => role.code === 'owner') || user.value!.permissions.includes(code)
  if (to.path === '/admin/phan-quyen' ? allowed('users.read') || allowed('roles.read') : !required || allowed(required)) return
  const fallback = allowed('dashboard.read') ? '/admin' : allowed('roles.read') ? '/admin/phan-quyen' : pagePermissions.find(([, code]) => allowed(code))?.[0]
  return navigateTo(fallback ?? '/admin/ho-so')
})
