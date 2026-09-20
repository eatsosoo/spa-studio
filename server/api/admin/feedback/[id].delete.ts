import { deleteFeedback } from '../../../services/feedback'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'ID đánh giá không hợp lệ.' })
  await deleteFeedback(id, event.context.adminUser!.id)
  return { ok: true }
})
