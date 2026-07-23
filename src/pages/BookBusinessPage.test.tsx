import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../api/client'
import * as publicApi from '../api/public'
import { AuthProvider } from '../context/AuthContext'
import type { Booking, Business, Service, TimeSlot } from '../types/api'
import { BookBusinessPage } from './BookBusinessPage'

vi.mock('../api/public')

const business: Business = {
  id: 'b-1',
  name: 'Absolutely Fabulous Hair and Beauty',
  slug: 'absolutelyfabuloushairandbeauty',
  currency: 'GBP',
  bookingAdvanceDays: 30,
}

const haircut: Service = {
  id: 's-1',
  businessId: 'b-1',
  name: 'Haircut',
  durationMinutes: 30,
  price: 25,
  isActive: true,
}

function tomorrowAt(hour: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hour, 0, 0, 0)
  return date
}

function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const slotNine = tomorrowAt(9)
const slotTen = tomorrowAt(10)

const slots: TimeSlot[] = [
  {
    startDatetime: slotNine.toISOString(),
    endDatetime: new Date(slotNine.getTime() + 30 * 60000).toISOString(),
  },
  {
    startDatetime: slotTen.toISOString(),
    endDatetime: new Date(slotTen.getTime() + 30 * 60000).toISOString(),
  },
]

function renderPage(authenticated = false) {
  if (authenticated) {
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
  return render(
    <MemoryRouter initialEntries={['/book/absolutelyfabuloushairandbeauty']}>
      <AuthProvider>
        <Routes>
          <Route path="/book/:slug" element={<BookBusinessPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  vi.mocked(publicApi.getBusinessBySlug).mockResolvedValue(business)
  vi.mocked(publicApi.getActiveServices).mockResolvedValue([haircut])
  vi.mocked(publicApi.getAvailability).mockResolvedValue(slots)
  vi.mocked(publicApi.getAvailableDays).mockResolvedValue([
    toDateInput(slotNine),
  ])
})

function calendarDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Click the calendar day for the given date, paging to the next month
 *  when "tomorrow" falls across a month boundary. */
async function chooseDay(
  user: ReturnType<typeof userEvent.setup>,
  date: Date,
) {
  const label = calendarDayLabel(date)
  let dayButton = screen.queryByRole('button', { name: label })
  if (!dayButton) {
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    dayButton = await screen.findByRole('button', { name: label })
  }
  await waitFor(() => expect(dayButton).toBeEnabled())
  await user.click(dayButton!)
}

describe('BookBusinessPage', () => {
  it('loads the business for the slug in the URL', async () => {
    renderPage()

    expect(
      await screen.findByText('Absolutely Fabulous Hair and Beauty'),
    ).toBeInTheDocument()
    expect(publicApi.getBusinessBySlug).toHaveBeenCalledWith(
      'absolutelyfabuloushairandbeauty',
    )
    expect(screen.getByText('Haircut')).toBeInTheDocument()
  })

  it('shows available time slots once a service and date are chosen', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))

    await chooseDay(user, slotNine)

    await waitFor(() =>
      expect(publicApi.getAvailability).toHaveBeenCalledWith(
        'b-1',
        's-1',
        toDateInput(slotNine),
      ),
    )

    // two slot buttons rendered with local times
    const slotButtons = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    expect(slotButtons).toHaveLength(2)
  })

  it('only offers the submit button once a slot is selected', async () => {
    const user = userEvent.setup()
    renderPage(true)

    await screen.findByText('Haircut')
    expect(
      screen.queryByRole('button', { name: 'Request booking' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    expect(
      screen.getByRole('button', { name: 'Request appointment' }),
    ).toBeEnabled()
  })

  it('lets the customer go back a step', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)

    // now on the time step
    await screen.findAllByRole('button', { name: /\d{1,2}:\d{2}/ })

    await user.click(screen.getByRole('button', { name: '← Back' }))

    // back on the day step: the calendar month navigation is visible again
    expect(
      screen.getByRole('button', { name: 'Next month' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Back' }))

    // back on the service step
    expect(screen.getByRole('radio')).toBeInTheDocument()
  })

  it('submits a booking for the selected slot', async () => {
    vi.mocked(publicApi.createPublicBooking).mockResolvedValue({
      id: 'bk-1',
      businessId: 'b-1',
      status: 'PENDING',
      startDatetime: slots[0].startDatetime,
      endDatetime: slots[0].endDatetime,
      customer: {
        id: 'c-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      },
      service: { id: 's-1', name: 'Haircut', durationMinutes: 30 },
    } as Booking)

    const user = userEvent.setup()
    renderPage(true)

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    await user.click(
      screen.getByRole('button', { name: 'Request appointment' }),
    )

    await screen.findByText('Thanks, Jane')

    expect(publicApi.createPublicBooking).toHaveBeenCalledWith('b-1', {
      customer: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: undefined,
      },
      serviceId: 's-1',
      startDatetime: slots[0].startDatetime,
      customerNotes: undefined,
      emailReminder: true,
      smsReminder: false,
    }, 'access-token')
  })

  it('offers the guest details form before an anonymous customer can submit', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    expect(
      screen.getByRole('heading', { name: 'Your details' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveValue('')
    expect(
      screen.getByRole('button', { name: /email me a code/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Request appointment' }),
    ).not.toBeInTheDocument()
  })

  it('restores an unfinished booking after authentication navigation', async () => {
    const user = userEvent.setup()
    const firstRender = renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    await waitFor(() =>
      expect(
        sessionStorage.getItem(
          'booking-draft:absolutelyfabuloushairandbeauty',
        ),
      ).toContain(slots[0].startDatetime),
    )
    firstRender.unmount()

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Your details' }),
    ).toBeInTheDocument()
  })

  it('shows a message when no slots are available', async () => {
    vi.mocked(publicApi.getAvailability).mockResolvedValue([])

    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)

    expect(
      await screen.findByText(/No available times on this date/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Request booking' }),
    ).not.toBeInTheDocument()
  })
})

describe('guest booking with email code', () => {
  it('lets a guest book by entering a 6-digit emailed code', async () => {
    vi.mocked(publicApi.startGuestBooking).mockResolvedValue({
      bookingSessionId: 'sess-1',
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    })
    const confirmed: Booking = {
      id: 'bk-1',
      businessId: business.id,
      customer: { id: 'c-1', firstName: 'Gwen', lastName: 'Guest', email: 'gwen@example.com' },
      service: haircut,
      startDatetime: slots[0].startDatetime,
      endDatetime: slots[0].endDatetime,
      status: 'PENDING',
    } as Booking
    vi.mocked(publicApi.verifyGuestBooking).mockResolvedValue(confirmed)

    const user = userEvent.setup()
    renderPage(false)

    await user.click(await screen.findByText('Haircut'))
    await chooseDay(user, slotNine)
    await user.click(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )

    // Guest details form instead of a sign-in wall
    await user.type(screen.getByLabelText('First name'), 'Gwen')
    await user.type(screen.getByLabelText('Last name'), 'Guest')
    await user.type(screen.getByLabelText('Email'), 'gwen@example.com')
    await user.click(screen.getByRole('button', { name: /email me a code/i }))

    expect(publicApi.startGuestBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
        email: 'gwen@example.com',
        serviceId: haircut.id,
      }),
    )

    // Code entry appears with the email echoed back
    await screen.findByText(/we sent a code to/i)
    await user.type(screen.getByLabelText(/6-digit code/i), '123456')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(publicApi.verifyGuestBooking).toHaveBeenCalledWith('sess-1', '123456')
    await screen.findByText(/thanks, gwen/i)
    expect(screen.getByText('Request sent')).toBeInTheDocument()
    expect(screen.getByText(/will confirm your appointment/i)).toBeInTheDocument()
  })

  it('shows instant confirmation when the business auto-confirms', async () => {
    vi.mocked(publicApi.startGuestBooking).mockResolvedValue({
      bookingSessionId: 'sess-1',
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    })
    const confirmed: Booking = {
      id: 'bk-1',
      businessId: business.id,
      customer: { id: 'c-1', firstName: 'Gwen', lastName: 'Guest', email: 'gwen@example.com' },
      service: haircut,
      startDatetime: slots[0].startDatetime,
      endDatetime: slots[0].endDatetime,
      status: 'CONFIRMED',
    } as Booking
    vi.mocked(publicApi.verifyGuestBooking).mockResolvedValue(confirmed)

    const user = userEvent.setup()
    renderPage(false)

    await user.click(await screen.findByText('Haircut'))
    await chooseDay(user, slotNine)
    await user.click(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )

    await user.type(screen.getByLabelText('First name'), 'Gwen')
    await user.type(screen.getByLabelText('Last name'), 'Guest')
    await user.type(screen.getByLabelText('Email'), 'gwen@example.com')
    await user.click(screen.getByRole('button', { name: /email me a code/i }))

    await screen.findByText(/we sent a code to/i)
    await user.type(screen.getByLabelText(/6-digit code/i), '123456')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    await screen.findByText(/thanks, gwen/i)
    expect(screen.getByText('Confirmed ✓')).toBeInTheDocument()
    expect(screen.getByText(/you.re booked/i)).toBeInTheDocument()
    expect(screen.queryByText('Request sent')).not.toBeInTheDocument()
    expect(screen.queryByText(/will confirm your appointment/i)).not.toBeInTheDocument()
  })

  it('shows an error and keeps the code form on a wrong code', async () => {
    vi.mocked(publicApi.startGuestBooking).mockResolvedValue({
      bookingSessionId: 'sess-1',
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    })
    vi.mocked(publicApi.verifyGuestBooking).mockRejectedValue(
      new ApiClientError(400, { message: 'Incorrect code. Please try again.' }),
    )

    const user = userEvent.setup()
    renderPage(false)

    await user.click(await screen.findByText('Haircut'))
    await chooseDay(user, slotNine)
    await user.click(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )
    await user.type(screen.getByLabelText('First name'), 'Gwen')
    await user.type(screen.getByLabelText('Last name'), 'Guest')
    await user.type(screen.getByLabelText('Email'), 'gwen@example.com')
    await user.click(screen.getByRole('button', { name: /email me a code/i }))

    await screen.findByText(/we sent a code to/i)
    await user.type(screen.getByLabelText(/6-digit code/i), '000000')
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    await screen.findByText(/incorrect code/i)
    expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument()
  })

  it('returns to time selection when the slot is taken before a code is requested', async () => {
    vi.mocked(publicApi.startGuestBooking).mockRejectedValue(
      new ApiClientError(409, { message: 'This slot was just booked by someone else.' }),
    )

    const user = userEvent.setup()
    renderPage(false)

    await user.click(await screen.findByText('Haircut'))
    await chooseDay(user, slotNine)
    await user.click(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )
    await user.type(screen.getByLabelText('First name'), 'Gwen')
    await user.type(screen.getByLabelText('Last name'), 'Guest')
    await user.type(screen.getByLabelText('Email'), 'gwen@example.com')
    await user.click(screen.getByRole('button', { name: /email me a code/i }))

    await screen.findByText(/this slot was just booked/i)
    await screen.findByText('Pick a time')
    expect(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    ).toBeInTheDocument()
  })

  it('still shows the prefilled one-click flow for verified customers', async () => {
    const user = userEvent.setup()
    renderPage(true)

    await user.click(await screen.findByText('Haircut'))
    await chooseDay(user, slotNine)
    await user.click(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )

    expect(screen.getByLabelText('First name')).toHaveValue('Jane')
    expect(
      screen.getByRole('button', { name: /request appointment/i }),
    ).toBeInTheDocument()
    expect(publicApi.startGuestBooking).not.toHaveBeenCalled()
  })

  it('clears a pending OTP session when the guest navigates back and picks a different slot', async () => {
    vi.mocked(publicApi.startGuestBooking).mockResolvedValue({
      bookingSessionId: 'sess-1',
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    })

    const user = userEvent.setup()
    renderPage(false)

    await user.click(await screen.findByText('Haircut'))
    await chooseDay(user, slotNine)
    await user.click(
      screen.getByRole('button', {
        name: slotNine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )
    await user.type(screen.getByLabelText('First name'), 'Gwen')
    await user.type(screen.getByLabelText('Last name'), 'Guest')
    await user.type(screen.getByLabelText('Email'), 'gwen@example.com')
    await user.click(screen.getByRole('button', { name: /email me a code/i }))

    await screen.findByText(/we sent a code to/i)

    // Guest goes back and picks a different time slot
    await user.click(screen.getByRole('button', { name: '← Back' }))
    await user.click(
      screen.getByRole('button', {
        name: slotTen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }),
    )

    // The stale OTP session must not still be bound to the old slot
    expect(
      screen.getByRole('button', { name: /email me a code/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument()
  })
})
