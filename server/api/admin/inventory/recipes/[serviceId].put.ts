import { saveServiceRecipe } from '../../../../services/inventory'

export default defineEventHandler(async (event) => {
  const serviceId = Number(getRouterParam(event, 'serviceId'))
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw createError({ statusCode: 400, statusMessage: 'ID dịch vụ không hợp lệ.' })
  return { data: await saveServiceRecipe(serviceId, await readBody(event)) }
})
