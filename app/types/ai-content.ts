export type AiPostStatus = 'queued' | 'generating' | 'generated' | 'scheduled' | 'published' | 'error'

export type AiPostMediaSource =
  | { kind: 'folder'; path: string; name: string; count?: number }
  | { kind: 'image'; folder: string; filename: string; url: string; thumbnailUrl: string }

export type AiPostJob = {
  id: string
  title: string
  category: string
  keyword: string
  cluster: string
  articleType: string
  wordRange: string
  targetAction: string
  imageSource: AiPostMediaSource | null
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
  featuredImage?: string
}

export const aiPostStatusLabels: Record<AiPostStatus, string> = {
  queued: 'Chờ viết',
  generating: 'Đang tạo',
  generated: 'Đã tạo',
  scheduled: 'Đã lên lịch',
  published: 'Đã đăng',
  error: 'Lỗi',
}
