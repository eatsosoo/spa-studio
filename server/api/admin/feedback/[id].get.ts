import { getAdminFeedback } from '../../../services/feedback'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'ID đánh giá không hợp lệ.' })
  return { data: await getAdminFeedback(id) }
})
