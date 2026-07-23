import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as businessesApi from '../api/businesses'
import type { Business } from '../types/api'
import { BookingSettingsPanel } from './BookingSettingsPanel'

vi.mock('../api/businesses')

const business: Business = {
  id: 'b-1',
  name: 'Absolutely Fabulous Hair and Beauty',
  slug: 'absolutelyfabuloushairandbeauty',
  email: 'salon@example.com',
  autoConfirmBookings: true,
}

function renderPanel() {
  return render(<BookingSettingsPanel businessId="b-1" token="tok" />)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(businessesApi.getBusiness).mockResolvedValue(business)
  vi.mocked(businessesApi.updateBusiness).mockImplementation(
    async (_businessId, request) => request,
  )
})

describe('BookingSettingsPanel', () => {
  it('shows the toggle checked when the business auto-confirms', async () => {
    renderPanel()

    expect(
      await screen.findByLabelText('Automatically confirm new bookings'),
    ).toBeChecked()
  })

  it('shows the toggle unchecked when the business opted out', async () => {
    vi.mocked(businessesApi.getBusiness).mockResolvedValue({
      ...business,
      autoConfirmBookings: false,
    })
    renderPanel()

    expect(
      await screen.findByLabelText('Automatically confirm new bookings'),
    ).not.toBeChecked()
  })

  it('saves the toggled value with the full business object', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(
      await screen.findByLabelText('Automatically confirm new bookings'),
    )
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() =>
      expect(businessesApi.updateBusiness).toHaveBeenCalledWith(
        'b-1',
        { ...business, autoConfirmBookings: false },
        'tok',
      ),
    )
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
  })

  it('shows an error when saving fails', async () => {
    vi.mocked(businessesApi.updateBusiness).mockRejectedValue(
      new Error('boom'),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.click(
      await screen.findByLabelText('Automatically confirm new bookings'),
    )
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(
      await screen.findByText('Failed to save settings.'),
    ).toBeInTheDocument()
  })
})
