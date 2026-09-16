import { updateAccount } from '../../../services/access-control'

export default defineEventHandler(async event => { await updateAccount(event.context.adminUser!, getRouterParam(event, 'id'), await readBody(event)); return { success: true } })
