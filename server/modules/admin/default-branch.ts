import { eq } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { branches } from '../../database/schema'

export async function defaultBranch(db: ReturnType<typeof useDatabase>) {
  const [branch] = await db.select({ id: branches.id })
    .from(branches)
    .where(eq(branches.code, 'MAIN'))
    .limit(1)

  if (!branch) {
    throw createError({ statusCode: 409, statusMessage: 'Chưa có chi nhánh MAIN. Hãy chạy migration trước.' })
  }
  return branch.id
}
