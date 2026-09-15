import { and, asc, eq, isNull } from 'drizzle-orm'
import { services } from '../../database/schema'
import { useDatabase } from '../../database/client'

export default defineEventHandler(async () => ({ data: await useDatabase().select({ name: services.name, durationMinutes: services.durationMinutes, price: services.price }).from(services).where(and(eq(services.isActive, true), isNull(services.deletedAt))).orderBy(asc(services.name)).limit(50) }))
