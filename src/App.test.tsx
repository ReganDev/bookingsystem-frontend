import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as authApi from './api/auth'
import * as publicApi from './api/public'
import { AuthProvider } from './context/AuthContext'
import type { Business } from './types/api'

vi.mock('./api/public')

const business: Business = {
  id: 'b-1',
  name: 'Absolutely Fabulous Hair and Beauty',
  slug: 'absolutelyfabuloushairandbeauty',
}

const customerSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  business: null,
  user: {
    id: 'u-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    role: 'CUSTOMER',
    isActive: true,
    emailVerified: true,
  },
}

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  vi.mocked(publicApi.listBusinesses).mockResolvedValue([business])
  vi.mocked(publicApi.getBusinessBySlug).mockResolvedValue(business)
  vi.mocked(publicApi.getActiveServices).mockResolvedValue([])
})

afterEach(() => {
  window.location.hash = ''
})

describe('App hash entry from client sites', () => {
  it('redirects <host>/#<slug> to that business booking page', async () => {
    window.location.hash = '#absolutelyfabuloushairandbeauty'
    renderApp()

    expect(
      await screen.findByRole('heading', {
        name: 'Absolutely Fabulous Hair and Beauty',
      }),
    ).toBeInTheDocument()
    expect(publicApi.getBusinessBySlug).toHaveBeenCalledWith(
      'absolutelyfabuloushairandbeauty',
    )
  })

  it('falls back to the business list when there is no hash', async () => {
    renderApp()

    expect(
      await screen.findByText('Absolutely Fabulous Hair and Beauty'),
    ).toBeInTheDocument()
    expect(publicApi.listBusinesses).toHaveBeenCalled()
    expect(publicApi.getBusinessBySlug).not.toHaveBeenCalled()
  })
})

describe('App sign-in with a returnTo link', () => {
  const loginUrl = '/login?returnTo=%2Fbook%2Fabsolutelyfabuloushairandbeauty'

  it('sends an already signed-in customer back to the booking page', async () => {
    localStorage.setItem('booking-auth', JSON.stringify(customerSession))
    renderApp(loginUrl)

    expect(
      await screen.findByRole('heading', {
        name: 'Absolutely Fabulous Hair and Beauty',
      }),
    ).toBeInTheDocument()
    expect(publicApi.getBusinessBySlug).toHaveBeenCalledWith(
      'absolutelyfabuloushairandbeauty',
    )
    expect(publicApi.listBusinesses).not.toHaveBeenCalled()
  })

  it('returns to the booking page after signing in', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue(
      customerSession as Awaited<ReturnType<typeof authApi.login>>,
    )
    renderApp(loginUrl)

    await userEvent.type(await screen.findByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret-password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(
      await screen.findByRole('heading', {
        name: 'Absolutely Fabulous Hair and Beauty',
      }),
    ).toBeInTheDocument()
    expect(publicApi.listBusinesses).not.toHaveBeenCalled()
  })
})
