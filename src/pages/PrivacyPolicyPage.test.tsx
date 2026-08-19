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

  it('warns while business details are still unfilled', () => {
    renderPage()

    // Fails once the constants are filled in — delete this test then, and keep
    // the one below.
    expect(screen.getByRole('status')).toHaveTextContent(/not ready to publish/i)
  })
})
