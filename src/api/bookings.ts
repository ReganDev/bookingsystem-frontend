import { apiRequest } from './client'
import type {
  Booking,
  BookingRequest,
  BookingStatus,
  CancelScope,
  Page,
  RecurringBookingRequest,
  RecurringBookingResponse,
} from '../types/api'

export function getBookings(businessId: string, token: string) {
  return apiRequest<Page<Booking>>(`/businesses/${businessId}/bookings`, {
    token,
  })
}

export function getBookingsInRange(
  businessId: string,
  start: string,
  end: string,
  token: string,
) {
  const params = new URLSearchParams({ start, end })
  return apiRequest<Booking[]>(
    `/businesses/${businessId}/bookings/range?${params}`,
    { token },
  )
}

export function createBooking(
  businessId: string,
  request: BookingRequest,
  token: string,
) {
  return apiRequest<Booking>(`/businesses/${businessId}/bookings`, {
    method: 'POST',
    body: request,
    token,
  })
}

/** Creates a standing appointment. Occurrences that clash are skipped and reported. */
export function createRecurringBookings(
  businessId: string,
  request: RecurringBookingRequest,
  token: string,
) {
  return apiRequest<RecurringBookingResponse>(
    `/businesses/${businessId}/bookings/recurring`,
    {
      method: 'POST',
      body: request,
      token,
    },
  )
}

export function updateBookingStatus(
  businessId: string,
  bookingId: string,
  status: BookingStatus,
  token: string,
  cancellationReason?: string,
  // Only meaningful for a booking in a series; omitted means this one alone.
  scope?: CancelScope,
) {
  return apiRequest<Booking>(
    `/businesses/${businessId}/bookings/${bookingId}/status`,
    {
      method: 'PATCH',
      body: { status, cancellationReason, scope },
      token,
    },
  )
}
