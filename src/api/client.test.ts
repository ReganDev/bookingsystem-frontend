import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, apiRequest } from './client'

const STORAGE_KEY = 'booking-auth'

function seedAuth(accessToken = 'old-access', refreshToken = 'refresh-1') {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ accessToken, refreshToken, user: {}, business: {} }),
  )
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const refreshedTokens = {
  accessToken: 'new-access',
  refreshToken: 'refresh-2',
  user: {},
  business: {},
}

describe('apiRequest token refresh', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes and retries once when a request 401s', async () => {
    seedAuth()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, refreshedTokens))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    const result = await apiRequest<{ ok: boolean }>('/businesses/b1/bookings', {
      token: 'old-access',
    })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const refreshCall = fetchMock.mock.calls[1]
    expect(refreshCall[0]).toBe('/api/v1/auth/refresh')
    expect(JSON.parse(refreshCall[1].body)).toEqual({
      refreshToken: 'refresh-1',
    })

    const retryCall = fetchMock.mock.calls[2]
    expect(retryCall[1].headers.Authorization).toBe('Bearer new-access')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.accessToken).toBe('new-access')
    expect(stored.refreshToken).toBe('refresh-2')
  })

  it('clears the session and rethrows when refresh fails', async () => {
    seedAuth()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'revoked' }))

    await expect(
      apiRequest('/businesses/b1/bookings', { token: 'old-access' }),
    ).rejects.toBeInstanceOf(ApiClientError)

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('only calls refresh once for concurrent 401s', async () => {
    seedAuth()

    fetchMock.mockImplementation(
      (url: string, options: { headers: Record<string, string> }) => {
        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(jsonResponse(200, refreshedTokens))
        }
        const auth = options.headers.Authorization
        if (auth === 'Bearer old-access') {
          return Promise.resolve(jsonResponse(401, { message: 'expired' }))
        }
        return Promise.resolve(jsonResponse(200, { ok: true }))
      },
    )

    const [a, b] = await Promise.all([
      apiRequest('/businesses/b1/bookings', { token: 'old-access' }),
      apiRequest('/businesses/b1/services', { token: 'old-access' }),
    ])

    expect(a).toEqual({ ok: true })
    expect(b).toEqual({ ok: true })

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('does not try to refresh login failures', async () => {
    seedAuth()
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'bad creds' }))

    await expect(
      apiRequest('/auth/login', {
        method: 'POST',
        body: { email: 'a@b.com', password: 'wrong' },
      }),
    ).rejects.toBeInstanceOf(ApiClientError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
