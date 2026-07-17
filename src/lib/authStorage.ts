import type { AuthResponse } from '../types/api'

const STORAGE_KEY = 'booking-auth'

/** Fired on window whenever stored auth changes (login, refresh, logout). */
export const AUTH_CHANGED_EVENT = 'booking-auth-changed'

export type StoredAuth = {
  accessToken: string
  refreshToken: string
  user: AuthResponse['user']
  business: AuthResponse['business']
}

export function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

export function saveAuth(response: AuthResponse): StoredAuth {
  const stored: StoredAuth = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
    business: response.business,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  notifyAuthChanged()
  return stored
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
  notifyAuthChanged()
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
