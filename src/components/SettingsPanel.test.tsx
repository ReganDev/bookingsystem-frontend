import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as businessesApi from '../api/businesses'
import type { Business } from '../types/api'
import { SettingsPanel } from './SettingsPanel'

vi.mock('../api/businesses')

const business: Business = {
  id: 'b-1',
  name: 'Fab Hair',
  slug: 'fab-hair',
  email: 'salon@example.com',
  autoConfirmBookings: true,
  photoUrls: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(businessesApi.getBusiness).mockResolvedValue(business)
})

describe('SettingsPanel', () => {
  it('shows the general booking settings by default', async () => {
    render(<SettingsPanel businessId="b-1" token="tok" />)

    expect(
      await screen.findByRole('heading', { name: 'Booking settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'General' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Photos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.queryByRole('heading', { name: 'Booking page photos' }),
    ).not.toBeInTheDocument()
  })

  it('switches to the photo manager on the Photos pill', async () => {
    const user = userEvent.setup()
    render(<SettingsPanel businessId="b-1" token="tok" />)
    await screen.findByRole('heading', { name: 'Booking settings' })

    await user.click(screen.getByRole('button', { name: 'Photos' }))

    expect(
      await screen.findByRole('heading', { name: 'Booking page photos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Booking settings' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Photos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
