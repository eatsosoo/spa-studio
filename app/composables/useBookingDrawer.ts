export type BookingTarget = string | number

type BookingIntent = {
  target: string
  version: number
}

export function useBookingDrawer() {
  const isBookingOpen = useState('site-booking-drawer-open', () => false)
  const bookingIntent = useState<BookingIntent>('site-booking-drawer-intent', () => ({ target: '', version: 0 }))

  function openBooking(target: BookingTarget = '') {
    bookingIntent.value = {
      target: String(target),
      version: bookingIntent.value.version + 1,
    }
    isBookingOpen.value = true
  }

  function closeBooking() {
    isBookingOpen.value = false
  }

  return { isBookingOpen, bookingIntent, openBooking, closeBooking }
}
