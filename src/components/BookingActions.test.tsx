import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '../types/api'
import { BookingActions } from './BookingActions'

const onStatusChange = vi.fn()

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bk-1',
    businessId: 'b-1',
    status: 'CONFIRMED',
    startDatetime: '2026-08-04T09:00:00Z',
    endDatetime: '2026-08-04T09:45:00Z',
    customer: {
      id: 'c-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    },
    service: { id: 's-1', name: 'Cut and blow dry', durationMinutes: 45 },
    ...overrides,
  }
}

function renderActions(value: Booking) {
  return render(
    <BookingActions booking={value} onStatusChange={onStatusChange} />,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('BookingActions', () => {
  it('cancels a one-off booking immediately, with no extra click', async () => {
    const user = userEvent.setup()
    renderActions(booking())

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onStatusChange).toHaveBeenCalledWith('bk-1', 'CANCELLED', undefined)
  })

  it('asks how far the cancellation reaches for a booking in a series', async () => {
    const user = userEvent.setup()
    renderActions(booking({ seriesId: 'sr-1' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    // Nothing is cancelled until the owner says which they meant.
    expect(onStatusChange).not.toHaveBeenCalled()
    expect(screen.getByText('Cancel which bookings?')).toBeInTheDocument()
  })

  it('cancels only this occurrence when asked', async () => {
    const user = userEvent.setup()
    renderActions(booking({ seriesId: 'sr-1' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'This booking only' }))

    expect(onStatusChange).toHaveBeenCalledWith('bk-1', 'CANCELLED', 'THIS_ONLY')
  })

  it('cancels the rest of the run when asked', async () => {
    const user = userEvent.setup()
    renderActions(booking({ seriesId: 'sr-1' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'This and all future' }))

    expect(onStatusChange).toHaveBeenCalledWith(
      'bk-1',
      'CANCELLED',
      'THIS_AND_FUTURE',
    )
  })

  it('backs out of the scope prompt without cancelling anything', async () => {
    const user = userEvent.setup()
    renderActions(booking({ seriesId: 'sr-1' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(onStatusChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('offers Confirm only while the booking is pending', async () => {
    const user = userEvent.setup()
    renderActions(booking({ status: 'PENDING' }))

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onStatusChange).toHaveBeenCalledWith('bk-1', 'CONFIRMED')
  })

  it('offers nothing once a booking is cancelled or completed', () => {
    renderActions(booking({ status: 'CANCELLED' }))

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
