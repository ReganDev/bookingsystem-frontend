import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { ContactPage } from './ContactPage'
import { SignUpPage } from './SignUpPage'

vi.mock('../api/auth')
vi.mock('../api/public')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('privacy notices at the point of collection', () => {
  it('links to the policy from the sign-up form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SignUpPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'privacy policy' }),
    ).toHaveAttribute('href', '/privacy')
  })

  it('links to the policy from the contact form', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'privacy policy' }),
    ).toHaveAttribute('href', '/privacy')
  })
})
