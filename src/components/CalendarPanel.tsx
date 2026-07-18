import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiClientError } from '../api/client'
import * as bookingsApi from '../api/bookings'
import { WEEKDAY_LABELS, buildMonthCells, dateKey } from '../lib/monthGrid'
import type { Booking, BookingStatus } from '../types/api'

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CalendarPanel({
  businessId,
  token,
}: {
  businessId: string
  token: string
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMonth = useCallback(async () => {
    setLoading(true)
    setError(null)

    const cells = buildMonthCells(year, month)
    const rangeStart = cells[0]
    const rangeEnd = new Date(
      cells[cells.length - 1].getFullYear(),
      cells[cells.length - 1].getMonth(),
      cells[cells.length - 1].getDate() + 1,
    )

    try {
      const result = await bookingsApi.getBookingsInRange(
        businessId,
        rangeStart.toISOString(),
        rangeEnd.toISOString(),
        token,
      )
      setBookings(result)
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to load calendar.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [businessId, token, year, month])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const booking of bookings) {
      const key = dateKey(new Date(booking.startDatetime))
      const list = map.get(key) ?? []
      list.push(booking)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() -
          new Date(b.startDatetime).getTime(),
      )
    }
    return map
  }, [bookings])

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setSelectedDay(null)
  }

  async function handleStatusChange(bookingId: string, status: BookingStatus) {
    try {
      await bookingsApi.updateBookingStatus(
        businessId,
        bookingId,
        status,
        token,
        status === 'CANCELLED' ? 'Cancelled from calendar' : undefined,
      )
      await loadMonth()
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to update booking status.'
      setError(message)
    }
  }

  const cells = buildMonthCells(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const todayKey = dateKey(today)
  const selectedBookings = selectedDay
    ? (bookingsByDay.get(dateKey(selectedDay)) ?? [])
    : []

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{monthLabel}</h3>
        <div className="actions-row">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            &larr; Prev
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setYear(today.getFullYear())
              setMonth(today.getMonth())
              setSelectedDay(today)
            }}
          >
            Today
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="calendar-grid" role="grid" aria-label={monthLabel}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}
        {cells.map((day) => {
          const key = dateKey(day)
          const dayBookings = bookingsByDay.get(key) ?? []
          const isCurrentMonth = day.getMonth() === month
          const isToday = key === todayKey
          const isSelected = selectedDay && key === dateKey(selectedDay)

          return (
            <button
              key={key}
              className={[
                'calendar-day',
                isCurrentMonth ? '' : 'other-month',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                dayBookings.length > 0 ? 'has-bookings' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedDay(day)}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              <span className="calendar-day-chips">
                {dayBookings.slice(0, 3).map((booking) => (
                  <span
                    key={booking.id}
                    className={`calendar-chip chip-${booking.status}`}
                    title={`${formatTime(booking.startDatetime)} ${booking.service.name}`}
                  >
                    {formatTime(booking.startDatetime)}{' '}
                    {booking.customer.firstName}
                  </span>
                ))}
                {dayBookings.length > 3 && (
                  <span className="calendar-chip chip-more">
                    +{dayBookings.length - 3} more
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {loading && <p className="slot-hint">Loading bookings…</p>}

      {selectedDay && (
        <div className="calendar-day-detail">
          <h4>
            {selectedDay.toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h4>
          {selectedBookings.length === 0 ? (
            <p className="slot-hint">No bookings on this day.</p>
          ) : (
            <div className="list">
              {selectedBookings.map((booking) => (
                <div key={booking.id} className="list-item">
                  <div className="list-item-title">
                    {formatTime(booking.startDatetime)} &ndash;{' '}
                    {formatTime(booking.endDatetime)} · {booking.service.name}
                  </div>
                  <div className="list-item-meta">
                    {booking.customer.firstName} {booking.customer.lastName}
                    {booking.customer.phone ? ` · ${booking.customer.phone}` : ''}
                  </div>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                  <div className="actions-row">
                    {booking.status === 'PENDING' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          handleStatusChange(booking.id, 'CONFIRMED')
                        }
                      >
                        Confirm
                      </button>
                    )}
                    {booking.status !== 'CANCELLED' &&
                      booking.status !== 'COMPLETED' && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              handleStatusChange(booking.id, 'COMPLETED')
                            }
                          >
                            Complete
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              handleStatusChange(booking.id, 'CANCELLED')
                            }
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
      )}
    </div>
  )
}
