import { apiRequest } from './client'
import type {
  AuthResponse,
  CustomerRegisterRequest,
  LoginRequest,
  MessageResponse,
} from '../types/api'

export function login(request: LoginRequest) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: request,
  })
}

export function registerCustomer(request: CustomerRegisterRequest) {
  return apiRequest<MessageResponse>('/auth/register-customer', {
    method: 'POST',
    body: request,
  })
}

export function verifyEmail(token: string) {
  return apiRequest<MessageResponse>('/auth/verify-email', {
    method: 'POST',
    body: { token },
  })
}

export function resendVerification(email: string) {
  return apiRequest<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: { email },
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
