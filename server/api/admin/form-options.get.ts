import { asc, eq, isNull, and } from 'drizzle-orm'
import { employees, postCategories, productCategories, serviceCategories, services } from '../../database/schema'
import { useDatabase } from '../../database/client'

export default defineEventHandler(async () => {
  const db = useDatabase()
  const [serviceRows, employeeRows, productCategoryRows, serviceCategoryRows, postCategoryRows] = await Promise.all([
    db.select({ name: services.name }).from(services).where(and(eq(services.isActive, true), isNull(services.deletedAt))).orderBy(asc(services.name)),
    db.select({ name: employees.fullName }).from(employees).where(and(eq(employees.status, 'active'), isNull(employees.deletedAt))).orderBy(asc(employees.fullName)),
    db.select({ name: productCategories.name }).from(productCategories).where(eq(productCategories.isActive, true)).orderBy(asc(productCategories.name)),
    db.select({ name: serviceCategories.name }).from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.name)),
    db.select({ name: postCategories.name }).from(postCategories).orderBy(asc(postCategories.name)),
  ])
  return { data: { services: serviceRows.map(item => item.name), employees: employeeRows.map(item => item.name), productCategories: productCategoryRows.map(item => item.name), serviceCategories: serviceCategoryRows.map(item => item.name), postCategories: postCategoryRows.map(item => item.name) } }
})
