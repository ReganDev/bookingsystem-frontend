import { apiRequest } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/api'

export function login(request: LoginRequest) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: request,
  })
}

export function register(request: RegisterRequest) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: request,
  })
}

export function refreshToken(refreshToken: string) {
  return apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  })
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  })
}
