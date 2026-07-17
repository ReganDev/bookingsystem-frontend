import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import {
  AUTH_CHANGED_EVENT,
  clearAuth,
  loadStoredAuth,
  saveAuth,
  type StoredAuth,
} from '../lib/authStorage'
import type { AuthResponse, LoginRequest } from '../types/api'

type AuthContextValue = {
  user: AuthResponse['user'] | null
  business: AuthResponse['business'] | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (request: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setStored(loadStoredAuth())
    setIsLoading(false)

    // Keep React state in sync when the API client refreshes tokens or
    // clears an expired session.
    const sync = () => setStored(loadStoredAuth())
    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync)
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const response = await authApi.login(request)
    setStored(saveAuth(response))
  }, [])

  const logout = useCallback(async () => {
    if (stored?.refreshToken) {
      try {
        await authApi.logout(stored.refreshToken)
      } catch {
        // Ignore logout errors and clear local session anyway.
      }
    }
    clearAuth()
    setStored(null)
  }, [stored?.refreshToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: stored?.user ?? null,
      business: stored?.business ?? null,
      accessToken: stored?.accessToken ?? null,
      isAuthenticated: Boolean(stored?.accessToken),
      isLoading,
      login,
      logout,
    }),
    [stored, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
