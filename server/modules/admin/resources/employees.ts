import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { appointmentServices, appointments, authSessions, employees, roles, userRoles, users } from '../../../database/schema'
import { defaultBranch } from '../default-branch'
import { reverseStatus, statusValue, textValue, type AdminResource } from '../shared'

const employeeStatuses = {
  'Đang làm việc': 'active',
  'Nghỉ hôm nay': 'on_leave',
  'Đã nghỉ việc': 'terminated',
} as const

async function protectOwner(userId: number | null) {
  if (!userId) return
  const assigned = await useDatabase().select({ roleId: userRoles.roleId }).from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.code, 'owner'))).limit(1)
  if (assigned.length) throw createError({ statusCode: 403, statusMessage: 'Không thể ngừng hoặc xóa hồ sơ owner tại đây.' })
}

async function listEmployees() {
  const db = useDatabase()
  const rows = await db.select({
    id: employees.id, code: employees.code, name: employees.fullName, role: employees.jobTitle,
    phone: employees.phone, email: employees.email, hireDate: employees.hireDate, employeeStatus: employees.status,
    appointments: sql<number>`(select count(*) from ${appointmentServices} aps join ${appointments} ap on ap.id = aps.appointment_id where aps.employee_id = ${sql.raw('employees.id')} and date(ap.starts_at) = current_date())`.mapWith(Number),
  }).from(employees).where(isNull(employees.deletedAt)).orderBy(desc(employees.updatedAt))
  return rows.map(row => ({ ...row, role: row.role ?? 'Chưa có chức danh', phone: row.phone ?? '', email: row.email ?? '', shift: 'Linh hoạt', status: reverseStatus(employeeStatuses, row.employeeStatus), employeeStatus: undefined }))
}

async function saveEmployee(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const values = { branchId: await defaultBranch(db), code: textValue(body, 'code')!, fullName: textValue(body, 'name')!, phone: textValue(body, 'phone', false), email: textValue(body, 'email', false), hireDate: textValue(body, 'hireDate')!, jobTitle: textValue(body, 'role')!, status: statusValue(body, 'status', employeeStatuses, 'active') }
  if (id && values.status === 'terminated') {
    const [employee] = await db.select({ userId: employees.userId }).from(employees).where(eq(employees.id, id)).limit(1)
    await protectOwner(employee?.userId ?? null)
  }
  if (id) await db.transaction(async tx => {
    await tx.update(employees).set(values).where(and(eq(employees.id, id), isNull(employees.deletedAt)))
    if (values.status === 'terminated') {
      const [employee] = await tx.select({ userId: employees.userId }).from(employees).where(eq(employees.id, id)).limit(1)
      if (employee?.userId) {
        await tx.update(users).set({ status: 'disabled' }).where(eq(users.id, employee.userId))
        await tx.update(authSessions).set({ revokedAt: new Date(), revokeReason: 'employment_ended' }).where(and(eq(authSessions.userId, employee.userId), isNull(authSessions.revokedAt)))
      }
    }
  })
  else await db.insert(employees).values(values)
}

async function removeEmployee(id: number) {
  const [current] = await useDatabase().select({ userId: employees.userId }).from(employees).where(eq(employees.id, id)).limit(1)
  await protectOwner(current?.userId ?? null)
  return useDatabase().transaction(async tx => {
    const [employee] = await tx.select({ userId: employees.userId }).from(employees).where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1)
    if (!employee) return
    await tx.update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id))
    if (employee.userId) {
      await tx.update(users).set({ status: 'disabled' }).where(eq(users.id, employee.userId))
      await tx.update(authSessions).set({ revokedAt: new Date(), revokeReason: 'employee_deleted' }).where(and(eq(authSessions.userId, employee.userId), isNull(authSessions.revokedAt)))
    }
  })
}

export const employeeResource = { list: listEmployees, save: saveEmployee, remove: removeEmployee } satisfies AdminResource
