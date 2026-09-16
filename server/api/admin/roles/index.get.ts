import { listRoles } from '../../../services/access-control'

export default defineEventHandler(async () => ({ data: await listRoles() }))
