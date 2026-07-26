import { BookingActions, SeriesBadge } from './BookingActions'
import type { Booking, BookingStatus, CancelScope } from '../types/api'

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price?: number, currency = 'GBP') {
  if (price == null) return null
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(price)
}

export function BookingCard({
  booking,
  currency,
  onStatusChange,
}: {
  booking: Booking
  currency?: string
  onStatusChange: (
    bookingId: string,
    status: BookingStatus,
    scope?: CancelScope,
  ) => void
}) {
  const price = formatPrice(booking.price, currency)

  return (
    <article className="booking-card">
      <div className="booking-card-time">
        <span className="booking-card-time-start">
          {formatTime(booking.startDatetime)}
        </span>
        <span className="booking-card-time-end">
          {formatTime(booking.endDatetime)}
        </span>
      </div>
      <div className="booking-card-body">
        <div className="booking-card-title">{booking.service.name}</div>
        <div className="booking-card-meta">
          {booking.customer.firstName} {booking.customer.lastName}
          {booking.customer.phone && ` · ${booking.customer.phone}`}
          {price && ` · ${price}`}
        </div>
        <div className="booking-card-badges">
          <span className={`status-badge status-${booking.status}`}>
            {booking.status}
          </span>
          {booking.seriesId && <SeriesBadge />}
        </div>
        {booking.customerNotes && (
          <p className="booking-card-note">Note: {booking.customerNotes}</p>
        )}
        <BookingActions booking={booking} onStatusChange={onStatusChange} />
      </div>
    </article>
  )
}
