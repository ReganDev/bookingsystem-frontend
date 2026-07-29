import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import * as usersApi from '../api/users'
import type {
  Booking,
  Customer,
  Page,
  RecurringBookingResponse,
  Service,
  StaffMember,
} from '../types/api'
import { NewBookingPanel } from './NewBookingPanel'

vi.mock('../api/customers')
vi.mock('../api/bookings')
vi.mock('../api/users')

const services: Service[] = [
  {
    id: 's-1',
    businessId: 'b-1',
    name: 'Cut and blow dry',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 's-2',
    businessId: 'b-1',
    name: 'Mobile cut',
    durationMinutes: 45,
    isActive: true,
    requiresCustomerAddress: true,
  },
]

const jane: Customer = {
  id: 'c-1',
  businessId: 'b-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  fullName: 'Jane Doe',
  phone: '07700900000',
}

const alex: StaffMember = {
  id: 'u-1',
  firstName: 'Alex',
  lastName: 'Stylist',
  fullName: 'Alex Stylist',
  acceptsBookings: true,
}

function page(content: Customer[]): Page<Customer> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 50,
    number: 0,
  }
}

const onCreated = vi.fn<(createdStartIso?: string) => Promise<void>>()

function renderPanel() {
  return render(
    <NewBookingPanel
      services={services}
      businessId="b-1"
      token="tok"
      onCreated={onCreated}
    />,
  )
}

/** Fills in the service and date/time, which every path needs. */
async function fillBookingDetails(
  user: ReturnType<typeof userEvent.setup>,
  serviceId = 's-1',
) {
  await user.selectOptions(screen.getByLabelText('Service'), serviceId)
  await user.click(screen.getByLabelText('Date & time'))
  const dialog = await screen.findByRole('dialog')
  const day = within(dialog)
    .getAllByRole('button')
    .find(
      (button) =>
        button.classList.contains('booking-day') &&
        button.classList.contains('available'),
    )
  if (!day) throw new Error('No selectable day in date picker')
  await user.click(day)
  await user.type(within(dialog).getByLabelText('Time'), '10:00')
  await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
}

/** Picks Jane from the pre-loaded list. */
async function pickJane(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('option', { name: /Jane Doe/ }))
}

beforeEach(() => {
  vi.resetAllMocks()
  onCreated.mockResolvedValue(undefined)
  vi.mocked(usersApi.getStaff).mockResolvedValue([])
  vi.mocked(customersApi.listCustomers).mockResolvedValue(page([jane]))
  vi.mocked(customersApi.searchCustomers).mockResolvedValue(page([jane]))
  vi.mocked(customersApi.getOrCreateCustomer).mockResolvedValue(jane)
  vi.mocked(bookingsApi.createBooking).mockResolvedValue({ id: 'bk-1' } as Booking)
  vi.mocked(bookingsApi.createRecurringBookings).mockResolvedValue({
    seriesId: 'sr-1',
    created: Array.from({ length: 12 }, (_, i) => ({ id: `bk-${i}` }) as Booking),
    skipped: [],
  })
})

describe('NewBookingPanel', () => {
  it('opens on the existing-customer list, since most bookings are repeat clients', async () => {
    renderPanel()

    expect(screen.getByLabelText('Existing customer')).toBeChecked()
    expect(await screen.findByRole('option', { name: /Jane Doe/ })).toBeInTheDocument()
  })

  it('books a picked customer by id, without creating a contact', async () => {
    const user = userEvent.setup()
    renderPanel()

    await pickJane(user)
    await fillBookingDetails(user)
    await user.click(screen.getByRole('button', { name: 'Create booking' }))

    await waitFor(() =>
      expect(bookingsApi.createBooking).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({ customerId: 'c-1', serviceId: 's-1' }),
        'tok',
      ),
    )
    // The whole point of the picker: no get-or-create round trip, so no chance
    // of writing a duplicate contact row.
    expect(customersApi.getOrCreateCustomer).not.toHaveBeenCalled()
    expect(onCreated).toHaveBeenCalled()
  })

  it('still routes the New customer flow through get-or-create', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('New customer'))
    await user.type(screen.getByLabelText('Customer first name'), 'Jane')
    await user.type(screen.getByLabelText('Customer last name'), 'Doe')
    await user.type(screen.getByLabelText('Customer email'), 'jane@example.com')
    await fillBookingDetails(user)
    await user.click(screen.getByRole('button', { name: 'Create booking' }))

    await waitFor(() =>
      expect(customersApi.getOrCreateCustomer).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: undefined,
        }),
        'tok',
      ),
    )
    expect(bookingsApi.createBooking).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({ customerId: 'c-1' }),
      'tok',
    )
  })

  it('blocks submitting in Existing mode when nobody is picked', async () => {
    const user = userEvent.setup()
    renderPanel()

    await screen.findByRole('option', { name: /Jane Doe/ })
    await fillBookingDetails(user)
    await user.click(screen.getByRole('button', { name: 'Create booking' }))

    expect(
      await screen.findByText(/Pick a customer from the list/),
    ).toBeInTheDocument()
    expect(bookingsApi.createBooking).not.toHaveBeenCalled()
  })

  describe('mobile-visit services', () => {
    it('hides the address section for ordinary services', async () => {
      const user = userEvent.setup()
      renderPanel()

      await user.selectOptions(screen.getByLabelText('Service'), 's-1')

      expect(screen.queryByLabelText('Address line 1')).not.toBeInTheDocument()
    })

    it('offers an optional address for mobile services and sends it when filled', async () => {
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user, 's-2')
      await user.type(screen.getByLabelText('Address line 1'), '1 High Street')
      await user.type(screen.getByLabelText('Town or city'), 'Manchester')
      await user.type(screen.getByLabelText('Postcode'), 'M1 1AE')
      await user.click(screen.getByRole('button', { name: 'Create booking' }))

      await waitFor(() =>
        expect(bookingsApi.createBooking).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({
            serviceId: 's-2',
            addressLine1: '1 High Street',
            addressCity: 'Manchester',
            addressPostcode: 'M1 1AE',
          }),
          'tok',
        ),
      )
    })

    it('leaves the address out entirely when the owner skips it', async () => {
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user, 's-2')
      await user.click(screen.getByRole('button', { name: 'Create booking' }))

      await waitFor(() => expect(bookingsApi.createBooking).toHaveBeenCalled())
      const payload = vi.mocked(bookingsApi.createBooking).mock.calls[0][1]
      expect(payload).not.toHaveProperty('addressLine1')
    })
  })

  describe('recurring bookings', () => {
    it('creates a series with the chosen frequency and count', async () => {
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByLabelText('Repeat this booking'))

      const interval = screen.getByLabelText('Repeat every')
      await user.clear(interval)
      await user.type(interval, '6')

      await user.click(screen.getByRole('button', { name: 'Create 12 bookings' }))

      await waitFor(() =>
        expect(bookingsApi.createRecurringBookings).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({
            customerId: 'c-1',
            serviceId: 's-1',
            frequency: 'WEEKLY',
            intervalWeeks: 6,
            occurrenceCount: 12,
          }),
          'tok',
        ),
      )
      expect(bookingsApi.createBooking).not.toHaveBeenCalled()
    })

    it('previews the dates before anything is created', async () => {
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByLabelText('Repeat this booking'))

      expect(
        await screen.findByText(/12 bookings, every/),
      ).toBeInTheDocument()
      expect(bookingsApi.createRecurringBookings).not.toHaveBeenCalled()
    })

    it('names the occurrences that were skipped as already booked', async () => {
      vi.mocked(bookingsApi.createRecurringBookings).mockResolvedValue({
        seriesId: 'sr-1',
        created: Array.from({ length: 10 }, (_, i) => ({ id: `bk-${i}` }) as Booking),
        skipped: [
          { startDatetime: '2026-09-01T09:00:00Z', reason: 'Already booked' },
          { startDatetime: '2026-09-29T09:00:00Z', reason: 'Already booked' },
        ],
      } satisfies RecurringBookingResponse)

      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByLabelText('Repeat this booking'))
      await user.click(screen.getByRole('button', { name: 'Create 12 bookings' }))

      expect(
        await screen.findByText(/Created 10 of 12 bookings\./),
      ).toBeInTheDocument()
      expect(screen.getByText(/1 Sept/)).toBeInTheDocument()
      expect(screen.getByText(/29 Sept/)).toBeInTheDocument()
    })

    it('refuses a count outside the allowed range', async () => {
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByLabelText('Repeat this booking'))

      const count = screen.getByLabelText('Number of bookings')
      // The input's own min/max stops the submit first; the guard in
      // handleSubmit is the backstop if that is ever bypassed.
      expect(count).toHaveAttribute('min', '2')
      expect(count).toHaveAttribute('max', '52')

      await user.clear(count)
      await user.type(count, '99')
      await user.click(screen.getByRole('button', { name: 'Create 99 bookings' }))

      await waitFor(() =>
        expect(bookingsApi.createRecurringBookings).not.toHaveBeenCalled(),
      )
      expect(bookingsApi.createBooking).not.toHaveBeenCalled()
    })
  })

  describe('staff picker', () => {
    it('stays hidden when the business has nobody taking bookings', async () => {
      renderPanel()

      await screen.findByRole('option', { name: /Jane Doe/ })
      expect(screen.queryByLabelText('Any')).not.toBeInTheDocument()
    })

    it('sends the chosen staff member', async () => {
      vi.mocked(usersApi.getStaff).mockResolvedValue([alex])
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(await screen.findByLabelText('Alex Stylist'))
      await user.click(screen.getByRole('button', { name: 'Create booking' }))

      await waitFor(() =>
        expect(bookingsApi.createBooking).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({ staffId: 'u-1' }),
          'tok',
        ),
      )
    })

    it('sends no staff id for "Any", keeping the booking business-wide', async () => {
      vi.mocked(usersApi.getStaff).mockResolvedValue([alex])
      const user = userEvent.setup()
      renderPanel()

      await pickJane(user)
      await fillBookingDetails(user)
      expect(await screen.findByLabelText('Any')).toBeChecked()
      await user.click(screen.getByRole('button', { name: 'Create booking' }))

      await waitFor(() =>
        expect(bookingsApi.createBooking).toHaveBeenCalledWith(
          'b-1',
          expect.objectContaining({ staffId: undefined }),
          'tok',
        ),
      )
    })
  })

  describe('embedding in a modal', () => {
    const onRequestClose = vi.fn()

    function renderEmbedded(initialPickerDate?: string) {
      return render(
        <NewBookingPanel
          services={services}
          businessId="b-1"
          token="tok"
          onCreated={onCreated}
          onRequestClose={onRequestClose}
          initialPickerDate={initialPickerDate}
          embedded
        />,
      )
    }

    it('drops the panel chrome so the host dialog provides it', async () => {
      const { container } = renderEmbedded()

      await screen.findByRole('option', { name: /Jane Doe/ })
      expect(container.querySelector('.panel')).toBeNull()
      expect(
        screen.queryByRole('heading', { name: 'New booking' }),
      ).not.toBeInTheDocument()
    })

    it('asks to close after a single booking, passing the created start', async () => {
      const user = userEvent.setup()
      renderEmbedded()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByRole('button', { name: 'Create booking' }))

      await waitFor(() => expect(onRequestClose).toHaveBeenCalledTimes(1))
      expect(onCreated).toHaveBeenCalledWith(expect.any(String))
      const createdStart = onCreated.mock.calls[0][0]
      expect(Number.isNaN(new Date(createdStart!).getTime())).toBe(false)
    })

    it('asks to close after a series where nothing was skipped', async () => {
      const user = userEvent.setup()
      renderEmbedded()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByLabelText('Repeat this booking'))
      await user.click(screen.getByRole('button', { name: 'Create 12 bookings' }))

      await waitFor(() => expect(onRequestClose).toHaveBeenCalledTimes(1))
    })

    it('stays open to show the skip report when occurrences clashed', async () => {
      vi.mocked(bookingsApi.createRecurringBookings).mockResolvedValue({
        seriesId: 'sr-1',
        created: Array.from({ length: 10 }, (_, i) => ({ id: `bk-${i}` }) as Booking),
        skipped: [
          { startDatetime: '2026-09-01T09:00:00Z', reason: 'Already booked' },
          { startDatetime: '2026-09-29T09:00:00Z', reason: 'Already booked' },
        ],
      } satisfies RecurringBookingResponse)

      const user = userEvent.setup()
      renderEmbedded()

      await pickJane(user)
      await fillBookingDetails(user)
      await user.click(screen.getByLabelText('Repeat this booking'))
      await user.click(screen.getByRole('button', { name: 'Create 12 bookings' }))

      expect(
        await screen.findByText(/Created 10 of 12 bookings\./),
      ).toBeInTheDocument()
      expect(onRequestClose).not.toHaveBeenCalled()
      expect(onCreated).toHaveBeenCalled()
    })

    it('opens the date picker anchored on the given initial date', async () => {
      const user = userEvent.setup()
      renderEmbedded('2026-08-12')

      await user.click(screen.getByLabelText('Date & time'))
      const dialog = await screen.findByRole('dialog')

      expect(within(dialog).getByText('August 2026')).toBeInTheDocument()
      const preselected = within(dialog).getByRole('button', {
        name: /12 August 2026|August 12, 2026/,
      })
      expect(preselected).toHaveAttribute('aria-pressed', 'true')
      // Confirm still needs an explicit click; nothing was submitted for them.
      expect(screen.getByLabelText('Date & time')).toHaveTextContent(
        'Select date & time',
      )
    })
  })
})
