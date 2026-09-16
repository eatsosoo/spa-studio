import type { AdminUser } from './admin-auth'

const resources: Record<string, string> = {
  customers: 'customers', products: 'products', services: 'services',
  bookings: 'appointments', employees: 'employees', posts: 'posts',
}

export function requiredAdminPermission(path: string, method: string): string | null {
  const verb = method.toUpperCase()
  const parts = path.split('/').filter(Boolean).slice(2)
  const [section, item, action] = parts
  if (!section) return null

  if (section === 'access' && verb === 'GET') return 'dashboard.read'
  if (section === 'accounts') {
    if (verb === 'GET') return 'users.read'
    if (verb === 'POST') return 'users.create'
    if (verb === 'PATCH') return 'users.update'
    return null
  }
  if (section === 'roles') {
    if (verb === 'GET') return 'roles.read'
    if (verb === 'POST' || verb === 'PATCH' || verb === 'DELETE') return 'roles.manage'
    return null
  }
  if (section === 'permissions' && verb === 'GET') return 'roles.read'

  if (resources[section]) {
    if (verb === 'GET') return `${resources[section]}.read`
    if (verb === 'POST') return `${resources[section]}.create`
    if (verb === 'PATCH') return `${resources[section]}.update`
    if (verb === 'DELETE') return section === 'bookings' ? 'appointments.cancel' : `${resources[section]}.delete`
    return null
  }
  if (section === 'dashboard' && verb === 'GET') return 'dashboard.read'
  if (section === 'form-options' && verb === 'GET') return 'dashboard.read'
  if (section === 'schedule' && verb === 'GET') return 'appointments.read'
  if (section === 'content-search' && verb === 'GET') return 'posts.read'
  if (section === 'inventory') {
    if (verb === 'GET') return 'inventory.read'
    if (verb === 'POST' || verb === 'PUT') return 'inventory.adjust'
    return null
  }
  if (section === 'orders') {
    if (verb === 'GET') return 'orders.read'
    if (verb === 'POST' && ['confirm', 'pay', 'fulfillment', 'cancel'].includes(action ?? '')) return 'orders.manage'
    return null
  }
  if (section === 'chat-leads') {
    if (verb === 'GET') return 'customers.read'
    if (verb === 'PATCH') return 'customers.update'
    if (verb === 'DELETE') return 'customers.delete'
    return null
  }
  if (section === 'ai-prompt') return verb === 'GET' ? 'posts.read' : verb === 'POST' ? 'posts.update' : null
  if (section === 'ai-post-jobs') {
    if (verb === 'GET') return 'posts.read'
    if (verb === 'POST') return 'posts.create'
    if (verb === 'PATCH') return 'posts.update'
    if (verb === 'DELETE') return 'posts.delete'
    return null
  }
  if (section === 'ai-posts-generate' || section === 'post-images') return verb === 'POST' ? 'posts.create' : null
  if (section === 'post-media' || section === 'media-browser') {
    if (verb === 'GET') return 'posts.read'
    if (verb === 'POST' || verb === 'PATCH') return 'posts.update'
    if (verb === 'DELETE') return 'posts.delete'
  }
  return null
}

export function hasAdminPermission(user: AdminUser, code: string) {
  return user.roles.some(role => role.code === 'owner') || user.permissions.includes(code)
}

export function requireAdminPermission(user: AdminUser, code: string) {
  if (!hasAdminPermission(user, code)) throw createError({ statusCode: 403, statusMessage: 'Bạn không có quyền thực hiện thao tác này.' })
}
