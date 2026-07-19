import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { ApiClientError } from '../api/client'
import { AuthProvider } from '../context/AuthContext'
import { LoginPage } from './LoginPage'

vi.mock('../api/auth')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('LoginPage', () => {
  it('offers resend when valid credentials belong to an unverified account', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiClientError(403, {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification is required',
      }),
    )
    vi.mocked(authApi.resendVerification).mockResolvedValue({
      message: 'Sent',
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Please verify your email before signing in.'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' }),
    )
    expect(authApi.resendVerification).toHaveBeenCalledWith(
      'jane@example.com',
    )
  })
})
