import { useEffect, useState, type FormEvent } from 'react'
import { ApiClientError } from '../api/client'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import * as usersApi from '../api/users'
import {
  CustomerPicker,
  EMPTY_CUSTOMER,
  type CustomerMode,
  type NewCustomer,
} from './CustomerPicker'
import { DateTimePickerField } from './DateTimePickerField'
import { RecurrenceFields, MAX_OCCURRENCES, MIN_OCCURRENCES } from './RecurrenceFields'
import { frequencyForUnit, type RecurrenceUnit } from '../lib/recurrence'
import type {
  Customer,
  Service,
  SkippedOccurrence,
  StaffMember,
} from '../types/api'

const DEFAULT_OCCURRENCES = 12

type SeriesResult = {
  createdCount: number
  requestedCount: number
  skipped: SkippedOccurrence[]
}

function formatSkipped(startDatetime: string) {
  return new Date(startDatetime).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

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
  const [staffId, setStaffId] = useState('')
  const [startDatetime, setStartDatetime] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seriesResult, setSeriesResult] = useState<SeriesResult | null>(null)

  // Repeat clients are the common case for an owner-made booking, so the
  // picker opens on the existing list rather than an empty new-customer form.
  const [customerMode, setCustomerMode] = useState<CustomerMode>('existing')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState<NewCustomer>(EMPTY_CUSTOMER)

  const [staff, setStaff] = useState<StaffMember[]>([])

  const [repeats, setRepeats] = useState(false)
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('weeks')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [occurrenceCount, setOccurrenceCount] = useState(DEFAULT_OCCURRENCES)

  // A business that has never set "accepts bookings" gets no staff at all; the
  // picker then stays hidden and bookings remain business-wide, as before.
  useEffect(() => {
    let active = true
    usersApi
      .getStaff(businessId, token)
      .then((members) => {
        if (active) setStaff(members)
      })
      .catch(() => {
        if (active) setStaff([])
      })
    return () => {
      active = false
    }
  }, [businessId, token])

  function resetForm() {
    setNewCustomer(EMPTY_CUSTOMER)
    setCustomerNotes('')
    setStartDatetime('')
    setServiceId('')
    setStaffId('')
    setSelectedCustomer(null)
    setRepeats(false)
    setRecurrenceUnit('weeks')
    setRecurrenceInterval(1)
    setOccurrenceCount(DEFAULT_OCCURRENCES)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!startDatetime) {
      setError('Pick a date and time for the booking.')
      return
    }

    if (customerMode === 'existing' && !selectedCustomer) {
      setError('Pick a customer from the list, or switch to “New customer”.')
      return
    }

    if (
      repeats &&
      (occurrenceCount < MIN_OCCURRENCES || occurrenceCount > MAX_OCCURRENCES)
    ) {
      setError(
        `A repeating booking needs between ${MIN_OCCURRENCES} and ${MAX_OCCURRENCES} bookings.`,
      )
      return
    }

    if (repeats) {
      const maxInterval = recurrenceUnit === 'weeks' ? 52 : 12
      const minInterval = 1
      if (
        recurrenceInterval < minInterval ||
        recurrenceInterval > maxInterval
      ) {
        setError(
          recurrenceUnit === 'weeks'
            ? 'Repeat interval must be between 1 and 52 weeks.'
            : 'Repeat interval must be between 1 and 12 months.',
        )
        return
      }
    }

    setSubmitting(true)
    setError(null)
    setSeriesResult(null)

    try {
      // A customer picked from the list already has an id, so there is nothing
      // to look up and no way to write a duplicate contact.
      const customerId =
        customerMode === 'existing' && selectedCustomer
          ? selectedCustomer.id
          : (
              await customersApi.getOrCreateCustomer(
                businessId,
                { ...newCustomer, phone: newCustomer.phone || undefined },
                token,
              )
            ).id

      const start = new Date(startDatetime)
      const offset = start.toISOString()

      const base = {
        customerId,
        serviceId,
        staffId: staffId || undefined,
        startDatetime: offset,
        customerNotes: customerNotes || undefined,
      }

      if (repeats) {
        const frequency = frequencyForUnit(recurrenceUnit)
        const result = await bookingsApi.createRecurringBookings(
          businessId,
          {
            ...base,
            frequency,
            occurrenceCount,
            intervalWeeks:
              recurrenceUnit === 'weeks' ? recurrenceInterval : undefined,
            intervalMonths:
              recurrenceUnit === 'months' ? recurrenceInterval : undefined,
          },
          token,
        )
        resetForm()
        // Stay put: navigating away would throw away the report of which
        // occurrences clashed and were skipped.
        setSeriesResult({
          createdCount: result.created.length,
          requestedCount: occurrenceCount,
          skipped: result.skipped,
        })
        await onCreated()
        return
      }

      await bookingsApi.createBooking(businessId, base, token)
      resetForm()
      await onCreated()
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to create booking.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const activeServices = services.filter((service) => service.isActive)
  const selectedService = activeServices.find((s) => s.id === serviceId)
  const customerLabel =
    customerMode === 'existing'
      ? selectedCustomer?.fullName
      : [newCustomer.firstName, newCustomer.lastName].filter(Boolean).join(' ')

  const summary = [
    customerLabel,
    selectedService?.name,
    startDatetime
      ? new Date(startDatetime).toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null,
    repeats ? `× ${occurrenceCount}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>New booking</h3>
      </div>

      {activeServices.length === 0 ? (
        <div className="empty-state">
          <strong>Add a service first</strong>
          <p>
            Bookings are always for a service. Go to the “Services” tab and add
            one, then come back here.
          </p>
        </div>
      ) : (
        <>
          {error && <div className="error-banner">{error}</div>}

          {seriesResult && (
            <div className="success-banner" role="status">
              <strong>
                Created {seriesResult.createdCount} of{' '}
                {seriesResult.requestedCount} bookings.
              </strong>
              {seriesResult.skipped.length > 0 && (
                <>
                  {' '}
                  Skipped{' '}
                  {seriesResult.skipped
                    .map((occurrence) => formatSkipped(occurrence.startDatetime))
                    .join(', ')}{' '}
                  — already booked.
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="booking-form-grid">
              <CustomerPicker
                businessId={businessId}
                token={token}
                mode={customerMode}
                onModeChange={(mode) => {
                  setCustomerMode(mode)
                  setError(null)
                }}
                selected={selectedCustomer}
                onSelect={(customer) => {
                  setSelectedCustomer(customer)
                  if (customer) setError(null)
                }}
                newCustomer={newCustomer}
                onNewCustomerChange={setNewCustomer}
              />

              <div className="booking-form-column">
                <h4 className="booking-form-column-title">Details</h4>

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

                {staff.length > 0 && (
                  <fieldset className="customer-mode">
                    <legend>Staff</legend>
                    <label className="radio-row">
                      <input
                        type="radio"
                        name="staff"
                        checked={staffId === ''}
                        onChange={() => setStaffId('')}
                      />
                      Any
                    </label>
                    {staff.map((member) => (
                      <label className="radio-row" key={member.id}>
                        <input
                          type="radio"
                          name="staff"
                          checked={staffId === member.id}
                          onChange={() => setStaffId(member.id)}
                        />
                        {member.fullName}
                      </label>
                    ))}
                  </fieldset>
                )}

                <DateTimePickerField
                  id="startDatetime"
                  label="Date & time"
                  value={startDatetime}
                  onChange={setStartDatetime}
                  required
                />

                <RecurrenceFields
                  repeats={repeats}
                  onRepeatsChange={setRepeats}
                  unit={recurrenceUnit}
                  onUnitChange={setRecurrenceUnit}
                  interval={recurrenceInterval}
                  onIntervalChange={setRecurrenceInterval}
                  occurrenceCount={occurrenceCount}
                  onOccurrenceCountChange={setOccurrenceCount}
                  startDatetime={startDatetime}
                />

                <div className="form-row">
                  <label htmlFor="notes">Notes (optional)</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="booking-form-footer">
              <p className="booking-form-summary">{summary}</p>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Creating…'
                  : repeats
                    ? `Create ${occurrenceCount} bookings`
                    : 'Create booking'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
