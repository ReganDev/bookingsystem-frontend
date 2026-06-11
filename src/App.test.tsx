import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as publicApi from './api/public'
import { AuthProvider } from './context/AuthContext'
import type { Business } from './types/api'

vi.mock('./api/public')

const business: Business = {
  id: 'b-1',
  name: 'Absolutely Fabulous Hair and Beauty',
  slug: 'absolutelyfabuloushairandbeauty',
}

function renderApp() {
  return render(
    <MemoryRouter>
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
