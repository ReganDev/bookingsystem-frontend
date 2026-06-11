import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicApi from '../api/public'
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
      <Routes>
        <Route path="/book/:slug" element={<BookBusinessPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(publicApi.getBusinessBySlug).mockResolvedValue(business)
  vi.mocked(publicApi.getActiveServices).mockResolvedValue([haircut])
  vi.mocked(publicApi.getAvailability).mockResolvedValue(slots)
})

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

    const dateInput = screen.getByLabelText('Appointment date')
    await user.clear(dateInput)
    await user.type(dateInput, toDateInput(slotNine))

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

  it('keeps the submit button disabled until a slot is selected', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Haircut')
    expect(screen.getByRole('button', { name: 'Request booking' })).toBeDisabled()

    await user.click(screen.getByRole('radio'))
    await user.type(
      screen.getByLabelText('Appointment date'),
      toDateInput(slotNine),
    )
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    expect(
      screen.getByRole('button', { name: 'Request booking' }),
    ).toBeEnabled()
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
    await user.type(
      screen.getByLabelText('Appointment date'),
      toDateInput(slotNine),
    )
    const [firstSlot] = await screen.findAllByRole('button', {
      name: /\d{1,2}:\d{2}/,
    })
    await user.click(firstSlot)

    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: 'Request booking' }))

    await screen.findByText('Booking requested')

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
    })
  })

  it('shows a message when no slots are available', async () => {
    vi.mocked(publicApi.getAvailability).mockResolvedValue([])

    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Haircut')
    await user.click(screen.getByRole('radio'))
    await user.type(
      screen.getByLabelText('Appointment date'),
      toDateInput(slotNine),
    )

    expect(
      await screen.findByText(/No available times on this date/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request booking' }),
    ).toBeDisabled()
  })
})
