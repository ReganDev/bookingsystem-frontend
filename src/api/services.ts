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

export function updateService(
  businessId: string,
  serviceId: string,
  request: ServiceRequest,
  token: string,
) {
  return apiRequest<Service>(`/businesses/${businessId}/services/${serviceId}`, {
    method: 'PUT',
    body: request,
    token,
  })
}

export function deleteService(
  businessId: string,
  serviceId: string,
  token: string,
) {
  return apiRequest<void>(`/businesses/${businessId}/services/${serviceId}`, {
    method: 'DELETE',
    token,
  })
}
