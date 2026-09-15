import { eq } from 'drizzle-orm'
import { aiPromptRevisions } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { ARTICLE_PROMPT_KEY } from '../../utils/ai-prompts'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ content?: string }>(event)
  const content = String(body.content ?? '').trim()
  if (content.length < 80) throw createError({ statusCode: 422, statusMessage: 'Hướng dẫn cần có ít nhất 80 ký tự.' })
  if (content.length > 100_000) throw createError({ statusCode: 413, statusMessage: 'Hướng dẫn vượt quá 100.000 ký tự.' })
  const userId = event.context.adminUser?.id
  const db = useDatabase()
  let id = 0
  await db.transaction(async (tx) => {
    await tx.update(aiPromptRevisions).set({ isActive: false }).where(eq(aiPromptRevisions.promptKey, ARTICLE_PROMPT_KEY))
    const [created] = await tx.insert(aiPromptRevisions).values({ promptKey: ARTICLE_PROMPT_KEY, content, isActive: true, createdBy: userId }).$returningId()
    id = Number(created?.id ?? 0)
  })
  return { data: { id, content, isActive: true } }
})
