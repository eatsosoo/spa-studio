import { listMedia } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return { data: await listMedia(String(query.search ?? '')) }
})
