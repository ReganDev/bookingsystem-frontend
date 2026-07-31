import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiClientError } from '../api/client'
import * as bookingsApi from '../api/bookings'
import { buildMonthCells, dateKey, toISODate } from '../lib/monthGrid'
import { groupBookingsByDay } from '../lib/groupBookingsByDay'
import { BookingCard } from './BookingCard'
import { MonthCalendar } from './MonthCalendar'
import { NewBookingModal } from './NewBookingModal'
import type { Booking, BookingStatus, CancelScope, Service } from '../types/api'

type DayFilter = 'all' | 'pending'

function formatDayHeading(day: Date) {
  const today = new Date()
  const isToday = dateKey(day) === dateKey(today)
  const datePart = day.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return isToday ? `Today · ${datePart}` : datePart
}

export function BookingsPanel({
  businessId,
  token,
  currency,
  services,
  onStatusChange,
}: {
  businessId: string
  token: string
  currency?: string
  services: Service[]
  onStatusChange?: (
    bookingId: string,
    status: BookingStatus,
    scope?: CancelScope,
  ) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const dayPanelRef = useRef<HTMLElement>(null)

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
        err instanceof ApiClientError ? err.message : 'Failed to load bookings.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [businessId, token, year, month])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const bookingsByDay = useMemo(() => groupBookingsByDay(bookings), [bookings])

  const todayBookings = bookingsByDay.get(dateKey(today)) ?? []
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length

  const selectedBookings = useMemo(() => {
    const list = bookingsByDay.get(dateKey(selectedDay)) ?? []
    if (dayFilter === 'pending') {
      return list.filter((b) => b.status === 'PENDING')
    }
    return list
  }, [bookingsByDay, selectedDay, dayFilter])

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  function goToToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today)
  }

  function handleSelectDay(day: Date) {
    setSelectedDay(day)
    // On phones the day list sits below the calendar; without this a tap
    // appears to do nothing because the update happens off-screen.
    if (window.matchMedia?.('(max-width: 768px)').matches) {
      dayPanelRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    }
  }

  async function handleCreated(createdStartIso?: string) {
    if (!createdStartIso) {
      await loadMonth()
      return
    }
    const created = new Date(createdStartIso)
    setSelectedDay(created)
    if (created.getFullYear() === year && created.getMonth() === month) {
      await loadMonth()
    } else {
      // Changing year/month re-runs loadMonth via its effect; calling it
      // directly here would fetch the old month from the stale closure.
      setYear(created.getFullYear())
      setMonth(created.getMonth())
    }
  }

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  async function handleStatusChange(
    bookingId: string,
    status: BookingStatus,
    scope?: CancelScope,
  ) {
    try {
      await bookingsApi.updateBookingStatus(
        businessId,
        bookingId,
        status,
        token,
        status === 'CANCELLED' ? 'Cancelled from dashboard' : undefined,
        scope,
      )
      await loadMonth()
      onStatusChange?.(bookingId, status, scope)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to update booking status.'
      setError(message)
    }
  }

  const summaryParts: string[] = []
  if (todayBookings.length > 0) {
    summaryParts.push(
      `${todayBookings.length} today`,
    )
  } else {
    summaryParts.push('No bookings today')
  }
  if (pendingCount > 0) {
    summaryParts.push(
      `${pendingCount} need confirmation`,
    )
  }

  return (
    <div className="panel bookings-panel">
      <div className="panel-header">
        <h3>Calendar</h3>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowNewBooking(true)}
        >
          New booking
        </button>
      </div>

      <div className="bookings-summary" aria-live="polite">
        {summaryParts.join(' · ')}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="bookings-split">
        <aside className="bookings-sidebar">
          <MonthCalendar
            year={year}
            month={month}
            bookingsByDay={bookingsByDay}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            onPrevMonth={() => changeMonth(-1)}
            onNextMonth={() => changeMonth(1)}
            onToday={goToToday}
          />
        </aside>

        <section
          ref={dayPanelRef}
          className="bookings-day-panel"
          aria-labelledby="bookings-day-heading"
        >
          <header className="bookings-day-header">
            <h3 id="bookings-day-heading">{formatDayHeading(selectedDay)}</h3>
            <div className="bookings-day-filters" role="group" aria-label="Filter bookings">
              <button
                type="button"
                className={`filter-pill${dayFilter === 'all' ? ' active' : ''}`}
                onClick={() => setDayFilter('all')}
                aria-pressed={dayFilter === 'all'}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-pill${dayFilter === 'pending' ? ' active' : ''}`}
                onClick={() => setDayFilter('pending')}
                aria-pressed={dayFilter === 'pending'}
              >
                Pending
              </button>
            </div>
          </header>

          {loading ? (
            <p className="slot-hint">Loading bookings…</p>
          ) : selectedBookings.length === 0 ? (
            <div className="empty-state bookings-day-empty">
              <strong>No bookings on this day</strong>
              <p>
                {dayFilter === 'pending'
                  ? 'Nothing waiting for confirmation on this day.'
                  : 'Select another day on the calendar, or use the New booking button above to add one.'}
              </p>
            </div>
          ) : (
            <div className="bookings-day-list">
              {selectedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  currency={currency}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showNewBooking && (
        <NewBookingModal
          businessId={businessId}
          token={token}
          services={services}
          initialPickerDate={
            selectedDay >= startOfToday ? toISODate(selectedDay) : undefined
          }
          onCreated={handleCreated}
          onClose={() => setShowNewBooking(false)}
        />
      )}
    </div>
  )
}
