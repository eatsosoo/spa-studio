import { removeRole } from '../../../services/access-control'

export default defineEventHandler(async event => { await removeRole(event.context.adminUser!, getRouterParam(event, 'id')); return { success: true } })
