import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import * as publicApi from '../api/public'
import { BookingCalendar } from '../components/BookingCalendar'
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

function formatDayHeading(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
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
            <strong>{formatDateTime(confirmation.startDatetime)}</strong> has
            been sent.
          </p>
        </div>
        <p className="panel-subtitle">
          {business.name} will confirm your appointment. You&apos;ll hear back
          at <strong>{confirmation.customer.email}</strong>. There&apos;s
          nothing else you need to do.
        </p>
        <div className="actions-row">
          <Link to="/book" className="btn btn-secondary">
            Book with another business
          </Link>
          <Link to={`/book/${business.slug}`} className="btn btn-primary">
            Make another booking
          </Link>
        </div>
      </div>
    )
  }

  const selectedService = services.find((service) => service.id === serviceId)

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
            <h4>2. Pick a day</h4>
            {!serviceId ? (
              <p className="slot-hint">
                Choose a service first and we&apos;ll show you the days with
                free appointments.
              </p>
            ) : (
              <BookingCalendar
                businessId={business.id}
                serviceId={serviceId}
                advanceDays={business.bookingAdvanceDays ?? 30}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            )}
          </section>

          {serviceId && selectedDate && (
            <section className="form-section">
              <h4>3. Pick a time</h4>
              <div className="form-row">
                <span className="form-label">
                  Times for {formatDayHeading(selectedDate)}
                </span>
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
            </section>
          )}

          <section className="form-section">
            <h4>4. Your details</h4>
            {isCustomer && (
              <p className="slot-hint">
                We&apos;ve filled these in from your account. Change anything
                that&apos;s not right.
              </p>
            )}
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

          {selectedService && selectedSlot && (
            <div className="booking-summary">
              <strong>{selectedService.name}</strong> ·{' '}
              {formatDayHeading(selectedDate)} at {formatTime(selectedSlot)} ·{' '}
              {formatPrice(selectedService.price, business.currency ?? 'GBP')}
            </div>
          )}

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
