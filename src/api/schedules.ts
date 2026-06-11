import { apiRequest } from './client'
import type { Schedule, ScheduleRequest } from '../types/api'

export function getSchedules(businessId: string, token: string) {
  return apiRequest<Schedule[]>(`/businesses/${businessId}/schedules`, {
    token,
  })
}

export function saveSchedule(
  businessId: string,
  request: ScheduleRequest,
  token: string,
) {
  return apiRequest<Schedule>(`/businesses/${businessId}/schedules`, {
    method: 'POST',
    body: request,
    token,
  })
}

export function deleteSchedule(
  businessId: string,
  scheduleId: string,
  token: string,
) {
  return apiRequest<void>(`/businesses/${businessId}/schedules/${scheduleId}`, {
    method: 'DELETE',
    token,
  })
}
