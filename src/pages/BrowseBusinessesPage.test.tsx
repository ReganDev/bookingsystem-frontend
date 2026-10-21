import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as bookingsApi from '../api/bookings'
import * as publicApi from '../api/public'
import { AuthProvider } from '../context/AuthContext'
import type {
  Booking,
  BookingStatus,
  Business,
  CustomerBooking,
} from '../types/api'
import { BrowseBusinessesPage } from './BrowseBusinessesPage'

vi.mock('../api/public')
vi.mock('../api/bookings')

const businesses: Business[] = [
  {
    id: 'b-1',
    name: 'KA Studio',
    slug: 'ka-studio',
    city: 'Leeds',
    photoUrls: ['https://example.com/ka.jpg'],
    autoConfirmBookings: true,
  },
  { id: 'b-2', name: 'Fade & Co', slug: 'fade-co', city: 'Harrogate' },
]

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(14, 0, 0, 0)
  return date
}

function customerBooking(
  slug: string,
  businessName: string,
  serviceName: string,
  days: number,
  status: BookingStatus,
): CustomerBooking {
  const start = daysFromNow(days)
  return {
    businessSlug: slug,
    businessName,
    canCancel: true,
    canReschedule: true,
    booking: {
      id: `${slug}-${days}`,
      businessId: 'b',
      status,
      startDatetime: start.toISOString(),
      endDatetime: new Date(start.getTime() + 3600000).toISOString(),
      service: { id: 's', name: serviceName, durationMinutes: 60 },
    } as Booking,
  }
}

function signInAsCustomer() {
  localStorage.setItem(
    'booking-auth',
    JSON.stringify({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      business: null,
      user: {
        id: 'u-1',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        fullName: 'Jane Doe',
        role: 'CUSTOMER',
        isActive: true,
        emailVerified: true,
      },
    }),
  )
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <BrowseBusinessesPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  vi.mocked(publicApi.listBusinesses).mockResolvedValue(businesses)
})

describe('BrowseBusinessesPage', () => {
  it('shows every business with its photo-led card for guests', async () => {
    renderPage()

    const grid = await screen.findByRole('region', { name: 'All businesses' })
    expect(
      within(grid).getByRole('link', { name: /KA Studio/ }),
    ).toHaveAttribute('href', '/book/ka-studio')
    expect(within(grid).getByText('Instant confirmation')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Upcoming' })).toBeNull()
    expect(bookingsApi.getMyBookings).not.toHaveBeenCalled()
  })

  it('shows a signed-in customer their next booking and past places to rebook', async () => {
    signInAsCustomer()
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue([
      customerBooking('fade-co', 'Fade & Co', 'Skin fade', 9, 'PENDING'),
      customerBooking('ka-studio', 'KA Studio', 'BIAB infill', 2, 'CONFIRMED'),
      customerBooking(
        'ka-studio',
        'KA Studio',
        'Gel manicure',
        -30,
        'COMPLETED',
      ),
      customerBooking('fade-co', 'Fade & Co', 'Beard trim', -10, 'CANCELLED'),
    ])

    renderPage()

    const upcoming = await screen.findByRole('region', { name: 'Upcoming' })
    expect(within(upcoming).getByText('BIAB infill')).toBeInTheDocument()
    expect(within(upcoming).getByText('1 more booked')).toBeInTheDocument()

    const again = screen.getByRole('region', { name: 'Book again' })
    const rebookLinks = within(again).getAllByRole('link')
    expect(rebookLinks).toHaveLength(1)
    expect(rebookLinks[0]).toHaveAttribute('href', '/book/ka-studio')
    expect(within(again).getByText(/Gel manicure/)).toBeInTheDocument()
  })

  it('still lists businesses when the customer bookings call fails', async () => {
    signInAsCustomer()
    vi.mocked(bookingsApi.getMyBookings).mockRejectedValue(new Error('boom'))

    renderPage()

    expect(
      await screen.findByRole('region', { name: 'All businesses' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Upcoming' })).toBeNull()
  })
})
