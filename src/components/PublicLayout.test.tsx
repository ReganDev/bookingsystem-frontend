import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import * as embed from '../lib/embed'
import { PublicLayout } from './PublicLayout'

vi.mock('../lib/embed')

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/book/some-business']}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/book/:slug" element={<p>Booking page</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('PublicLayout', () => {
  it('shows the BookingBase header and footer on the normal page', () => {
    vi.mocked(embed.isEmbedded).mockReturnValue(false)
    renderLayout()

    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument()
    expect(screen.getByText('Booking page')).toBeInTheDocument()
  })

  it('drops the header and footer in embed mode', () => {
    vi.mocked(embed.isEmbedded).mockReturnValue(true)
    renderLayout()

    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Privacy' })).toBeNull()
    expect(screen.getByText('Booking page')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Powered by BookingBase' }),
    ).toHaveAttribute('target', '_blank')
  })
})
