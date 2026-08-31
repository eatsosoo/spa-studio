import { getServiceRecipes } from '../../../../services/inventory'

export default defineEventHandler(async () => ({ data: await getServiceRecipes() }))
