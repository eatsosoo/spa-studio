export type AiPostStatus = 'queued' | 'generating' | 'generated' | 'scheduled' | 'published' | 'error'

export type AiPostJob = {
  id: string
  title: string
  category: string
  keyword: string
  cluster: string
  articleType: string
  wordRange: string
  targetUrl: string
  scheduledAt: string | null
  afterCreate?: 'draft' | 'published'
  keepTitle?: boolean
  status: AiPostStatus
  createdAt: string
  postId?: number
  error?: string
}

export type AiPostDraft = {
  title: string
  summary: string
  content: string
  focusKeyword: string
  metaTitle: string
  metaDescription: string
}

export const aiPostStatusLabels: Record<AiPostStatus, string> = {
  queued: 'Chờ viết',
  generating: 'Đang tạo',
  generated: 'Đã tạo',
  scheduled: 'Đã lên lịch',
  published: 'Đã đăng',
  error: 'Lỗi',
}
