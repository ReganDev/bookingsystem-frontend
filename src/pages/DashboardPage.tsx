import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiClientError } from '../api/client'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import * as servicesApi from '../api/services'
import { useAuth } from '../context/AuthContext'
import type { Booking, BookingStatus, Service } from '../types/api'

type Tab = 'bookings' | 'services' | 'new-booking'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatPrice(price?: number, currency = 'USD') {
  if (price == null) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(price)
}

export function DashboardPage() {
  const { business, accessToken } = useAuth()
  const [tab, setTab] = useState<Tab>('bookings')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const businessId = business?.id
  const token = accessToken

  const loadData = useCallback(async () => {
    if (!businessId || !token) return

    setLoading(true)
    setError(null)

    try {
      const [bookingsPage, serviceList] = await Promise.all([
        bookingsApi.getBookings(businessId, token),
        servicesApi.getServices(businessId, token),
      ])
      setBookings(bookingsPage.content)
      setServices(serviceList)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load dashboard data.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [businessId, token])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleStatusChange(bookingId: string, status: BookingStatus) {
    if (!businessId || !token) return

    try {
      await bookingsApi.updateBookingStatus(
        businessId,
        bookingId,
        status,
        token,
        status === 'CANCELLED' ? 'Cancelled from dashboard' : undefined,
      )
      await loadData()
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to update booking status.'
      setError(message)
    }
  }

  return (
    <>
      <div className="tabs">
        <button
          className={`tab ${tab === 'bookings' ? 'active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          Bookings
        </button>
        <button
          className={`tab ${tab === 'services' ? 'active' : ''}`}
          onClick={() => setTab('services')}
        >
          Services
        </button>
        <button
          className={`tab ${tab === 'new-booking' ? 'active' : ''}`}
          onClick={() => setTab('new-booking')}
        >
          New booking
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="panel">
          <p>Loading…</p>
        </div>
      ) : (
        <>
          {tab === 'bookings' && (
            <BookingsPanel
              bookings={bookings}
              currency={business?.currency}
              onStatusChange={handleStatusChange}
            />
          )}
          {tab === 'services' && (
            <ServicesPanel
              services={services}
              businessId={businessId!}
              token={token!}
              onCreated={loadData}
            />
          )}
          {tab === 'new-booking' && (
            <NewBookingPanel
              services={services}
              businessId={businessId!}
              token={token!}
              onCreated={async () => {
                await loadData()
                setTab('bookings')
              }}
            />
          )}
        </>
      )}
    </>
  )
}

function BookingsPanel({
  bookings,
  currency,
  onStatusChange,
}: {
  bookings: Booking[]
  currency?: string
  onStatusChange: (bookingId: string, status: BookingStatus) => void
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Upcoming bookings</h3>
        <span>{bookings.length} total</span>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">No bookings yet. Create your first one.</div>
      ) : (
        <div className="list">
          {bookings.map((booking) => (
            <div key={booking.id} className="list-item">
              <div className="list-item-title">
                {booking.service.name} · {booking.customer.firstName}{' '}
                {booking.customer.lastName}
              </div>
              <div className="list-item-meta">
                {formatDateTime(booking.startDatetime)} ·{' '}
                {formatPrice(booking.price, currency)}
              </div>
              <span className={`status-badge status-${booking.status}`}>
                {booking.status}
              </span>
              {booking.customerNotes && (
                <div className="list-item-meta">Note: {booking.customerNotes}</div>
              )}
              <div className="actions-row">
                {booking.status === 'PENDING' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onStatusChange(booking.id, 'CONFIRMED')}
                  >
                    Confirm
                  </button>
                )}
                {booking.status !== 'CANCELLED' &&
                  booking.status !== 'COMPLETED' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onStatusChange(booking.id, 'COMPLETED')}
                      >
                        Complete
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onStatusChange(booking.id, 'CANCELLED')}
                      >
                        Cancel
                      </button>
                    </>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ServicesPanel({
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
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await servicesApi.createService(
        businessId,
        {
          name,
          description: description || undefined,
          durationMinutes,
          price: price ? Number(price) : undefined,
          color: '#3B82F6',
          isActive: true,
        },
        token,
      )
      setName('')
      setDescription('')
      setPrice('')
      setDurationMinutes(30)
      setShowForm(false)
      await onCreated()
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to create service.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Services</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? 'Close' : 'Add service'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {services.length === 0 ? (
        <div className="empty-state">No services yet. Add one to get started.</div>
      ) : (
        <div className="list">
          {services.map((service) => (
            <div key={service.id} className="list-item">
              <div className="list-item-title">{service.name}</div>
              <div className="list-item-meta">
                {service.durationMinutes} min ·{' '}
                {service.price != null ? `$${service.price}` : 'No price set'}
              </div>
              {service.description && (
                <div className="list-item-meta">{service.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="serviceName">Name</label>
            <input
              id="serviceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="duration">Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              min={5}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="price">Price (optional)</label>
            <input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save service'}
          </button>
        </form>
      )}
    </div>
  )
}

function NewBookingPanel({
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const createdCustomer = await customersApi.createCustomer(
        businessId,
        {
          ...customer,
          phone: customer.phone || undefined,
        },
        token,
      )

      const start = new Date(startDatetime)
      const offset = start.toISOString()

      await bookingsApi.createBooking(
        businessId,
        {
          customerId: createdCustomer.id,
          serviceId,
          startDatetime: offset,
          customerNotes: customerNotes || undefined,
        },
        token,
      )

      setCustomer({ firstName: '', lastName: '', email: '', phone: '' })
      setCustomerNotes('')
      setStartDatetime('')
      setServiceId('')
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

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>New booking</h3>
      </div>

      {activeServices.length === 0 ? (
        <div className="empty-state">
          Add at least one active service before creating bookings.
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
            <div className="form-row">
              <label htmlFor="customerFirstName">Customer first name</label>
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
              <label htmlFor="customerPhone">Customer phone (optional)</label>
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
            <div className="form-row">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create booking'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
