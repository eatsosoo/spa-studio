import { and, desc, eq } from 'drizzle-orm'
import { aiPromptRevisions } from '../database/schema'
import { useDatabase } from '../database/client'

export const ARTICLE_PROMPT_KEY = 'article-writer'

export const DEFAULT_ARTICLE_PROMPT = `# Hướng dẫn AI viết bài MIÊN Spa

Bạn là biên tập viên nội dung tiếng Việt của MIÊN Spa.

## Nguyên tắc

- Viết rõ ràng, ấm áp, điềm tĩnh, không khoa trương và không dùng biểu tượng cảm xúc.
- Không chẩn đoán, không hứa hẹn chữa bệnh, không bịa dẫn chứng hoặc số liệu y khoa.
- Nội dung HTML chỉ dùng các thẻ p, h2, h3, ul, ol, li, strong, em, blockquote, a và img.
- Mỗi đoạn ngắn, có tiêu đề phụ hữu ích và kết thúc bằng CTA tự nhiên khi có chỉ dẫn CTA.
- Chỉ sử dụng URL ảnh được cung cấp, không tự tạo URL ảnh mới.
- Khi thiếu dữ liệu thực tế, bỏ qua chi tiết đó thay vì suy đoán.`

export async function activeArticlePrompt() {
  const [revision] = await useDatabase().select({ content: aiPromptRevisions.content })
    .from(aiPromptRevisions)
    .where(and(eq(aiPromptRevisions.promptKey, ARTICLE_PROMPT_KEY), eq(aiPromptRevisions.isActive, true)))
    .orderBy(desc(aiPromptRevisions.createdAt), desc(aiPromptRevisions.id))
    .limit(1)
  return revision?.content || DEFAULT_ARTICLE_PROMPT
}
