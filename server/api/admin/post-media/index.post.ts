import { POST_MEDIA_MAX_FILES, optimizePostImage } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const images = parts?.filter(part => part.name === 'images' && part.filename) ?? []
  const folder = parts?.find(part => part.name === 'folder')?.data.toString('utf8') ?? 'chung'
  if (!images.length) throw createError({ statusCode: 422, statusMessage: 'Vui lòng chọn ít nhất một ảnh.' })
  if (images.length > POST_MEDIA_MAX_FILES) throw createError({ statusCode: 422, statusMessage: `Chỉ được tải tối đa ${POST_MEDIA_MAX_FILES} ảnh mỗi lần.` })
  const results = []
  for (const image of images) results.push(await optimizePostImage(image.data, folder, image.filename))
  return { data: results }
})
