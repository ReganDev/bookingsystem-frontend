import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { AuthProvider } from '../context/AuthContext'
import { CheckEmailPage } from './CheckEmailPage'
import { SignUpPage } from './SignUpPage'

vi.mock('../api/auth')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('SignUpPage', () => {
  it('sends the customer to check-email without creating a session', async () => {
    vi.mocked(authApi.registerCustomer).mockResolvedValue({
      message: 'Check your email',
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/signup?returnTo=%2Fbook%2Fsalon']}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByRole('heading', { name: 'Check your email' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument()
    expect(localStorage.getItem('booking-auth')).toBeNull()
    expect(sessionStorage.getItem('verification-return-to')).toBe(
      '/book/salon',
    )
  })
})
