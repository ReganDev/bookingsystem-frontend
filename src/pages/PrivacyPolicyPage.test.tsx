import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PRIVACY_SECTIONS } from '../content/privacyPolicy'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPolicyPage />
    </MemoryRouter>,
  )
}

describe('PrivacyPolicyPage', () => {
  it('renders a heading for every section in the contents', () => {
    renderPage()

    for (const section of PRIVACY_SECTIONS) {
      expect(
        screen.getByRole('heading', { name: section.title }),
      ).toBeInTheDocument()
    }
  })

  it('gives each section an anchor the contents list can reach', () => {
    const { container } = renderPage()

    for (const section of PRIVACY_SECTIONS) {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull()
    }
  })

  it('tells the reader how to complain to the ICO', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /ico\.org\.uk/i })).toHaveAttribute(
      'href',
      'https://ico.org.uk/make-a-complaint/',
    )
    expect(screen.getByText(/0303 123 1113/)).toBeInTheDocument()
  })

  it('names each third-party provider and what it receives', () => {
    renderPage()

    expect(screen.getByText('Supabase')).toBeInTheDocument()
    expect(screen.getByText('Resend')).toBeInTheDocument()
    expect(screen.getByText('postcodes.io')).toBeInTheDocument()
    // Two places say this: the OSRM provider entry, and the note below the
    // list explaining why we send it nothing identifying.
    expect(screen.getAllByText(/coordinates only/i)).toHaveLength(2)
  })

  it('says no text messages are sent', () => {
    renderPage()

    expect(screen.getByText(/we do not send text messages/i)).toBeInTheDocument()
  })

  it('states plainly that there is no tracking or payment processing', () => {
    renderPage()

    expect(screen.getByText(/no analytics/i)).toBeInTheDocument()
    expect(screen.getByText(/do not take payments/i)).toBeInTheDocument()
  })

  it('shows no placeholder warning now the business details are filled in', () => {
    renderPage()

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('names the operator and gives a contact address, without claiming ICO registration', () => {
    renderPage()

    expect(screen.getByText(/operated by Graysite/)).toBeInTheDocument()
    expect(screen.getByText(/based in Northern Ireland/)).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'graysitequeries@gmail.com' }).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(/registered with the Information/i)).toBeNull()
  })

  it('never claims to sell or share information for marketing', () => {
    renderPage()

    expect(screen.getByText(/We never sell/)).toBeInTheDocument()
  })

  it('does not name services the product does not use, anywhere in the page', () => {
    const { container } = renderPage()
    const rendered = container.textContent?.toLowerCase() ?? ''

    for (const absent of ['stripe', 'google analytics', 'cloudflare', 'twilio']) {
      expect(rendered).not.toContain(absent)
    }
  })

  // Each of these matches what the backend actually does; see the review on
  // 2026-10-22 that found the earlier wording overstated what was deleted.
  it('discloses that booking without signing in creates a kept account', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''

    expect(text).toContain('Booking without signing in creates an account.')
    expect(text).toContain('kept until you ask us to delete them')
    expect(text).not.toMatch(/expire unused/i)
  })

  it('says booking emails are always sent, not only on request', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''

    expect(text).toContain('Every booking is confirmed by email')
    expect(text).not.toMatch(/only if you ask/i)
  })

  it('gives password reset links their real one-hour lifetime', () => {
    renderPage()

    expect(screen.getByText('Password reset links')).toBeInTheDocument()
    expect(screen.getByText(/1 hour from being sent/)).toBeInTheDocument()
  })

  it('does not claim failed sign-ins are recorded', () => {
    const { container } = renderPage()

    expect(container.textContent).not.toMatch(/failed sign-in/i)
  })

  it('mentions the theme choice kept in browser storage', () => {
    renderPage()

    expect(screen.getByText(/light or dark theme/)).toBeInTheDocument()
  })
})
