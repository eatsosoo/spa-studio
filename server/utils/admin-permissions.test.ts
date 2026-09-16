import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasAdminPermission, requiredAdminPermission } from './admin-permissions'
import type { AdminUser } from './admin-auth'

const root = resolve(process.cwd(), 'server/api/admin')
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(join(directory, entry.name)) : [join(directory, entry.name)])
}

describe('admin permissions', () => {
  it('maps every admin API to a permission', () => {
    const routes = files(root).filter(file => /\.(get|post|patch|delete|put)\.ts$/.test(file))
    expect(routes.length).toBeGreaterThan(40)
    for (const file of routes) {
      const method = (file.match(/\.(get|post|patch|delete|put)\.ts$/)?.[1] ?? 'get').toUpperCase()
      const path = relative(root, file).replaceAll('\\', '/').replace(/\.(get|post|patch|delete|put)\.ts$/, '')
        .replace(/\bindex$/, '').replace(/\[resource\]/g, 'customers').replace(/\[[^\]]+\]/g, '1').replace(/\/$/, '')
      expect(requiredAdminPermission(`/api/admin/${path}`, method), file).toBeTruthy()
    }
  })

  it('checks grants and gives owner full access', () => {
    const user = { roles: [{ code: 'warehouse', name: 'Thủ kho', branch: 'MAIN' }], permissions: ['inventory.read'] } as AdminUser
    expect(hasAdminPermission(user, 'inventory.read')).toBe(true)
    expect(hasAdminPermission(user, 'roles.manage')).toBe(false)
    expect(hasAdminPermission({ ...user, roles: [{ code: 'owner', name: 'Chủ', branch: 'MAIN' }] }, 'roles.manage')).toBe(true)
    expect(requiredAdminPermission('/api/admin/unknown', 'GET')).toBeNull()
  })
})
