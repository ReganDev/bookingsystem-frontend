import { apiRequest } from './client'
import type { Business, RegisterRequest, User } from '../types/api'

export type BusinessAccount = {
  business: Business
  owner: User
}

export function listBusinesses(token: string) {
  return apiRequest<Business[]>('/admin/businesses', { token })
}

export function createBusinessAccount(request: RegisterRequest, token: string) {
  return apiRequest<BusinessAccount>('/admin/businesses', {
    method: 'POST',
    body: request,
    token,
  })
}
