import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiClientError } from '../api/client'
import * as bookingsApi from '../api/bookings'
import * as customersApi from '../api/customers'
import * as schedulesApi from '../api/schedules'
import * as servicesApi from '../api/services'
import { CalendarPanel } from '../components/CalendarPanel'
import { OpeningHoursPanel } from '../components/OpeningHoursPanel'
import { PhotosPanel } from '../components/PhotosPanel'
import { useAuth } from '../context/AuthContext'
import type { Booking, BookingStatus, Service } from '../types/api'

type Tab =
  | 'bookings'
  | 'calendar'
  | 'services'
  | 'opening-hours'
  | 'new-booking'
  | 'photos'

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  bookings:
    'Appointments your customers have made. Confirm, complete, or cancel them here.',
  calendar:
    'Your bookings laid out by month. Click a day to see its appointments.',
  services:
    'The treatments or appointments customers can book. Each needs a name and how long it takes.',
  'opening-hours':
    'The days and times you accept bookings. Customers can only pick slots inside these hours.',
  'new-booking':
    'Add a booking yourself, useful for phone or walk-in customers.',
  photos:
    'Photos shown next to your booking form. Upload images to show off your business.',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatPrice(price?: number, currency = 'GBP') {
  if (price == null) return '-'
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
  const [hasOpeningHours, setHasOpeningHours] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const businessId = business?.id
  const token = accessToken

  const loadData = useCallback(async () => {
    if (!businessId || !token) return

    setLoading(true)
    setError(null)

    try {
      const [bookingsPage, serviceList, scheduleList] = await Promise.all([
        bookingsApi.getBookings(businessId, token),
        servicesApi.getServices(businessId, token),
        schedulesApi.getSchedules(businessId, token),
      ])
      setBookings(bookingsPage.content)
      setServices(serviceList)
      setHasOpeningHours(scheduleList.length > 0)
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

  const setupComplete = services.length > 0 && hasOpeningHours

  return (
    <>
      {!loading && !setupComplete && (
        <div className="onboarding">
          <h3>Getting started</h3>
          <p>
            Two quick steps and customers will be able to book with you online.
          </p>
          <ol className="onboarding-steps">
            <li
              className={`onboarding-step ${services.length > 0 ? 'done' : ''}`}
            >
              <span className="step-marker">
                {services.length > 0 ? '✓' : '1'}
              </span>
              <span className="step-text">
                {services.length > 0 ? (
                  'Add a service (done!)'
                ) : (
                  <>
                    <button
                      className="step-link"
                      onClick={() => setTab('services')}
                    >
                      Add your first service
                    </button>
                    , e.g. “Haircut, 30 minutes”
                  </>
                )}
              </span>
            </li>
            <li className={`onboarding-step ${hasOpeningHours ? 'done' : ''}`}>
              <span className="step-marker">{hasOpeningHours ? '✓' : '2'}</span>
              <span className="step-text">
                {hasOpeningHours ? (
                  'Set your opening hours (done!)'
                ) : (
                  <>
                    <button
                      className="step-link"
                      onClick={() => setTab('opening-hours')}
                    >
                      Set your opening hours
                    </button>
                    , the days and times customers can book
                  </>
                )}
              </span>
            </li>
          </ol>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${tab === 'bookings' ? 'active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          Bookings
        </button>
        <button
          className={`tab ${tab === 'calendar' ? 'active' : ''}`}
          onClick={() => setTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`tab ${tab === 'services' ? 'active' : ''}`}
          onClick={() => setTab('services')}
        >
          Services
        </button>
        <button
          className={`tab ${tab === 'opening-hours' ? 'active' : ''}`}
          onClick={() => setTab('opening-hours')}
        >
          Opening hours
        </button>
        <button
          className={`tab ${tab === 'new-booking' ? 'active' : ''}`}
          onClick={() => setTab('new-booking')}
        >
          New booking
        </button>
        <button
          className={`tab ${tab === 'photos' ? 'active' : ''}`}
          onClick={() => setTab('photos')}
        >
          Photos
        </button>
      </div>

      <p className="tab-description">{TAB_DESCRIPTIONS[tab]}</p>

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
          {tab === 'calendar' && (
            <CalendarPanel businessId={businessId!} token={token!} />
          )}
          {tab === 'services' && (
            <ServicesPanel
              services={services}
              currency={business?.currency}
              businessId={businessId!}
              token={token!}
              onCreated={loadData}
            />
          )}
          {tab === 'opening-hours' && (
            <OpeningHoursPanel
              businessId={businessId!}
              token={token!}
              onSaved={loadData}
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
          {tab === 'photos' && (
            <PhotosPanel businessId={businessId!} token={token!} />
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
        <div className="empty-state">
          <strong>No bookings yet</strong>
          <p>
            Bookings made by customers (or by you in the “New booking” tab)
            will appear here. Share your booking page with customers to get
            started.
          </p>
        </div>
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
  currency,
  businessId,
  token,
  onCreated,
}: {
  services: Service[]
  currency?: string
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
        <div className="empty-state">
          <strong>No services yet</strong>
          <p>
            A service is anything a customer can book, for example “Haircut,
            30 minutes, £25”. Click “Add service” above to create your first
            one.
          </p>
        </div>
      ) : (
        <div className="list">
          {services.map((service) => (
            <div key={service.id} className="list-item">
              <div className="list-item-title">{service.name}</div>
              <div className="list-item-meta">
                {service.durationMinutes} min ·{' '}
                {service.price != null
                  ? formatPrice(service.price, currency)
                  : 'No price set'}
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
      const createdCustomer = await customersApi.getOrCreateCustomer(
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
