import { saveRole } from '../../../services/access-control'

export default defineEventHandler(async event => ({ data: { id: await saveRole(event.context.adminUser!, null, await readBody(event)) } }))
