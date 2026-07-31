import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { Booking, Customer, Page, Service } from '../types/api'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import * as usersApi from '../api/users'
import { BookingsPanel } from './BookingsPanel'

vi.mock('../api/bookings', () => ({
  getBookingsInRange: vi.fn(),
  updateBookingStatus: vi.fn(),
  createBooking: vi.fn(),
  createRecurringBookings: vi.fn(),
}))
vi.mock('../api/customers')
vi.mock('../api/users')

const getBookingsInRange = vi.mocked(bookingsApi.getBookingsInRange)
const updateBookingStatus = vi.mocked(bookingsApi.updateBookingStatus)

const services: Service[] = [
  {
    id: 's-1',
    businessId: 'b-1',
    name: 'Cut and blow dry',
    durationMinutes: 45,
    isActive: true,
  },
]

const jane: Customer = {
  id: 'c-1',
  businessId: 'b-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  fullName: 'Jane Doe',
}

function customerPage(content: Customer[]): Page<Customer> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 50,
    number: 0,
  }
}

function renderPanel() {
  return render(
    <BookingsPanel
      businessId="b-1"
      token="tok"
      currency="GBP"
      services={services}
    />,
  )
}

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
  vi.mocked(customersApi.listCustomers).mockResolvedValue(customerPage([jane]))
  vi.mocked(customersApi.searchCustomers).mockResolvedValue(customerPage([jane]))
  vi.mocked(usersApi.getStaff).mockResolvedValue([])
  vi.mocked(bookingsApi.createBooking).mockResolvedValue(booking())
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

    renderPanel()

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

    renderPanel()

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

    renderPanel()

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

    renderPanel()

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

    renderPanel()

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

    renderPanel()

    expect(
      await screen.findByText(/Customer address: 1 High Street, Manchester, M1 1AE/),
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

    renderPanel()

    expect(
      await screen.findByText(/Customer address: 1 High Street/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/mi ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Directions' })).toBeInTheDocument()
  })

  it('renders no address block for ordinary bookings', async () => {
    getBookingsInRange.mockResolvedValue([booking()])

    renderPanel()

    await screen.findByText('Cut and blow dry')
    expect(screen.queryByText(/^Customer address:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Directions' })).not.toBeInTheDocument()
  })

  it('points at the New booking button when the selected day is empty', async () => {
    getBookingsInRange.mockResolvedValue([])

    renderPanel()

    expect(
      await screen.findByText(/use the New booking button above/),
    ).toBeInTheDocument()
  })

  it('scrolls the day panel into view when a day is tapped on a phone', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const scrollSpy = vi
      .spyOn(Element.prototype, 'scrollIntoView')
      .mockImplementation(() => {})
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia

    try {
      getBookingsInRange.mockResolvedValue([
        booking({ id: 'bk-other', startDatetime: '2026-07-25T14:00:00Z' }),
      ])
      renderPanel()
      await screen.findByText(/Today ·/)

      await user.click(
        screen.getByRole('button', { name: /Saturday, July 25/ }),
      )

      expect(scrollSpy).toHaveBeenCalled()
    } finally {
      window.matchMedia = originalMatchMedia
      scrollSpy.mockRestore()
    }
  })
})

describe('new booking from the calendar', () => {
  beforeEach(() => {
    getBookingsInRange.mockResolvedValue([])
  })

  async function openNewBookingDialog(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    renderPanel()
    await screen.findByText(/Today ·/)
    await user.click(screen.getByRole('button', { name: 'New booking' }))
    return await screen.findByRole('dialog', { name: 'New booking' })
  }

  it('opens the booking form in a dialog from the New booking button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const dialog = await openNewBookingDialog(user)

    expect(within(dialog).getByLabelText('Service')).toBeInTheDocument()
    expect(
      await within(dialog).findByRole('option', { name: /Jane Doe/ }),
    ).toBeInTheDocument()
  })

  it('creates a booking for the selected day, closes and refreshes the calendar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const dialog = await openNewBookingDialog(user)
    await user.click(await within(dialog).findByRole('option', { name: /Jane Doe/ }))
    await user.selectOptions(within(dialog).getByLabelText('Service'), 's-1')

    await user.click(within(dialog).getByLabelText('Date & time'))
    const picker = await screen.findByRole('dialog', { name: 'Pick date & time' })
    // The picker opens preselected on the calendar's selected day (today).
    expect(
      within(picker).getByRole('button', { name: /July 24, 2026|24 July 2026/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(picker).getByRole('button', { name: 'Confirm' }))

    await user.click(within(dialog).getByRole('button', { name: 'Create booking' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(bookingsApi.createBooking).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({ customerId: 'c-1', serviceId: 's-1' }),
      'tok',
    )
    expect(getBookingsInRange).toHaveBeenCalledTimes(2)
  })

  it('Escape closes the date picker first, then the booking dialog', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const dialog = await openNewBookingDialog(user)
    await user.click(within(dialog).getByLabelText('Date & time'))
    await screen.findByRole('dialog', { name: 'Pick date & time' })
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'Pick date & time' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'New booking' }),
    ).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps the dialog open to show the skip report after a clashing series', async () => {
    vi.mocked(bookingsApi.createRecurringBookings).mockResolvedValue({
      seriesId: 'sr-1',
      created: Array.from({ length: 10 }, (_, i) => ({ id: `bk-${i}` }) as Booking),
      skipped: [
        { startDatetime: '2026-09-01T09:00:00Z', reason: 'Already booked' },
      ],
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const dialog = await openNewBookingDialog(user)
    await user.click(await within(dialog).findByRole('option', { name: /Jane Doe/ }))
    await user.selectOptions(within(dialog).getByLabelText('Service'), 's-1')
    await user.click(within(dialog).getByLabelText('Date & time'))
    const picker = await screen.findByRole('dialog', { name: 'Pick date & time' })
    await user.click(within(picker).getByRole('button', { name: 'Confirm' }))
    await user.click(within(dialog).getByLabelText('Repeat this booking'))

    await user.click(
      within(dialog).getByRole('button', { name: 'Create 12 bookings' }),
    )

    expect(
      await screen.findByText(/Created 10 of 12 bookings\./),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'New booking' }),
    ).toBeInTheDocument()
    // The calendar behind was still refreshed.
    expect(getBookingsInRange).toHaveBeenCalledTimes(2)
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
