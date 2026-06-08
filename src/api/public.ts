import { apiRequest } from './client'
import type {
  Booking,
  Business,
  CustomerRequest,
  PublicBookingRequest,
  Service,
} from '../types/api'

export function listBusinesses() {
  return apiRequest<Business[]>('/public/businesses')
}

export function getBusinessBySlug(slug: string) {
  return apiRequest<Business>(`/public/businesses/slug/${slug}`)
}

export function getActiveServices(businessId: string) {
  return apiRequest<Service[]>(`/public/businesses/${businessId}/services`)
}

export function createPublicBooking(
  businessId: string,
  request: PublicBookingRequest,
) {
  return apiRequest<Booking>(`/public/businesses/${businessId}/bookings`, {
    method: 'POST',
    body: request,
  })
}

export type { CustomerRequest, PublicBookingRequest }
