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
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/api'

const STORAGE_KEY = 'booking-auth'

type StoredAuth = {
  accessToken: string
  refreshToken: string
  user: AuthResponse['user']
  business: AuthResponse['business']
}

type AuthContextValue = {
  user: AuthResponse['user'] | null
  business: AuthResponse['business'] | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

function saveAuth(response: AuthResponse) {
  const stored: StoredAuth = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
    business: response.business,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  return stored
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setStored(loadStoredAuth())
    setIsLoading(false)
  }, [])

  const applyAuth = useCallback((response: AuthResponse) => {
    const next = saveAuth(response)
    setStored(next)
  }, [])

  const login = useCallback(
    async (request: LoginRequest) => {
      const response = await authApi.login(request)
      applyAuth(response)
    },
    [applyAuth],
  )

  const register = useCallback(
    async (request: RegisterRequest) => {
      const response = await authApi.register(request)
      applyAuth(response)
    },
    [applyAuth],
  )

  const logout = useCallback(async () => {
    if (stored?.refreshToken) {
      try {
        await authApi.logout(stored.refreshToken)
      } catch {
        // Ignore logout errors and clear local session anyway.
      }
    }
    localStorage.removeItem(STORAGE_KEY)
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
      register,
      logout,
    }),
    [stored, isLoading, login, register, logout],
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
