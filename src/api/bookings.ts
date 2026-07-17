import { apiRequest } from './client'
import type {
  Booking,
  BookingRequest,
  BookingStatus,
  Page,
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

export function updateBookingStatus(
  businessId: string,
  bookingId: string,
  status: BookingStatus,
  token: string,
  cancellationReason?: string,
) {
  return apiRequest<Booking>(
    `/businesses/${businessId}/bookings/${bookingId}/status`,
    {
      method: 'PATCH',
      body: { status, cancellationReason },
      token,
    },
  )
}
