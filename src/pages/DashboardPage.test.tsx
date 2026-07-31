import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as bookingsApi from '../api/bookings'
import * as businessesApi from '../api/businesses'
import * as schedulesApi from '../api/schedules'
import * as servicesApi from '../api/services'
import type { Business, Schedule, Service } from '../types/api'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/bookings')
vi.mock('../api/businesses')
vi.mock('../api/schedules')
vi.mock('../api/services')
// The page reads auth only as a fallback; the override props used below
// win, so a provider-less stub is all the tests need.
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ business: null, accessToken: null }),
}))

const business: Business = {
  id: 'b-1',
  name: 'Fab Hair',
  slug: 'fab-hair',
  email: 'salon@example.com',
  currency: 'GBP',
  autoConfirmBookings: true,
  photoUrls: [],
}

const services: Service[] = [
  {
    id: 's-1',
    businessId: 'b-1',
    name: 'Cut and blow dry',
    durationMinutes: 45,
    isActive: true,
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(servicesApi.getServices).mockResolvedValue(services)
  vi.mocked(schedulesApi.getSchedules).mockResolvedValue([
    { id: 'sch-1', businessId: 'b-1' } as Schedule,
  ])
  vi.mocked(bookingsApi.getBookingsInRange).mockResolvedValue([])
  vi.mocked(businessesApi.getBusiness).mockResolvedValue(business)
})

function tabRow() {
  const row = document.querySelector('.tabs')
  if (!(row instanceof HTMLElement)) throw new Error('Tab row not rendered')
  return row
}

describe('DashboardPage', () => {
  it('shows exactly Calendar, Services, Opening hours and Settings tabs', async () => {
    render(<DashboardPage business={business} token="tok" />)

    await screen.findByText(/Your schedule at a glance/)
    const tabs = within(tabRow()).getAllByRole('button')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Calendar',
      'Services',
      'Opening hours',
      'Settings',
    ])
  })

  it('offers New booking as a button inside the calendar, not a tab', async () => {
    render(<DashboardPage business={business} token="tok" />)

    await screen.findByText(/Your schedule at a glance/)
    expect(
      within(tabRow()).queryByRole('button', { name: 'New booking' }),
    ).not.toBeInTheDocument()
    expect(
      within(tabRow()).queryByRole('button', { name: 'Photos' }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'New booking' }),
    ).toBeInTheDocument()
  })

  it('hosts photo management inside Settings', async () => {
    const user = userEvent.setup()
    render(<DashboardPage business={business} token="tok" />)
    await screen.findByText(/Your schedule at a glance/)

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(
      screen.getByText(/photos shown on your booking page/),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Booking settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Photos' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Photos' }))
    expect(
      await screen.findByRole('heading', { name: 'Booking page photos' }),
    ).toBeInTheDocument()
  })
})
