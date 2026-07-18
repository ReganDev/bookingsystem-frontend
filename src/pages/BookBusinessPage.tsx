import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import * as publicApi from '../api/public'
import { useAuth } from '../context/AuthContext'
import type { Booking, Business, Service, TimeSlot } from '../types/api'

function formatPrice(price?: number, currency = 'GBP') {
  if (price == null) return 'Price on request'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(price)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function BookBusinessPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isCustomer, user } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Booking | null>(null)

  const [serviceId, setServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  // Logged-in customers get their details filled in automatically
  useEffect(() => {
    if (isCustomer && user) {
      setCustomer({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? '',
      })
    }
  }, [isCustomer, user])

  const loadBusiness = useCallback(async () => {
    if (!slug) return

    setLoading(true)
    setError(null)

    try {
      const businessData = await publicApi.getBusinessBySlug(slug)
      const serviceList = await publicApi.getActiveServices(businessData.id)
      setBusiness(businessData)
      setServices(serviceList)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load this business.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadBusiness()
  }, [loadBusiness])

  const loadSlots = useCallback(async () => {
    if (!business || !serviceId || !selectedDate) {
      setSlots([])
      return
    }

    setSlotsLoading(true)
    setSelectedSlot('')

    try {
      const available = await publicApi.getAvailability(
        business.id,
        serviceId,
        selectedDate,
      )
      setSlots(available)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [business, serviceId, selectedDate])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!business || !selectedSlot) return

    setSubmitting(true)
    setError(null)

    try {
      const booking = await publicApi.createPublicBooking(business.id, {
        customer: {
          ...customer,
          phone: customer.phone || undefined,
        },
        serviceId,
        startDatetime: selectedSlot,
        customerNotes: customerNotes || undefined,
      })
      setConfirmation(booking)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err.status, err.body)
          : 'Unable to create booking. Please try again.'
      setError(message)
      // The slot may have been taken while the form was open
      loadSlots()
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date()
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + (business?.bookingAdvanceDays ?? 30))

  if (loading) {
    return (
      <div className="panel">
        <p>Loading…</p>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="panel">
        {error && <div className="error-banner">{error}</div>}
        <div className="empty-state">
          Business not found.{' '}
          <Link to="/book">Choose another business</Link>
        </div>
      </div>
    )
  }

  if (confirmation) {
    return (
      <div className="panel">
        <div className="success-banner">
          <h3>Booking requested</h3>
          <p>
            Your appointment with <strong>{business.name}</strong> for{' '}
            <strong>{confirmation.service.name}</strong> on{' '}
            {formatDateTime(confirmation.startDatetime)} has been submitted.
          </p>
          <p className="list-item-meta">Status: {confirmation.status}</p>
        </div>
        <div className="actions-row">
          <Link to="/book" className="btn btn-secondary">
            Book with another business
          </Link>
          <Link to={`/book/${business.slug}`} className="btn btn-primary">
            Book again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <Link to="/book" className="back-link">
        ← All businesses
      </Link>

      <div className="panel-header">
        <div>
          <h3>{business.name}</h3>
          {business.description && (
            <p className="panel-subtitle">{business.description}</p>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {services.length === 0 ? (
        <div className="empty-state">
          This business has no services available to book right now.
        </div>
      ) : (
        <form className="form-grid booking-form" onSubmit={handleSubmit}>
          <section className="form-section">
            <h4>1. Choose a service</h4>
            <div className="service-options">
              {services.map((service) => (
                <label
                  key={service.id}
                  className={`service-option ${
                    serviceId === service.id ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    value={service.id}
                    checked={serviceId === service.id}
                    onChange={() => setServiceId(service.id)}
                    required
                  />
                  <div>
                    <div className="service-option-name">{service.name}</div>
                    <div className="service-option-meta">
                      {service.durationMinutes} min ·{' '}
                      {formatPrice(
                        service.price,
                        business.currency ?? 'GBP',
                      )}
                    </div>
                    {service.description && (
                      <div className="service-option-description">
                        {service.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <h4>2. Pick a date & time</h4>
            <div className="form-row">
              <label htmlFor="appointmentDate">Appointment date</label>
              <input
                id="appointmentDate"
                type="date"
                value={selectedDate}
                min={toDateInputValue(today)}
                max={toDateInputValue(maxDate)}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>

            {!serviceId && selectedDate && (
              <p className="slot-hint">Choose a service to see available times.</p>
            )}

            {serviceId && selectedDate && (
              <div className="form-row">
                <span className="form-label">Available times</span>
                {slotsLoading ? (
                  <p className="slot-hint">Checking availability…</p>
                ) : slots.length === 0 ? (
                  <p className="slot-hint">
                    No available times on this date. Please try another day.
                  </p>
                ) : (
                  <div className="slot-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot.startDatetime}
                        type="button"
                        className={`slot-option ${
                          selectedSlot === slot.startDatetime ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedSlot(slot.startDatetime)}
                      >
                        {formatTime(slot.startDatetime)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="form-section">
            <h4>3. Your details</h4>
            <div className="form-row">
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
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
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
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
              <label htmlFor="email">Email</label>
              <input
                id="email"
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
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                value={customer.phone}
                onChange={(e) =>
                  setCustomer((current) => ({
                    ...current,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-row">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </div>
          </section>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting || !selectedSlot}
          >
            {submitting ? 'Submitting…' : 'Request booking'}
          </button>
        </form>
      )}
    </div>
  )
}
