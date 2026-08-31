import { getDailyBookingSchedule } from '../../services/admin-resources'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
  return { data: await getDailyBookingSchedule(String(query.date ?? today)) }
})
