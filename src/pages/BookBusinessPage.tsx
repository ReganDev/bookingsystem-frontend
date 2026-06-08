import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import * as publicApi from '../api/public'
import type { Booking, Business, Service } from '../types/api'

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

export function BookBusinessPage() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Booking | null>(null)

  const [serviceId, setServiceId] = useState('')
  const [startDatetime, setStartDatetime] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

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

  async function handleSubmit(event: FormEvent) {
    if (!business) return

    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const start = new Date(startDatetime)
      const booking = await publicApi.createPublicBooking(business.id, {
        customer: {
          ...customer,
          phone: customer.phone || undefined,
        },
        serviceId,
        startDatetime: start.toISOString(),
        customerNotes: customerNotes || undefined,
      })
      setConfirmation(booking)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err.status, err.body)
          : 'Unable to create booking. Please try again.'
      setError(message)
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
              <label htmlFor="startDatetime">Appointment time</label>
              <input
                id="startDatetime"
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                required
              />
            </div>
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

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Request booking'}
          </button>
        </form>
      )}
    </div>
  )
}
