import { apiRequest } from './client'
import type { Customer, CustomerRequest, Page } from '../types/api'

/** Matches on first name, last name or email, case-insensitively. */
export function searchCustomers(
  businessId: string,
  query: string,
  token: string,
) {
  // size=8 keeps the picker's dropdown short; the endpoint would return 20.
  return apiRequest<Page<Customer>>(
    `/businesses/${businessId}/customers/search` +
      `?query=${encodeURIComponent(query)}&size=8`,
    { token },
  )
}

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
