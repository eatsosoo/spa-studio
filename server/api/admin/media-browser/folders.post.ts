import { createMediaFolder } from '../../../utils/post-media'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: string; name?: string }>(event)
  return { data: await createMediaFolder(body.path, body.name) }
})
