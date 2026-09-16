import { listAccounts } from '../../../services/access-control'

export default defineEventHandler(async () => ({ data: await listAccounts() }))
