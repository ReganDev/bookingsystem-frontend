import { dateKey } from './monthGrid'
import type { Booking } from '../types/api'

/** Group bookings by local calendar day, sorted earliest-first within each day. */
export function groupBookingsByDay(bookings: Booking[]) {
  const map = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const key = dateKey(new Date(booking.startDatetime))
    const list = map.get(key) ?? []
    list.push(booking)
    map.set(key, list)
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.startDatetime).getTime() -
        new Date(b.startDatetime).getTime(),
    )
  }
  return map
}
