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
})
