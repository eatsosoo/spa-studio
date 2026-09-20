import { listAdminFeedback } from '../../../services/feedback'

export default defineEventHandler(async (event) => listAdminFeedback(getQuery(event)))
