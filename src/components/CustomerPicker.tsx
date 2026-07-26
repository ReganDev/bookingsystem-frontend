import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { ApiClientError } from '../api/client'
import * as customersApi from '../api/customers'
import type { Customer } from '../types/api'

const SEARCH_DEBOUNCE_MS = 250
const MIN_SEARCH_LENGTH = 2

const LISTBOX_ID = 'customer-search-results'
const optionId = (index: number) => `customer-option-${index}`

export type CustomerMode = 'new' | 'existing'

export type NewCustomer = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export const EMPTY_CUSTOMER: NewCustomer = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
}

/**
 * Who the booking is for: pick someone already on the books, or type in
 * somebody new. The list is populated up front rather than waiting for a
 * search, because the owner should not have to recall a name to see one.
 */
export function CustomerPicker({
  businessId,
  token,
  mode,
  onModeChange,
  selected,
  onSelect,
  newCustomer,
  onNewCustomerChange,
}: {
  businessId: string
  token: string
  mode: CustomerMode
  onModeChange: (mode: CustomerMode) => void
  selected: Customer | null
  onSelect: (customer: Customer | null) => void
  newCustomer: NewCustomer
  onNewCustomerChange: (customer: NewCustomer) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [loadedAll, setLoadedAll] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  // "Change" swaps the selected-customer summary back for the search box, so the
  // input does not exist yet when the click is handled. Focus it once it mounts.
  const focusSearchOnClearRef = useRef(false)
  // Typing fast puts several searches in flight and they can come back out of
  // order, so a slow early one would overwrite the newest results. Only the
  // request that is still the latest may write to state.
  const latestSearchRef = useRef(0)

  // The first page on mount, so the list is never empty just because nothing
  // has been typed. A business with no customers at all falls back to the new
  // customer form rather than showing an empty box.
  useEffect(() => {
    let active = true
    const requestId = ++latestSearchRef.current
    setSearching(true)

    customersApi
      .listCustomers(businessId, token)
      .then((page) => {
        if (!active || requestId !== latestSearchRef.current) return
        setResults(page.content)
        setSearchError(null)
        setLoadedAll(true)
        if (page.content.length === 0) onModeChange('new')
      })
      .catch((err) => {
        if (!active || requestId !== latestSearchRef.current) return
        setResults([])
        setSearchError(
          err instanceof ApiClientError ? err.message : 'Failed to load customers.',
        )
      })
      .finally(() => {
        if (active && requestId === latestSearchRef.current) setSearching(false)
      })

    return () => {
      active = false
    }
    // onModeChange is only used for the zero-customer fallback and would
    // re-run this fetch on every parent render if it were a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, token])

  // Typing switches to the server search, which reaches customers beyond the
  // first page. Clearing the box restores the pre-loaded list.
  useEffect(() => {
    if (mode !== 'existing' || selected) return

    const query = search.trim()
    if (query.length < MIN_SEARCH_LENGTH) {
      if (!loadedAll) return
      const requestId = ++latestSearchRef.current
      customersApi
        .listCustomers(businessId, token)
        .then((page) => {
          if (requestId !== latestSearchRef.current) return
          setResults(page.content)
          setSearchError(null)
          setHighlightIndex(-1)
        })
        .catch(() => {
          /* the list is already on screen; a failed refresh is not worth a banner */
        })
      return
    }

    setSearching(true)
    const requestId = ++latestSearchRef.current

    const timer = setTimeout(async () => {
      try {
        const page = await customersApi.searchCustomers(businessId, query, token)
        if (requestId !== latestSearchRef.current) return
        setResults(page.content)
        setSearchError(null)
        setHighlightIndex(page.content.length > 0 ? 0 : -1)
      } catch (err) {
        if (requestId !== latestSearchRef.current) return
        setResults([])
        setHighlightIndex(-1)
        setSearchError(
          err instanceof ApiClientError ? err.message : 'Failed to search customers.',
        )
      } finally {
        if (requestId === latestSearchRef.current) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mode, selected, businessId, token, loadedAll])

  useEffect(() => {
    if (selected || !focusSearchOnClearRef.current) return
    focusSearchOnClearRef.current = false
    searchInputRef.current?.focus()
  }, [selected])

  function selectCustomer(picked: Customer) {
    // Any search still in flight is now irrelevant.
    latestSearchRef.current++
    onSelect(picked)
    setSearching(false)
    setSearchError(null)
    setHighlightIndex(-1)
  }

  function clearSelection() {
    focusSearchOnClearRef.current = true
    onSelect(null)
    setSearch('')
    setHighlightIndex(-1)
  }

  function changeMode(next: CustomerMode) {
    onModeChange(next)
    if (next === 'new') {
      // Drop the picked customer, so the new-customer path can never submit
      // against a selection the owner has navigated away from.
      onSelect(null)
      setSearch('')
      setHighlightIndex(-1)
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return

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

  function updateNewCustomer(field: keyof NewCustomer, value: string) {
    onNewCustomerChange({ ...newCustomer, [field]: value })
  }

  const showNoMatches =
    !searching && !searchError && results.length === 0 && loadedAll

  return (
    <div className="booking-form-column">
      <h4 className="booking-form-column-title">Customer</h4>

      <fieldset className="customer-mode">
        <legend className="visually-hidden">Choose a customer</legend>
        <label className="radio-row">
          <input
            type="radio"
            name="customerMode"
            checked={mode === 'existing'}
            onChange={() => changeMode('existing')}
          />
          Existing customer
        </label>
        <label className="radio-row">
          <input
            type="radio"
            name="customerMode"
            checked={mode === 'new'}
            onChange={() => changeMode('new')}
          />
          New customer
        </label>
      </fieldset>

      {mode === 'existing' ? (
        selected ? (
          <div className="form-row">
            <span className="form-label">Booking for</span>
            <div className="customer-selected">
              <span>
                <strong>{selected.fullName}</strong>
                <span className="customer-option-meta">{selected.email}</span>
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
              aria-expanded={results.length > 0}
              aria-controls={LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={
                results.length > 0 && highlightIndex >= 0
                  ? optionId(highlightIndex)
                  : undefined
              }
              autoComplete="off"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                {search.trim()
                  ? `No customers match “${search.trim()}”. Switch to “New customer” to add them.`
                  : 'No customers yet. Switch to “New customer” to add the first one.'}
              </p>
            )}
            {results.length > 0 && (
              <div
                className="customer-results customer-results-scroll"
                id={LISTBOX_ID}
                role="listbox"
                aria-label="Customers"
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
            <label htmlFor="customerFirstName">Customer first name</label>
            <input
              id="customerFirstName"
              value={newCustomer.firstName}
              onChange={(e) => updateNewCustomer('firstName', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="customerLastName">Customer last name</label>
            <input
              id="customerLastName"
              value={newCustomer.lastName}
              onChange={(e) => updateNewCustomer('lastName', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="customerEmail">Customer email</label>
            <input
              id="customerEmail"
              type="email"
              value={newCustomer.email}
              onChange={(e) => updateNewCustomer('email', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="customerPhone">Customer phone (optional)</label>
            <input
              id="customerPhone"
              value={newCustomer.phone}
              onChange={(e) => updateNewCustomer('phone', e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  )
}
