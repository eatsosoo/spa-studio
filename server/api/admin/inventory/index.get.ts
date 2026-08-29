import { getInventoryWorkspace } from '../../../services/inventory'

export default defineEventHandler(async () => ({ data: await getInventoryWorkspace() }))
