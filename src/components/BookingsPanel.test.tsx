import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '../types/api'
import * as bookingsApi from '../api/bookings'
import { BookingsPanel } from './BookingsPanel'

vi.mock('../api/bookings', () => ({
  getBookingsInRange: vi.fn(),
  updateBookingStatus: vi.fn(),
}))

const getBookingsInRange = vi.mocked(bookingsApi.getBookingsInRange)
const updateBookingStatus = vi.mocked(bookingsApi.updateBookingStatus)

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bk-1',
    businessId: 'b-1',
    status: 'CONFIRMED',
    startDatetime: '2026-07-24T09:00:00Z',
    endDatetime: '2026-07-24T09:45:00Z',
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

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-07-24T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BookingsPanel', () => {
  it('renders split layout and defaults to today', async () => {
    getBookingsInRange.mockResolvedValue([
      booking({ id: 'bk-today', startDatetime: '2026-07-24T10:00:00Z' }),
      booking({
        id: 'bk-other',
        startDatetime: '2026-07-25T10:00:00Z',
        customer: { ...booking().customer, firstName: 'Bob' },
      }),
    ])

    render(
      <BookingsPanel businessId="b-1" token="tok" currency="GBP" />,
    )

    expect(await screen.findByText(/Today ·/)).toBeInTheDocument()
    expect(screen.getByText('Cut and blow dry')).toBeInTheDocument()
    expect(screen.queryByText(/Bob/)).not.toBeInTheDocument()
    expect(screen.getByText(/1 today/)).toBeInTheDocument()
  })

  it('shows only selected day bookings when another day is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    getBookingsInRange.mockResolvedValue([
      booking({ id: 'bk-today', startDatetime: '2026-07-24T10:00:00Z' }),
      booking({
        id: 'bk-other',
        startDatetime: '2026-07-25T14:00:00Z',
        customer: { ...booking().customer, firstName: 'Bob' },
      }),
    ])

    render(
      <BookingsPanel businessId="b-1" token="tok" currency="GBP" />,
    )

    await screen.findByText(/Today ·/)

    const day25 = screen.getByRole('button', {
      name: /Saturday, July 25, 1 bookings/,
    })
    await user.click(day25)

    expect(screen.queryByText(/Today ·/)).not.toBeInTheDocument()
    expect(screen.getByText(/Saturday, July 25/)).toBeInTheDocument()
    expect(screen.getByText(/Bob/)).toBeInTheDocument()
    expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument()
  })

  it('shows pending count in summary', async () => {
    getBookingsInRange.mockResolvedValue([
      booking({ id: 'bk-1', status: 'PENDING' }),
      booking({ id: 'bk-2', status: 'PENDING', startDatetime: '2026-07-25T10:00:00Z' }),
    ])

    render(
      <BookingsPanel businessId="b-1" token="tok" currency="GBP" />,
    )

    expect(await screen.findByText(/2 need confirmation/)).toBeInTheDocument()
  })

  it('filters selected day to pending only', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    getBookingsInRange.mockResolvedValue([
      booking({ id: 'bk-pending', status: 'PENDING' }),
      booking({
        id: 'bk-confirmed',
        status: 'CONFIRMED',
        customer: { ...booking().customer, firstName: 'Sam' },
      }),
    ])

    render(
      <BookingsPanel businessId="b-1" token="tok" currency="GBP" />,
    )

    await screen.findByText(/Today ·/)
    await user.click(screen.getByRole('button', { name: 'Pending' }))

    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.queryByText(/Sam/)).not.toBeInTheDocument()
  })

  it('reloads month after status change', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    getBookingsInRange
      .mockResolvedValueOnce([
        booking({ id: 'bk-1', status: 'PENDING' }),
      ])
      .mockResolvedValueOnce([
        booking({ id: 'bk-1', status: 'CONFIRMED' }),
      ])
    updateBookingStatus.mockResolvedValue(booking({ status: 'CONFIRMED' }))

    render(
      <BookingsPanel businessId="b-1" token="tok" currency="GBP" />,
    )

    await screen.findByText('PENDING')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(updateBookingStatus).toHaveBeenCalledWith(
        'b-1',
        'bk-1',
        'CONFIRMED',
        'tok',
        undefined,
        undefined,
      )
    })
    expect(getBookingsInRange).toHaveBeenCalledTimes(2)
  })

  it('shows address, drive distance and a directions link on mobile-visit bookings', async () => {
    getBookingsInRange.mockResolvedValue([
      booking({
        addressLine1: '1 High Street',
        addressCity: 'Manchester',
        addressPostcode: 'M1 1AE',
        distanceMeters: 11587,
        durationSeconds: 1080,
      }),
    ])

    render(<BookingsPanel businessId="b-1" token="tok" currency="GBP" />)

    expect(
      await screen.findByText(/At: 1 High Street, Manchester, M1 1AE/),
    ).toBeInTheDocument()
    expect(screen.getByText('7.2 mi · ~18 min drive')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Directions' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=' +
        encodeURIComponent('1 High Street, Manchester, M1 1AE'),
    )
  })

  it('shows address with directions but no distance while it is still computing', async () => {
    getBookingsInRange.mockResolvedValue([
      booking({
        addressLine1: '1 High Street',
        addressCity: 'Manchester',
        addressPostcode: 'M1 1AE',
      }),
    ])

    render(<BookingsPanel businessId="b-1" token="tok" currency="GBP" />)

    expect(await screen.findByText(/At: 1 High Street/)).toBeInTheDocument()
    expect(screen.queryByText(/mi ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Directions' })).toBeInTheDocument()
  })

  it('renders no address block for ordinary bookings', async () => {
    getBookingsInRange.mockResolvedValue([booking()])

    render(<BookingsPanel businessId="b-1" token="tok" currency="GBP" />)

    await screen.findByText('Cut and blow dry')
    expect(screen.queryByText(/^At:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Directions' })).not.toBeInTheDocument()
  })
})

describe('groupBookingsByDay', () => {
  it('groups and sorts bookings by day', async () => {
    const { groupBookingsByDay } = await import('../lib/groupBookingsByDay')
    const map = groupBookingsByDay([
      booking({ id: 'late', startDatetime: '2026-07-24T15:00:00Z' }),
      booking({ id: 'early', startDatetime: '2026-07-24T09:00:00Z' }),
      booking({ id: 'next', startDatetime: '2026-07-25T09:00:00Z' }),
    ])

    const july24 = map.get('2026-6-24') ?? []
    expect(july24.map((b) => b.id)).toEqual(['early', 'late'])
    expect(map.get('2026-6-25')?.map((b) => b.id)).toEqual(['next'])
  })
})
