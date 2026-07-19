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

export function uploadBusinessPhotos(
  businessId: string,
  files: File[],
  token: string,
) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return apiRequest<Business>(`/businesses/${businessId}/photos`, {
    method: 'POST',
    body: formData,
    token,
  })
}

export function removeBusinessPhoto(
  businessId: string,
  photoUrl: string,
  token: string,
) {
  return apiRequest<Business>(`/businesses/${businessId}/photos`, {
    method: 'DELETE',
    body: { photoUrl },
    token,
  })
}
