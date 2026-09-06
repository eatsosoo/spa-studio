import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { appointmentServices, appointments, employees } from '../../../database/schema'
import { defaultBranch } from '../default-branch'
import { reverseStatus, statusValue, textValue, type AdminResource } from '../shared'

const employeeStatuses = {
  'Đang làm việc': 'active',
  'Nghỉ hôm nay': 'on_leave',
  'Đã nghỉ việc': 'terminated',
} as const

async function listEmployees() {
  const db = useDatabase()
  const rows = await db.select({
    id: employees.id, code: employees.code, name: employees.fullName, role: employees.jobTitle,
    phone: employees.phone, email: employees.email, hireDate: employees.hireDate, employeeStatus: employees.status,
    appointments: sql<number>`(select count(*) from ${appointmentServices} aps join ${appointments} ap on ap.id = aps.appointment_id where aps.employee_id = ${sql.raw('employees.id')} and date(ap.starts_at) = current_date())`.mapWith(Number),
  }).from(employees).where(isNull(employees.deletedAt)).orderBy(desc(employees.updatedAt))
  return rows.map(row => ({ ...row, role: row.role ?? 'Chưa phân vai trò', phone: row.phone ?? '', email: row.email ?? '', shift: 'Linh hoạt', status: reverseStatus(employeeStatuses, row.employeeStatus), employeeStatus: undefined }))
}

async function saveEmployee(id: number | null, body: Record<string, unknown>) {
  const db = useDatabase()
  const values = { branchId: await defaultBranch(db), code: textValue(body, 'code')!, fullName: textValue(body, 'name')!, phone: textValue(body, 'phone', false), email: textValue(body, 'email', false), hireDate: textValue(body, 'hireDate')!, jobTitle: textValue(body, 'role')!, status: statusValue(body, 'status', employeeStatuses, 'active') }
  if (id) await db.update(employees).set(values).where(and(eq(employees.id, id), isNull(employees.deletedAt)))
  else await db.insert(employees).values(values)
}

async function removeEmployee(id: number) {
  return useDatabase().update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id))
}

export const employeeResource = { list: listEmployees, save: saveEmployee, remove: removeEmployee } satisfies AdminResource
