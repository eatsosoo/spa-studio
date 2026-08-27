import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

let pool: mysql.Pool | undefined

export function useDatabase() {
  const databaseUrl = useRuntimeConfig().databaseUrl

  if (!databaseUrl) {
    throw new Error('Missing NUXT_DATABASE_URL or DATABASE_URL')
  }

  pool ??= mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 10,
    enableKeepAlive: true,
    timezone: 'Z',
  })

  return drizzle(pool, { schema, mode: 'default' })
}

