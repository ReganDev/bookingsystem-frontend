import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import type { Booking, Customer, Page, Service } from '../types/api'
import { NewBookingPanel } from './NewBookingPanel'

vi.mock('../api/customers')
vi.mock('../api/bookings')

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
  phone: '07700900000',
}

const janet: Customer = {
  id: 'c-2',
  businessId: 'b-1',
  email: 'janet.cole@example.com',
  firstName: 'Janet',
  lastName: 'Cole',
  fullName: 'Janet Cole',
}

function page(content: Customer[]): Page<Customer> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 8,
    number: 0,
  }
}

const onCreated = vi.fn<() => Promise<void>>()

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

/** Fills in the service and date/time, which both modes need. */
async function fillBookingDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Service'), 's-1')
  await user.type(screen.getByLabelText('Date & time'), '2026-08-03T10:00')
}

beforeEach(() => {
  vi.resetAllMocks()
  onCreated.mockResolvedValue(undefined)
  vi.mocked(customersApi.searchCustomers).mockResolvedValue(page([jane, janet]))
  vi.mocked(customersApi.getOrCreateCustomer).mockResolvedValue(jane)
  vi.mocked(bookingsApi.createBooking).mockResolvedValue({
    id: 'bk-1',
  } as Booking)
})

describe('NewBookingPanel', () => {
  it('starts on the New customer flow so a business with no customers is unaffected', () => {
    renderPanel()

    expect(screen.getByLabelText('New customer')).toBeChecked()
    expect(screen.getByLabelText('Customer email')).toBeInTheDocument()
    expect(screen.queryByLabelText('Find customer')).not.toBeInTheDocument()
  })

  it('books a picked customer by id, without creating a contact', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'jan')

    await user.click(await screen.findByRole('option', { name: /Jane Doe/ }))
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

    await user.type(screen.getByLabelText('Customer first name'), 'Jane')
    await user.type(screen.getByLabelText('Customer last name'), 'Doe')
    await user.type(
      screen.getByLabelText('Customer email'),
      'jane@example.com',
    )
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

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'jan')
    await screen.findByRole('option', { name: /Jane Doe/ })

    await fillBookingDetails(user)
    await user.click(screen.getByRole('button', { name: 'Create booking' }))

    expect(
      await screen.findByText(/Pick a customer from the search results/),
    ).toBeInTheDocument()
    expect(bookingsApi.createBooking).not.toHaveBeenCalled()
  })

  it('picks the highlighted customer with the arrow keys and Enter', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    const input = screen.getByLabelText('Find customer')
    await user.type(input, 'jan')
    await screen.findByRole('option', { name: /Jane Doe/ })

    // First result is highlighted by default; move to the second and take it.
    await user.keyboard('{ArrowDown}{Enter}')

    expect(await screen.findByText('Janet Cole')).toBeInTheDocument()
    // Enter selected rather than submitting the half-filled form.
    expect(bookingsApi.createBooking).not.toHaveBeenCalled()

    await fillBookingDetails(user)
    await user.click(screen.getByRole('button', { name: 'Create booking' }))

    await waitFor(() =>
      expect(bookingsApi.createBooking).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({ customerId: 'c-2' }),
        'tok',
      ),
    )
  })

  it('does not search until the query is two characters', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'j')

    await waitFor(() =>
      expect(customersApi.searchCustomers).not.toHaveBeenCalled(),
    )
  })

  it('shows the results of the latest query when an earlier one resolves last', async () => {
    // "ja" is slow, "jan" is fast: the stale response lands second and must be
    // discarded, or the list would contradict what is in the box.
    let releaseStale: (value: Page<Customer>) => void = () => {}
    vi.mocked(customersApi.searchCustomers).mockImplementation(
      (_businessId, query) => {
        if (query === 'ja') {
          return new Promise<Page<Customer>>((resolve) => {
            releaseStale = resolve
          })
        }
        return Promise.resolve(page([janet]))
      },
    )

    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    const input = screen.getByLabelText('Find customer')
    await user.type(input, 'ja')
    await waitFor(() =>
      expect(customersApi.searchCustomers).toHaveBeenCalledWith(
        'b-1',
        'ja',
        'tok',
      ),
    )

    await user.type(input, 'n')
    expect(await screen.findByRole('option', { name: /Janet Cole/ })).toBeInTheDocument()

    releaseStale(page([jane]))

    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /Jane Doe/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('option', { name: /Janet Cole/ })).toBeInTheDocument()
  })

  it('reports no matches without offering an empty list', async () => {
    vi.mocked(customersApi.searchCustomers).mockResolvedValue(page([]))
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'zzz')

    expect(await screen.findByText(/No customers match/)).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('surfaces a failed search instead of looking like no matches', async () => {
    vi.mocked(customersApi.searchCustomers).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'jan')

    expect(
      await screen.findByText('Failed to search customers.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No customers match/)).not.toBeInTheDocument()
  })

  it('drops a picked customer when switching back to New customer', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'jan')
    await user.click(await screen.findByRole('option', { name: /Jane Doe/ }))
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()

    await user.click(screen.getByLabelText('New customer'))
    await user.click(screen.getByLabelText('Existing customer'))

    // Back in Existing mode we are searching again, not still holding Jane.
    expect(screen.getByLabelText('Find customer')).toHaveValue('')
  })

  it('lets the owner change their mind about who the booking is for', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByLabelText('Existing customer'))
    await user.type(screen.getByLabelText('Find customer'), 'jan')
    await user.click(await screen.findByRole('option', { name: /Jane Doe/ }))

    await user.click(screen.getByRole('button', { name: 'Change' }))

    const input = screen.getByLabelText('Find customer')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })
})
