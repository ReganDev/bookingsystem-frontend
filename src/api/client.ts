import { clearAuth, loadStoredAuth, saveAuth } from '../lib/authStorage'
import type { ApiError, AuthResponse } from '../types/api'

const API_BASE = '/api/v1'

export class ApiClientError extends Error {
  status: number
  body: ApiError

  constructor(status: number, body: ApiError) {
    super(getApiErrorMessage(status, body))
    this.status = status
    this.body = body
  }
}

export function getApiErrorMessage(status: number, body: ApiError): string {
  const fieldMessages = body.fieldErrors
    ? Object.values(body.fieldErrors)
    : body.errors
      ? Object.values(body.errors)
      : []

  if (fieldMessages.length > 0) {
    return fieldMessages.join(' ')
  }

  if (body.message) {
    return body.message
  }

  return `Request failed with status ${status}`
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

function doFetch(
  url: string,
  method: string,
  body: unknown,
  token: string | null | undefined,
) {
  const isFormData = body instanceof FormData
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  })
}

// Single-flight guard: many requests can 401 at once when the access token
// expires, but only one of them should hit /auth/refresh. The refresh
// endpoint rotates the refresh token, so a second concurrent attempt with
// the same token would be rejected and log the user out.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(failedToken: string): Promise<string | null> {
  const stored = loadStoredAuth()
  if (!stored?.refreshToken) return null

  // Another request already refreshed while this one was in flight
  if (stored.accessToken && stored.accessToken !== failedToken) {
    return stored.accessToken
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await doFetch(
          `${API_BASE}/auth/refresh`,
          'POST',
          { refreshToken: stored.refreshToken },
          null,
        )
        if (!response.ok) {
          // Refresh token expired or revoked: the session is over
          clearAuth()
          return null
        }
        const data = (await response.json()) as AuthResponse
        saveAuth(data)
        return data.accessToken
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE}${path}`

  if (import.meta.env.DEV) {
    console.info(
      `[api] ${method} ${url}`,
      body instanceof FormData ? '[multipart form data]' : (body ?? ''),
    )
  }

  let response = await doFetch(url, method, body, token)

  // Expired access token: refresh once and retry with the new one
  if (response.status === 401 && token && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken(token)
    if (newToken) {
      response = await doFetch(url, method, body, newToken)
    }
  }

  if (response.status === 204) {
    if (import.meta.env.DEV) {
      console.info(`[api] ${method} ${url} -> 204`)
    }
    return undefined as T
  }

  const data = await response.json().catch(() => ({}))

  if (import.meta.env.DEV) {
    console.info(`[api] ${method} ${url} -> ${response.status}`, data)
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, data as ApiError)
  }

  return data as T
}
