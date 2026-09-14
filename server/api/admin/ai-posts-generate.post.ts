type GenerateBody = {
  title?: string
  category?: string
  keyword?: string
  articleType?: string
  wordRange?: string
  targetUrl?: string
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

  const instructions = [
    'Bạn là biên tập viên nội dung tiếng Việt của MIÊN Spa.',
    'Viết rõ ràng, ấm áp, điềm tĩnh, không khoa trương và không dùng biểu tượng cảm xúc.',
    'Không chẩn đoán, không hứa hẹn chữa bệnh, không bịa dẫn chứng hoặc số liệu y khoa.',
    'Nội dung HTML chỉ dùng các thẻ p, h2, h3, ul, ol, li, strong, em, blockquote và a.',
    'Mỗi đoạn ngắn, có tiêu đề phụ hữu ích và kết thúc bằng lời mời nhẹ nhàng nếu có trang đích.',
  ].join(' ')
  const input = [
    `Tiêu đề: ${title}`,
    `Chuyên mục: ${body.category || 'Chăm sóc tại nhà'}`,
    `Dạng bài: ${body.articleType || 'Hướng dẫn'}`,
    `Độ dài mong muốn: ${body.wordRange || '900–1.200'} từ`,
    `Từ khóa chính: ${body.keyword || title}`,
    `Trang đích: ${body.targetUrl || 'không có'}`,
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
  try { return JSON.parse(output) } catch { throw createError({ statusCode: 502, statusMessage: 'Nội dung AI trả về không đúng định dạng.' }) }
})
