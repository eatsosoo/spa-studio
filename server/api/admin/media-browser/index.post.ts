import { optimizeBrowserImage, POST_MEDIA_MAX_FILES } from '../../../utils/post-media'
import { readMediaUpload } from '../../../utils/media-upload'

export default defineEventHandler(async (event) => {
  const { images, path } = await readMediaUpload(event, 'images', POST_MEDIA_MAX_FILES)
  if (!images.length) throw createError({ statusCode: 422, statusMessage: 'Vui lòng chọn ít nhất một ảnh.' })
  if (images.length > POST_MEDIA_MAX_FILES) throw createError({ statusCode: 422, statusMessage: `Chỉ được tải tối đa ${POST_MEDIA_MAX_FILES} ảnh mỗi lần.` })
  const results = []
  for (const image of images) results.push(await optimizeBrowserImage(image.data, path, image.filename))
  return { data: results }
})
