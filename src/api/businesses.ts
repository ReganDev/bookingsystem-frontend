import { apiRequest } from './client'
import type { Business } from '../types/api'

export function getBusiness(businessId: string, token: string) {
  return apiRequest<Business>(`/businesses/${businessId}`, { token })
}

/** Full-object update. The backend validates that name and email are
 *  present, so callers send the current business merged with their changes. */
export function updateBusiness(
  businessId: string,
  request: Business,
  token: string,
) {
  return apiRequest<Business>(`/businesses/${businessId}`, {
    method: 'PUT',
    body: request,
    token,
  })
}
