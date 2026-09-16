import { createAccount } from '../../../services/access-control'

export default defineEventHandler(async event => ({ data: { id: await createAccount(event.context.adminUser!, await readBody(event)) } }))
