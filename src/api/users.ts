import { apiRequest } from './client'
import type { StaffMember } from '../types/api'

/**
 * Active users who take bookings. The owner is included when their own
 * "accepts bookings" flag is set, so a solo business still gets one entry.
 */
export function getStaff(businessId: string, token: string) {
  return apiRequest<StaffMember[]>(`/businesses/${businessId}/users/staff`, {
    token,
  })
}
