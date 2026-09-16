export type AdminSessionUser = {
  id: number
  username: string
  email: string
  phone: string
  fullName: string
  jobTitle: string
  initials: string
  roles: Array<{ code: string; name: string; branch: string }>
  permissions: string[]
}

export function useAdminAuth() {
  const user = useState<AdminSessionUser | null>('admin-user', () => null)
  const logoutPending = useState('admin-logout-pending', () => false)
  const can = (permission: string) => Boolean(user.value?.roles.some(role => role.code === 'owner') || user.value?.permissions.includes(permission))

  async function logout() {
    logoutPending.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      logoutPending.value = false
      await navigateTo('/admin/dang-nhap')
    }
  }

  return { user, logoutPending, logout, can }
}
