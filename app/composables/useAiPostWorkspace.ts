import type { AiPostJob, AiPostStatus } from '~/types/ai-content'

const storageKey = 'mien-ai-post-workspace-v1'

function id() {
  return import.meta.client && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function dateAfter(days: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function starterJobs(): AiPostJob[] {
  const rows = [
    ['7 cách ngủ ngon hơn sau một ngày căng thẳng', 'Chăm sóc tại nhà', 'ngủ ngon hơn', 'Giấc ngủ', 'Hướng dẫn', '900–1.200', 1, 9],
    ['Massage vai gáy tại nhà trong 10 phút', 'Chăm sóc tại nhà', 'massage vai gáy tại nhà', 'Thả lỏng cơ thể', 'Hướng dẫn', '1.000–1.400', 2, 14],
    ['Dấu hiệu cơ thể đang cần một ngày nghỉ', 'Hiểu về cơ thể', 'dấu hiệu cơ thể cần nghỉ ngơi', 'Phục hồi', 'Giải thích', '800–1.100', 4, 19],
    ['Chu trình chăm sóc da tối giản cho người bận rộn', 'Chăm sóc tại nhà', 'chăm sóc da tối giản', 'Chăm sóc da', 'Danh sách', '1.100–1.500', 6, 11],
  ] as const
  return rows.map(([title, category, keyword, cluster, articleType, wordRange, day, hour]) => ({
    id: id(), title, category, keyword, cluster, articleType, wordRange,
    targetAction: 'CTA đặt lịch: /dat-lich', imageSource: null, scheduledAt: dateAfter(day, hour), status: 'scheduled', createdAt: new Date().toISOString(),
  }))
}

export function useAiPostWorkspace() {
  const jobs = useState<AiPostJob[]>('ai-post-jobs', () => [])
  const hydrated = useState('ai-post-hydrated', () => false)

  function persist() {
    if (import.meta.client && hydrated.value) localStorage.setItem(storageKey, JSON.stringify(jobs.value))
  }

  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    try {
      const saved = localStorage.getItem(storageKey)
      const restored = (saved ? JSON.parse(saved) : starterJobs()) as Array<AiPostJob & { targetUrl?: string; imageFolder?: string }>
      jobs.value = restored.map(({ targetUrl, imageFolder, ...job }) => ({
        ...job,
        targetAction: job.targetAction ?? targetUrl ?? '',
        imageSource: job.imageSource ?? (imageFolder ? { kind: 'folder', path: imageFolder, name: imageFolder.split('/').at(-1) || imageFolder } : null),
      }))
    } catch {
      jobs.value = starterJobs()
    }
    hydrated.value = true
    persist()
  }

  function add(items: Omit<AiPostJob, 'id' | 'createdAt' | 'status'>[]) {
    const activeTitles = new Set(jobs.value.filter(job => job.status !== 'error').map(job => job.title.trim().toLocaleLowerCase('vi')))
    const unique = items.filter(item => {
      const title = item.title.trim().toLocaleLowerCase('vi')
      if (!title || activeTitles.has(title)) return false
      activeTitles.add(title)
      return true
    })
    jobs.value.unshift(...unique.map(item => ({ ...item, id: id(), createdAt: new Date().toISOString(), status: item.scheduledAt ? 'scheduled' : 'queued' as AiPostStatus })))
    persist()
    return unique.length
  }

  function patch(jobId: string, value: Partial<AiPostJob>) {
    const index = jobs.value.findIndex(job => job.id === jobId)
    if (index < 0) return
    jobs.value[index] = { ...jobs.value[index]!, ...value }
    persist()
  }

  function remove(jobId: string) {
    jobs.value = jobs.value.filter(job => job.id !== jobId)
    persist()
  }

  return { jobs, hydrated, hydrate, add, patch, remove }
}
