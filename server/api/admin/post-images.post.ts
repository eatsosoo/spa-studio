import { optimizePostImage } from '../../utils/post-media'
import { readMediaUpload } from '../../utils/media-upload'

export default defineEventHandler(async (event) => {
  const { images } = await readMediaUpload(event, 'image', 1)
  const image = images[0]

  if (!image) throw createError({ statusCode: 422, statusMessage: 'Vui lòng chọn một ảnh.' })
  return { data: await optimizePostImage(image.data, 'chung', image.filename) }
})
