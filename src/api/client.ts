import type { ApiError } from '../types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://booking-backend-app-java-production.up.railway.app/api/v1'

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

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (import.meta.env.DEV) {
    console.info(`[api] ${method} ${url}`, body ?? '')
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

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
