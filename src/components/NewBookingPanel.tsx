import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { ApiClientError } from '../api/client'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import type { Customer, Service } from '../types/api'

const SEARCH_DEBOUNCE_MS = 250
const MIN_SEARCH_LENGTH = 2

const LISTBOX_ID = 'customer-search-results'
const optionId = (index: number) => `customer-option-${index}`

type CustomerMode = 'new' | 'existing'

export function NewBookingPanel({
  services,
  businessId,
  token,
  onCreated,
}: {
  services: Service[]
  businessId: string
  token: string
  onCreated: () => Promise<void>
}) {
  const [serviceId, setServiceId] = useState('')
  const [startDatetime, setStartDatetime] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 'new' stays the default: a business with no customers yet must not be sent
  // looking for one, and this keeps the original flow untouched.
  const [customerMode, setCustomerMode] = useState<CustomerMode>('new')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [listOpen, setListOpen] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  // "Change" swaps the selected-customer summary back for the search box, so the
  // input does not exist yet when the click is handled. Focus it once it mounts.
  const focusSearchOnClearRef = useRef(false)
  // Typing fast puts several searches in flight and they can come back out of
  // order, so a slow early one would overwrite the newest results. Only the
  // request that is still the latest may write to state.
  const latestSearchRef = useRef(0)

  useEffect(() => {
    if (customerMode !== 'existing' || selectedCustomer) return

    const query = search.trim()
    if (query.length < MIN_SEARCH_LENGTH) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      setListOpen(false)
      setHighlightIndex(-1)
      return
    }

    setSearching(true)
    const requestId = ++latestSearchRef.current

    const timer = setTimeout(async () => {
      try {
        const page = await customersApi.searchCustomers(
          businessId,
          query,
          token,
        )
        if (requestId !== latestSearchRef.current) return
        setResults(page.content)
        setSearchError(null)
        setListOpen(true)
        setHighlightIndex(page.content.length > 0 ? 0 : -1)
      } catch (err) {
        if (requestId !== latestSearchRef.current) return
        setResults([])
        setHighlightIndex(-1)
        setListOpen(true)
        setSearchError(
          err instanceof ApiClientError
            ? err.message
            : 'Failed to search customers.',
        )
      } finally {
        if (requestId === latestSearchRef.current) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [search, customerMode, selectedCustomer, businessId, token])

  function selectCustomer(picked: Customer) {
    // Any search still in flight is now irrelevant.
    latestSearchRef.current++
    setSelectedCustomer(picked)
    setSearch(picked.fullName)
    setResults([])
    setSearching(false)
    setSearchError(null)
    setListOpen(false)
    setHighlightIndex(-1)
    setError(null)
  }

  useEffect(() => {
    if (selectedCustomer || !focusSearchOnClearRef.current) return
    focusSearchOnClearRef.current = false
    searchInputRef.current?.focus()
  }, [selectedCustomer])

  function clearSelection() {
    focusSearchOnClearRef.current = true
    setSelectedCustomer(null)
    setSearch('')
    setResults([])
    setListOpen(false)
    setHighlightIndex(-1)
  }

  function changeMode(next: CustomerMode) {
    setCustomerMode(next)
    setError(null)
    if (next === 'new') {
      // Drop the picked customer, so the new-customer path can never submit
      // against a selection the owner has navigated away from.
      setSelectedCustomer(null)
      setSearch('')
      setResults([])
      setListOpen(false)
      setHighlightIndex(-1)
    }
  }

  function resetForm() {
    setCustomer({ firstName: '', lastName: '', email: '', phone: '' })
    setCustomerNotes('')
    setStartDatetime('')
    setServiceId('')
    setCustomerMode('new')
    setSelectedCustomer(null)
    setSearch('')
    setResults([])
    setListOpen(false)
    setHighlightIndex(-1)
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setListOpen(false)
      return
    }

    if (!listOpen || results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      )
    } else if (event.key === 'Enter') {
      // Enter picks the highlighted customer instead of submitting a form that
      // has no customer attached yet.
      event.preventDefault()
      const picked = results[highlightIndex]
      if (picked) selectCustomer(picked)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (customerMode === 'existing' && !selectedCustomer) {
      setError(
        'Pick a customer from the search results, or switch to “New customer”.',
      )
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // A customer picked from the list already has an id, so there is nothing
      // to look up and no way to write a duplicate contact.
      const customerId =
        customerMode === 'existing' && selectedCustomer
          ? selectedCustomer.id
          : (
              await customersApi.getOrCreateCustomer(
                businessId,
                { ...customer, phone: customer.phone || undefined },
                token,
              )
            ).id

      const start = new Date(startDatetime)
      const offset = start.toISOString()

      await bookingsApi.createBooking(
        businessId,
        {
          customerId,
          serviceId,
          startDatetime: offset,
          customerNotes: customerNotes || undefined,
        },
        token,
      )

      resetForm()
      await onCreated()
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to create booking.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const activeServices = services.filter((service) => service.isActive)
  const showResultsList =
    listOpen && !searching && !searchError && results.length > 0
  const showNoMatches =
    listOpen && !searching && !searchError && results.length === 0

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>New booking</h3>
      </div>

      {activeServices.length === 0 ? (
        <div className="empty-state">
          <strong>Add a service first</strong>
          <p>
            Bookings are always for a service. Go to the “Services” tab and
            add one, then come back here.
          </p>
        </div>
      ) : (
        <>
          {error && <div className="error-banner">{error}</div>}
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="service">Service</label>
              <select
                id="service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Select a service</option>
                {activeServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="startDatetime">Date & time</label>
              <input
                id="startDatetime"
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                required
              />
            </div>

            <fieldset className="customer-mode">
              <legend>Customer</legend>
              <label className="radio-row">
                <input
                  type="radio"
                  name="customerMode"
                  checked={customerMode === 'existing'}
                  onChange={() => changeMode('existing')}
                />
                Existing customer
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  name="customerMode"
                  checked={customerMode === 'new'}
                  onChange={() => changeMode('new')}
                />
                New customer
              </label>
            </fieldset>

            {customerMode === 'existing' ? (
              selectedCustomer ? (
                <div className="form-row">
                  <span className="form-label">Booking for</span>
                  <div className="customer-selected">
                    <span>
                      <strong>{selectedCustomer.fullName}</strong>
                      <span className="customer-option-meta">
                        {selectedCustomer.email}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={clearSelection}
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="form-row customer-search">
                  <label htmlFor="customerSearch">Find customer</label>
                  <input
                    id="customerSearch"
                    ref={searchInputRef}
                    role="combobox"
                    aria-expanded={showResultsList}
                    aria-controls={LISTBOX_ID}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      showResultsList && highlightIndex >= 0
                        ? optionId(highlightIndex)
                        : undefined
                    }
                    autoComplete="off"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setListOpen(true)
                    }}
                    onKeyDown={handleSearchKeyDown}
                  />
                  {searching && <p className="panel-hint">Searching…</p>}
                  {searchError && (
                    <p className="customer-results-empty" role="status">
                      {searchError}
                    </p>
                  )}
                  {showNoMatches && (
                    <p className="customer-results-empty" role="status">
                      No customers match “{search.trim()}”. Switch to “New
                      customer” to add them.
                    </p>
                  )}
                  {showResultsList && (
                    <div
                      className="customer-results"
                      id={LISTBOX_ID}
                      role="listbox"
                      aria-label="Matching customers"
                    >
                      {results.map((result, index) => (
                        <button
                          key={result.id}
                          type="button"
                          id={optionId(index)}
                          role="option"
                          aria-selected={index === highlightIndex}
                          className={
                            index === highlightIndex
                              ? 'customer-option is-highlighted'
                              : 'customer-option'
                          }
                          onMouseEnter={() => setHighlightIndex(index)}
                          onClick={() => selectCustomer(result)}
                        >
                          <strong>{result.fullName}</strong>
                          <span className="customer-option-meta">
                            {result.phone
                              ? `${result.email} · ${result.phone}`
                              : result.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <>
                <div className="form-row">
                  <label htmlFor="customerFirstName">
                    Customer first name
                  </label>
                  <input
                    id="customerFirstName"
                    value={customer.firstName}
                    onChange={(e) =>
                      setCustomer((current) => ({
                        ...current,
                        firstName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="customerLastName">Customer last name</label>
                  <input
                    id="customerLastName"
                    value={customer.lastName}
                    onChange={(e) =>
                      setCustomer((current) => ({
                        ...current,
                        lastName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="customerEmail">Customer email</label>
                  <input
                    id="customerEmail"
                    type="email"
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer((current) => ({
                        ...current,
                        email: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="customerPhone">
                    Customer phone (optional)
                  </label>
                  <input
                    id="customerPhone"
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((current) => ({
                        ...current,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <div className="form-row">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create booking'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
