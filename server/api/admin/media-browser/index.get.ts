import { listMediaDirectory } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return { data: await listMediaDirectory(query.path, query.search) }
})
