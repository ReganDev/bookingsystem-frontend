import { apiRequest } from './client'
import type { Service, ServiceRequest } from '../types/api'

export function getServices(businessId: string, token: string) {
  return apiRequest<Service[]>(`/businesses/${businessId}/services`, { token })
}

export function createService(
  businessId: string,
  request: ServiceRequest,
  token: string,
) {
  return apiRequest<Service>(`/businesses/${businessId}/services`, {
    method: 'POST',
    body: request,
    token,
  })
}
