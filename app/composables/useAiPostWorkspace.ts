import type { AiPostJob } from '~/types/ai-content'

export function useAiPostWorkspace() {
  const jobs = useState<AiPostJob[]>('ai-post-jobs', () => [])
  const hydrated = useState('ai-post-hydrated', () => false)

  async function hydrate(force = false) {
    if (hydrated.value && !force) return
    const response = await $fetch<{ data: AiPostJob[] }>('/api/admin/ai-post-jobs')
    jobs.value = response.data
    hydrated.value = true
  }

  async function add(items: Omit<AiPostJob, 'id' | 'createdAt' | 'status'>[]) {
    const response = await $fetch<{ data: { count: number } }>('/api/admin/ai-post-jobs', { method: 'POST', body: { items } })
    await hydrate(true)
    return response.data.count
  }

  async function patch(jobId: string, value: Partial<AiPostJob>) {
    const index = jobs.value.findIndex(job => job.id === jobId)
    if (index < 0) return
    const previous = jobs.value[index]!
    jobs.value[index] = { ...previous, ...value }
    try { await $fetch(`/api/admin/ai-post-jobs/${jobId}`, { method: 'PATCH', body: value }) }
    catch (error) { jobs.value[index] = previous; throw error }
  }

  async function remove(jobId: string) {
    await $fetch(`/api/admin/ai-post-jobs/${jobId}`, { method: 'DELETE' })
    jobs.value = jobs.value.filter(job => job.id !== jobId)
  }

  return { jobs, hydrated, hydrate, add, patch, remove }
}
