import { desc, eq } from 'drizzle-orm'
import { aiPromptRevisions, users } from '../../database/schema'
import { useDatabase } from '../../database/client'
import { ARTICLE_PROMPT_KEY, DEFAULT_ARTICLE_PROMPT } from '../../utils/ai-prompts'

export default defineEventHandler(async () => {
  const revisions = await useDatabase().select({
    id: aiPromptRevisions.id,
    content: aiPromptRevisions.content,
    isActive: aiPromptRevisions.isActive,
    createdAt: aiPromptRevisions.createdAt,
    author: users.username,
  }).from(aiPromptRevisions)
    .leftJoin(users, eq(aiPromptRevisions.createdBy, users.id))
    .where(eq(aiPromptRevisions.promptKey, ARTICLE_PROMPT_KEY))
    .orderBy(desc(aiPromptRevisions.createdAt), desc(aiPromptRevisions.id))
    .limit(30)

  return {
    data: {
      content: revisions.find(item => item.isActive)?.content ?? DEFAULT_ARTICLE_PROMPT,
      revisions: revisions.map(item => ({ ...item, author: item.author ?? 'Hệ thống' })),
    },
  }
})
