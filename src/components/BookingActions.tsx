import { useState } from 'react'
import type { Booking, BookingStatus, CancelScope } from '../types/api'

/**
 * Confirm / Complete / Cancel for one booking. Shared by the bookings list and
 * the calendar day detail, which previously carried identical copies.
 *
 * Cancelling an occurrence of a standing appointment asks whether the owner
 * means this one or the rest of the run; a one-off cancels with no extra click.
 */
export function BookingActions({
  booking,
  onStatusChange,
}: {
  booking: Booking
  onStatusChange: (
    bookingId: string,
    status: BookingStatus,
    scope?: CancelScope,
  ) => void
}) {
  const [confirmingScope, setConfirmingScope] = useState(false)

  const closed = booking.status === 'CANCELLED' || booking.status === 'COMPLETED'

  function cancel(scope?: CancelScope) {
    setConfirmingScope(false)
    onStatusChange(booking.id, 'CANCELLED', scope)
  }

  if (confirmingScope) {
    return (
      <div className="actions-row cancel-scope" role="group">
        <span className="cancel-scope-prompt">Cancel which bookings?</span>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => cancel('THIS_ONLY')}
        >
          This booking only
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => cancel('THIS_AND_FUTURE')}
        >
          This and all future
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setConfirmingScope(false)}
        >
          Keep it
        </button>
      </div>
    )
  }

  return (
    <div className="actions-row">
      {booking.status === 'PENDING' && (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onStatusChange(booking.id, 'CONFIRMED')}
        >
          Confirm
        </button>
      )}
      {!closed && (
        <>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onStatusChange(booking.id, 'COMPLETED')}
          >
            Complete
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() =>
              booking.seriesId ? setConfirmingScope(true) : cancel()
            }
          >
            Cancel
          </button>
        </>
      )}
    </div>
  )
}

/** Marks a booking that belongs to a standing appointment. */
export function SeriesBadge() {
  return (
    <span className="series-badge" title="Part of a repeating booking">
      ↻ Repeats
    </span>
  )
}
