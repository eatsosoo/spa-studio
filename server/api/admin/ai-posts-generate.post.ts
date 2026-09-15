import { attachMissingFolderImages } from '../../utils/ai-post-images'
import { listMediaDirectory, safeFilename, safeMediaDirectory } from '../../utils/post-media'
import { activeArticlePrompt } from '../../utils/ai-prompts'

type GenerateBody = {
  title?: string
  category?: string
  keyword?: string
  articleType?: string
  wordRange?: string
  targetAction?: string
  imageSource?: { kind?: 'folder' | 'image'; path?: string; folder?: string; filename?: string }
  keepTitle?: boolean
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  error?: { message?: string }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateBody>(event)
  const title = String(body.title ?? '').trim()
  if (!title) throw createError({ statusCode: 422, statusMessage: 'Tiêu đề bài viết là bắt buộc.' })

  const config = useRuntimeConfig()
  const apiKey = String(config.openaiApiKey ?? '').trim()
  if (!apiKey) throw createError({ statusCode: 503, statusMessage: 'Chưa cấu hình OPENAI_API_KEY trên máy chủ.' })

  const source = body.imageSource
  let imageSourceLabel = 'không chọn'
  let folderImages: Array<{ url: string; filename: string }> = []
  if (source?.kind === 'folder') {
    const path = safeMediaDirectory(source.path)
    imageSourceLabel = `thư mục ${path}`
    folderImages = (await listMediaDirectory(path)).images.slice(0, 3)
  } else if (source?.kind === 'image') {
    const folder = safeMediaDirectory(source.folder)
    const filename = safeFilename(source.filename)
    const image = (await listMediaDirectory(folder)).images.find(item => item.filename === filename)
    if (!image) throw createError({ statusCode: 404, statusMessage: 'Ảnh đã chọn không còn tồn tại trong Thư viện ảnh.' })
    imageSourceLabel = `ảnh ${folder ? `${folder}/` : ''}${filename}`
    folderImages = [image]
  }

  const instructions = `${await activeArticlePrompt()}\n\n${folderImages.length ? 'Chèn các ảnh được cung cấp vào vị trí phù hợp trong bài.' : 'Không chèn ảnh khi không có ảnh được cung cấp.'}`
  const input = [
    `Tiêu đề: ${title}`,
    `Chuyên mục: ${body.category || 'Chăm sóc tại nhà'}`,
    `Dạng bài: ${body.articleType || 'Hướng dẫn'}`,
    `Độ dài mong muốn: ${body.wordRange || '900–1.200'} từ`,
    `Từ khóa chính: ${body.keyword || title}`,
    `Nguồn ảnh: ${imageSourceLabel}`,
    `Ảnh có sẵn: ${folderImages.length ? folderImages.map((image, index) => `${index + 1}. ${image.url} (${image.filename})`).join('; ') : 'không có'}`,
    `CTA / Trang đích: ${body.targetAction || 'không có'}`,
    body.keepTitle === false ? 'Có thể tinh chỉnh tiêu đề cho tự nhiên hơn.' : 'Giữ nguyên tiêu đề đã cho.',
  ].join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: String(config.openaiModel || 'gpt-5-mini'),
      instructions,
      input,
      store: false,
      max_output_tokens: 5000,
      text: {
        format: {
          type: 'json_schema',
          name: 'mien_spa_article',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' }, summary: { type: 'string' }, content: { type: 'string' }, focusKeyword: { type: 'string' }, metaTitle: { type: 'string' }, metaDescription: { type: 'string' },
            },
            required: ['title', 'summary', 'content', 'focusKeyword', 'metaTitle', 'metaDescription'],
          },
        },
      },
    }),
    signal: AbortSignal.timeout(120000),
  })
  const result = await response.json() as OpenAIResponse
  if (!response.ok) throw createError({ statusCode: response.status, statusMessage: result.error?.message || 'OpenAI không thể tạo bài viết.' })
  const output = result.output_text ?? result.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text
  if (!output) throw createError({ statusCode: 502, statusMessage: 'OpenAI không trả về nội dung bài viết.' })
  try {
    const draft = JSON.parse(output)
    return {
      ...draft,
      content: attachMissingFolderImages(String(draft.content ?? ''), folderImages, title),
      featuredImage: folderImages[0]?.url ?? '',
    }
  } catch { throw createError({ statusCode: 502, statusMessage: 'Nội dung AI trả về không đúng định dạng.' }) }
})
