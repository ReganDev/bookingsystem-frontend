import { apiRequest } from './client'
import type {
  Booking,
  Business,
  CustomerRequest,
  PublicBookingRequest,
  Service,
  TimeSlot,
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

/** Days in a month (yyyy-MM) with at least one bookable slot, as yyyy-MM-dd. */
export function getAvailableDays(
  businessId: string,
  serviceId: string,
  month: string,
) {
  const params = new URLSearchParams({ serviceId, month })
  return apiRequest<string[]>(
    `/public/businesses/${businessId}/availability/days?${params}`,
  )
}

export function getAvailability(
  businessId: string,
  serviceId: string,
  date: string,
) {
  const params = new URLSearchParams({ serviceId, date })
  return apiRequest<TimeSlot[]>(
    `/public/businesses/${businessId}/availability?${params}`,
  )
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

export type EnquiryRequest = {
  name: string
  email: string
  businessName?: string
  message: string
}

export function submitEnquiry(request: EnquiryRequest) {
  return apiRequest<void>('/public/enquiry', {
    method: 'POST',
    body: request,
  })
}

export type { CustomerRequest, PublicBookingRequest }
