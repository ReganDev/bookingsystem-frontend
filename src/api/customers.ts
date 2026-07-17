import { apiRequest } from './client'
import type { Customer, CustomerRequest } from '../types/api'

export function createCustomer(
  businessId: string,
  request: CustomerRequest,
  token: string,
) {
  return apiRequest<Customer>(`/businesses/${businessId}/customers`, {
    method: 'POST',
    body: request,
    token,
  })
}

/** Returns the existing customer for this email, or creates one. */
export function getOrCreateCustomer(
  businessId: string,
  request: CustomerRequest,
  token: string,
) {
  return apiRequest<Customer>(
    `/businesses/${businessId}/customers/get-or-create`,
    {
      method: 'POST',
      body: request,
      token,
    },
  )
}
