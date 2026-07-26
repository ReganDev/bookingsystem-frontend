import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as customersApi from '../api/customers'
import type { Customer, Page } from '../types/api'
import {
  CustomerPicker,
  EMPTY_CUSTOMER,
  type CustomerMode,
  type NewCustomer,
} from './CustomerPicker'

vi.mock('../api/customers')

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
    size: 50,
    number: 0,
  }
}

/** Drives the picker with real state, the way the panel does. */
function Harness({ onSelected }: { onSelected?: (c: Customer | null) => void }) {
  const [mode, setMode] = useState<CustomerMode>('existing')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState<NewCustomer>(EMPTY_CUSTOMER)

  return (
    <CustomerPicker
      businessId="b-1"
      token="tok"
      mode={mode}
      onModeChange={setMode}
      selected={selected}
      onSelect={(customer) => {
        setSelected(customer)
        onSelected?.(customer)
      }}
      newCustomer={newCustomer}
      onNewCustomerChange={setNewCustomer}
    />
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(customersApi.listCustomers).mockResolvedValue(page([jane, janet]))
  vi.mocked(customersApi.searchCustomers).mockResolvedValue(page([jane, janet]))
})

describe('CustomerPicker', () => {
  it('shows the existing customers straight away, without anything typed', async () => {
    render(<Harness />)

    expect(await screen.findByRole('option', { name: /Jane Doe/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Janet Cole/ })).toBeInTheDocument()
    expect(customersApi.listCustomers).toHaveBeenCalledWith('b-1', 'tok')
    // The list is the point: no search request goes out just to see it.
    expect(customersApi.searchCustomers).not.toHaveBeenCalled()
  })

  it('falls back to the New customer form when the business has nobody yet', async () => {
    vi.mocked(customersApi.listCustomers).mockResolvedValue(page([]))
    render(<Harness />)

    expect(await screen.findByLabelText('Customer email')).toBeInTheDocument()
    expect(screen.getByLabelText('New customer')).toBeChecked()
  })

  it('switches to the server search once two characters are typed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByRole('option', { name: /Jane Doe/ })

    await user.type(screen.getByLabelText('Find customer'), 'jan')

    await waitFor(() =>
      expect(customersApi.searchCustomers).toHaveBeenCalledWith('b-1', 'jan', 'tok'),
    )
  })

  it('does not search until the query is two characters', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByRole('option', { name: /Jane Doe/ })

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
    render(<Harness />)
    const input = await screen.findByLabelText('Find customer')

    await user.type(input, 'ja')
    await waitFor(() =>
      expect(customersApi.searchCustomers).toHaveBeenCalledWith('b-1', 'ja', 'tok'),
    )

    await user.type(input, 'n')
    expect(
      await screen.findByRole('option', { name: /Janet Cole/ }),
    ).toBeInTheDocument()

    releaseStale(page([jane]))

    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: /Jane Doe/ }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('option', { name: /Janet Cole/ })).toBeInTheDocument()
  })

  it('highlights nothing while merely browsing the pre-loaded list', async () => {
    render(<Harness />)

    const options = await screen.findAllByRole('option')
    // Nothing was typed, so nothing is pre-selected: Enter must not commit a
    // customer the owner never chose.
    expect(options.every((option) => option.getAttribute('aria-selected') === 'false'))
      .toBe(true)
  })

  it('picks the highlighted customer with the arrow keys and Enter', async () => {
    const onSelected = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSelected={onSelected} />)

    const input = await screen.findByLabelText('Find customer')
    await user.type(input, 'jan')

    // Wait for the search results to land, not just the pre-loaded list: only
    // then is the top match highlighted for Enter to act on.
    await waitFor(() =>
      expect(customersApi.searchCustomers).toHaveBeenCalledWith('b-1', 'jan', 'tok'),
    )
    await waitFor(() =>
      expect(screen.getAllByRole('option')[0]).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )

    // Top match is highlighted; move to the second and take it.
    await user.keyboard('{ArrowDown}{Enter}')

    await waitFor(() =>
      expect(onSelected).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-2' })),
    )
  })

  it('reports no matches without offering an empty list', async () => {
    vi.mocked(customersApi.searchCustomers).mockResolvedValue(page([]))
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(await screen.findByLabelText('Find customer'), 'zzz')

    expect(await screen.findByText(/No customers match/)).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('surfaces a failed search instead of looking like no matches', async () => {
    vi.mocked(customersApi.searchCustomers).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(await screen.findByLabelText('Find customer'), 'jan')

    expect(
      await screen.findByText('Failed to search customers.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No customers match/)).not.toBeInTheDocument()
  })

  it('drops a picked customer when switching back to New customer', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(await screen.findByRole('option', { name: /Jane Doe/ }))
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()

    await user.click(screen.getByLabelText('New customer'))
    await user.click(screen.getByLabelText('Existing customer'))

    // Back in Existing mode we are browsing again, not still holding Jane.
    expect(screen.getByLabelText('Find customer')).toHaveValue('')
  })

  it('lets the owner change their mind about who the booking is for', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(await screen.findByRole('option', { name: /Jane Doe/ }))
    await user.click(screen.getByRole('button', { name: 'Change' }))

    const input = screen.getByLabelText('Find customer')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })
})
