import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { CheckEmailPage } from './CheckEmailPage'
import { VerifyEmailPage } from './VerifyEmailPage'

vi.mock('../api/auth')

beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
})

describe('email verification pages', () => {
  it('verifies the token from the email link', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      message: 'Your email has been verified.',
    })

    render(
      <MemoryRouter initialEntries={['/verify-email?token=secure-token']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Email verified' }),
    ).toBeInTheDocument()
    expect(authApi.verifyEmail).toHaveBeenCalledWith('secure-token')
    expect(
      screen.getByRole('link', { name: 'Continue to sign in' }),
    ).toBeInTheDocument()
  })

  it('shows expired or invalid token errors', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(
      new Error('invalid token'),
    )

    render(
      <MemoryRouter initialEntries={['/verify-email?token=expired']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Link not accepted' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('This verification link is invalid or has expired.'),
    ).toBeInTheDocument()
  })

  it('resends from the check-email page', async () => {
    vi.mocked(authApi.resendVerification).mockResolvedValue({
      message: 'Sent',
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter
        initialEntries={['/check-email?email=jane%40example.com']}
      >
        <Routes>
          <Route path="/check-email" element={<CheckEmailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' }),
    )

    expect(authApi.resendVerification).toHaveBeenCalledWith(
      'jane@example.com',
    )
    expect(
      await screen.findByText(/a new link has been sent/),
    ).toBeInTheDocument()
  })
})
