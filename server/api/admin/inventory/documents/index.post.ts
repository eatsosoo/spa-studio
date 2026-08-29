import { createInventoryDocument } from '../../../../services/inventory'

export default defineEventHandler(async (event) => {
  const userId = event.context.adminUser?.id
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập không hợp lệ.' })
  return { data: await createInventoryDocument(await readBody(event), userId) }
})
