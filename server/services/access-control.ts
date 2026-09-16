import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { auditLogs, authSessions, branches, employees, permissions, rolePermissions, roles, userRoles, users } from '../database/schema'
import { hashPassword, type AdminUser } from '../utils/admin-auth'

const db = () => useDatabase()
const bad = (message: string, statusCode = 422) => createError({ statusCode, statusMessage: message })
const numberId = (value: unknown) => {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw bad('ID không hợp lệ.')
  return id
}
const ids = (value: unknown) => {
  if (!Array.isArray(value)) throw bad('Danh sách ID không hợp lệ.')
  return [...new Set(value.map(numberId))]
}
const isOwner = (actor: AdminUser) => actor.roles.some(role => role.code === 'owner')

async function mainBranchId() {
  const [branch] = await db().select({ id: branches.id }).from(branches).where(and(eq(branches.code, 'MAIN'), eq(branches.isActive, true))).limit(1)
  if (!branch) throw bad('Chi nhánh MAIN không hoạt động.', 409)
  return branch.id
}

async function validateRoleIds(roleIds: number[], actor: AdminUser) {
  if (!roleIds.length) return
  const found = await db().select({ id: roles.id, code: roles.code }).from(roles).where(inArray(roles.id, roleIds))
  if (found.length !== roleIds.length) throw bad('Có vai trò không tồn tại.')
  if (!isOwner(actor) && found.some(role => role.code === 'owner')) throw bad('Chỉ chủ hệ thống được gán vai trò owner.', 403)
  if (!isOwner(actor)) {
    const grants = await db().select({ code: permissions.code }).from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds))
    if (grants.some(grant => !actor.permissions.includes(grant.code))) throw bad('Không thể gán vai trò có quyền vượt quá quyền của bạn.', 403)
  }
}

async function validatePermissionIds(permissionIds: number[], actor: AdminUser) {
  if (!permissionIds.length) return
  const found = await db().select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.id, permissionIds))
  if (found.length !== permissionIds.length) throw bad('Có quyền không tồn tại.')
  if (!isOwner(actor) && found.some(item => !actor.permissions.includes(item.code))) throw bad('Không thể cấp quyền vượt quá quyền của bạn.', 403)
}

export async function listPermissions() {
  return db().select({ id: permissions.id, code: permissions.code, module: permissions.module, action: permissions.action, description: permissions.description }).from(permissions).orderBy(permissions.module, permissions.code)
}

export async function listRoles() {
  const [roleRows, grants] = await Promise.all([
    db().select({ id: roles.id, code: roles.code, name: roles.name, description: roles.description, isSystem: roles.isSystem }).from(roles).orderBy(roles.name),
    db().select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId }).from(rolePermissions),
  ])
  return roleRows.map(role => ({ ...role, permissionIds: grants.filter(grant => grant.roleId === role.id).map(grant => grant.permissionId) }))
}

export async function saveRole(actor: AdminUser, idValue: unknown, body: Record<string, unknown>) {
  const id = idValue == null ? null : numberId(idValue)
  const name = String(body.name ?? '').trim()
  const code = String(body.code ?? '').trim().toLowerCase()
  const description = String(body.description ?? '').trim() || null
  const permissionIds = ids(body.permissionIds)
  if (!name || name.length > 120) throw bad('Tên vai trò phải từ 1 đến 120 ký tự.')
  if (!id && !/^[a-z][a-z0-9_]{2,79}$/.test(code)) throw bad('Mã vai trò cần 3–80 ký tự, bắt đầu bằng chữ, chỉ gồm chữ thường, số và dấu _.')
  await validatePermissionIds(permissionIds, actor)
  const existing = id ? (await db().select().from(roles).where(eq(roles.id, id)).limit(1))[0] : null
  if (id && !existing) throw bad('Không tìm thấy vai trò.', 404)
  if (existing?.code === 'owner') throw bad('Quyền owner luôn là toàn quyền và không thể chỉnh sửa.', 403)
  if (!id && (await db().select({ id: roles.id }).from(roles).where(eq(roles.code, code)).limit(1)).length) throw bad('Mã vai trò đã tồn tại.', 409)
  const result = await db().transaction(async tx => {
    const roleId = id ?? (await tx.insert(roles).values({ code, name, description }).$returningId())[0]?.id
    if (!roleId) throw bad('Không thể tạo vai trò.', 500)
    if (id) await tx.update(roles).set({ name, description }).where(eq(roles.id, id))
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (permissionIds.length) await tx.insert(rolePermissions).values(permissionIds.map(permissionId => ({ roleId, permissionId })))
    await tx.insert(auditLogs).values({ userId: actor.id, action: id ? 'role.update' : 'role.create', entityType: 'role', entityId: String(roleId), oldValues: existing ? { name: existing.name } : null, newValues: { name, permissionIds } })
    return roleId
  })
  return result
}

export async function removeRole(actor: AdminUser, idValue: unknown) {
  const id = numberId(idValue)
  const [role] = await db().select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!role) throw bad('Không tìm thấy vai trò.', 404)
  if (role.isSystem) throw bad('Không thể xóa vai trò hệ thống.', 403)
  if ((await db().select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, id)).limit(1)).length) throw bad('Vai trò đang được gán cho tài khoản.', 409)
  await db().transaction(async tx => {
    await tx.delete(roles).where(eq(roles.id, id))
    await tx.insert(auditLogs).values({ userId: actor.id, action: 'role.delete', entityType: 'role', entityId: String(id), oldValues: { code: role.code, name: role.name } })
  })
}

export async function listAccounts() {
  const branchId = await mainBranchId()
  const [accountRows, assignments, employeeRows, roleRows] = await Promise.all([
    db().select({ id: users.id, username: users.username, email: users.email, status: users.status, lastLoginAt: users.lastLoginAt, employeeId: employees.id, employeeName: employees.fullName })
      .from(users).leftJoin(employees, and(eq(employees.userId, users.id), isNull(employees.deletedAt)))
      .where(isNull(users.deletedAt)).orderBy(users.username),
    db().select({ userId: userRoles.userId, roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.branchId, branchId)),
    db().select({ id: employees.id, name: employees.fullName, code: employees.code, userId: employees.userId }).from(employees)
      .where(and(eq(employees.branchId, branchId), isNull(employees.deletedAt), ne(employees.status, 'terminated'))).orderBy(employees.fullName),
    db().select({ id: roles.id, name: roles.name }).from(roles),
  ])
  return {
    accounts: accountRows.filter(account => assignments.some(row => row.userId === account.id) || employeeRows.some(employee => employee.userId === account.id))
      .map(account => ({ ...account, roleIds: assignments.filter(row => row.userId === account.id).map(row => row.roleId), roleNames: assignments.filter(row => row.userId === account.id).map(row => roleRows.find(role => role.id === row.roleId)?.name).filter(Boolean) })),
    employees: employeeRows.filter(employee => !employee.userId),
  }
}

export async function createAccount(actor: AdminUser, body: Record<string, unknown>) {
  const employeeId = numberId(body.employeeId)
  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '')
  const roleIds = ids(body.roleIds ?? [])
  if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username)) throw bad('Tên đăng nhập cần 3–80 ký tự và chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.')
  if (password.length < 8) throw bad('Mật khẩu cần ít nhất 8 ký tự.')
  await validateRoleIds(roleIds, actor)
  const branchId = await mainBranchId()
  if ((await db().select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)).length) throw bad('Tên đăng nhập đã tồn tại.', 409)
  const id = await db().transaction(async tx => {
    const [employee] = await tx.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.branchId, branchId), isNull(employees.deletedAt))).limit(1).for('update')
    if (!employee || employee.status === 'terminated' || employee.userId) throw bad('Nhân viên không hợp lệ hoặc đã có tài khoản.', 409)
    const [created] = await tx.insert(users).values({ username, email: employee.email, phone: employee.phone, passwordHash: await hashPassword(password), status: 'active' }).$returningId()
    if (!created) throw bad('Không thể tạo tài khoản.', 500)
    await tx.update(employees).set({ userId: created.id }).where(eq(employees.id, employeeId))
    if (roleIds.length) await tx.insert(userRoles).values(roleIds.map(roleId => ({ userId: created.id, roleId, branchId })))
    await tx.insert(auditLogs).values({ userId: actor.id, action: 'account.create', entityType: 'user', entityId: String(created.id), newValues: { employeeId, username, roleIds } })
    return created.id
  })
  return id
}

export async function updateAccount(actor: AdminUser, idValue: unknown, body: Record<string, unknown>) {
  const id = numberId(idValue)
  if (id === actor.id) throw bad('Hãy dùng trang Hồ sơ để cập nhật tài khoản của bạn.', 403)
  const branchId = await mainBranchId()
  const [account] = await db().select({ id: users.id, status: users.status }).from(users)
    .innerJoin(employees, eq(employees.userId, users.id))
    .where(and(eq(users.id, id), eq(employees.branchId, branchId), isNull(users.deletedAt), isNull(employees.deletedAt))).limit(1)
  if (!account) throw bad('Không tìm thấy tài khoản nhân viên.', 404)
  const status = body.status === undefined ? undefined : String(body.status)
  if (status && !['active', 'disabled'].includes(status)) throw bad('Trạng thái tài khoản không hợp lệ.')
  const password = body.password === undefined ? undefined : String(body.password)
  if (password !== undefined && password.length < 8) throw bad('Mật khẩu cần ít nhất 8 ký tự.')
  const roleIds = body.roleIds === undefined ? undefined : ids(body.roleIds)
  if (roleIds) {
    await validateRoleIds(roleIds, actor)
  }
  const oldRoles = await db().select({ roleId: userRoles.roleId, code: roles.code }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(userRoles.userId, id), eq(userRoles.branchId, branchId)))
  if (oldRoles.some(role => role.code === 'owner') && !isOwner(actor)) throw bad('Chỉ chủ hệ thống được cập nhật tài khoản owner.', 403)
  if (oldRoles.some(role => role.code === 'owner') && (status === 'disabled' || roleIds && !roleIds.some(roleId => oldRoles.some(role => role.roleId === roleId && role.code === 'owner')))) throw bad('Không thể khóa hoặc bỏ vai trò owner.', 403)
  await db().transaction(async tx => {
    if (status || password !== undefined) await tx.update(users).set({ ...(status ? { status: status as 'active' | 'disabled' } : {}), ...(password !== undefined ? { passwordHash: await hashPassword(password), passwordChangedAt: new Date() } : {}) }).where(eq(users.id, id))
    if (roleIds) {
      await tx.delete(userRoles).where(and(eq(userRoles.userId, id), eq(userRoles.branchId, branchId)))
      if (roleIds.length) await tx.insert(userRoles).values(roleIds.map(roleId => ({ userId: id, roleId, branchId })))
    }
    if (status === 'disabled' || password !== undefined || roleIds) await tx.update(authSessions).set({ revokedAt: new Date(), revokeReason: 'account_changed' }).where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)))
    await tx.insert(auditLogs).values({ userId: actor.id, action: 'account.update', entityType: 'user', entityId: String(id), oldValues: { status: account.status, roleIds: oldRoles.map(role => role.roleId) }, newValues: { status: status ?? account.status, roleIds } })
  })
}
