import { POST_MEDIA_MAX_FILES, optimizePostImage } from '../../../utils/post-media'
import { readMediaUpload } from '../../../utils/media-upload'

export default defineEventHandler(async (event) => {
  const { images, folder } = await readMediaUpload(event, 'images', POST_MEDIA_MAX_FILES)
  if (!images.length) throw createError({ statusCode: 422, statusMessage: 'Vui lòng chọn ít nhất một ảnh.' })
  if (images.length > POST_MEDIA_MAX_FILES) throw createError({ statusCode: 422, statusMessage: `Chỉ được tải tối đa ${POST_MEDIA_MAX_FILES} ảnh mỗi lần.` })
  const results = []
  for (const image of images) results.push(await optimizePostImage(image.data, folder, image.filename))
  return { data: results }
})
