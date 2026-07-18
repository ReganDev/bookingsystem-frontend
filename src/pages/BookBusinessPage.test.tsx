import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderPage() {
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
    renderPage()

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
    renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await chooseDay(user, slotNine)
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
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
    })
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
