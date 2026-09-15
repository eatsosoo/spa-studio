import { and, eq } from 'drizzle-orm'
import { aiPromptRevisions } from '../../../../database/schema'
import { useDatabase } from '../../../../database/client'
import { ARTICLE_PROMPT_KEY } from '../../../../utils/ai-prompts'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Phiên bản không hợp lệ.' })
  const db = useDatabase()
  const [revision] = await db.select({ id: aiPromptRevisions.id }).from(aiPromptRevisions)
    .where(and(eq(aiPromptRevisions.id, id), eq(aiPromptRevisions.promptKey, ARTICLE_PROMPT_KEY))).limit(1)
  if (!revision) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy phiên bản.' })
  await db.transaction(async (tx) => {
    await tx.update(aiPromptRevisions).set({ isActive: false }).where(eq(aiPromptRevisions.promptKey, ARTICLE_PROMPT_KEY))
    await tx.update(aiPromptRevisions).set({ isActive: true }).where(eq(aiPromptRevisions.id, id))
  })
  return { ok: true }
})
