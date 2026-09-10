import { optimizePostImage } from '../../utils/post-media'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const image = parts?.find(part => part.name === 'image' && part.filename)

  if (!image) throw createError({ statusCode: 422, statusMessage: 'Vui lòng chọn một ảnh.' })
  return { data: await optimizePostImage(image.data, 'chung', image.filename) }
})
