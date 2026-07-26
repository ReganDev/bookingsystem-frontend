import { WEEKDAY_LABELS, buildMonthCells, dateKey } from '../lib/monthGrid'
import type { Booking } from '../types/api'

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MonthCalendar({
  year,
  month,
  bookingsByDay,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  compact = false,
}: {
  year: number
  month: number
  bookingsByDay: Map<string, Booking[]>
  selectedDay: Date
  onSelectDay: (day: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  compact?: boolean
}) {
  const today = new Date()
  const cells = buildMonthCells(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const todayKey = dateKey(today)
  const maxChips = compact ? 0 : 3

  return (
    <div className={`month-calendar${compact ? ' month-calendar-compact' : ''}`}>
      <div className="month-calendar-header">
        <h3 className="month-calendar-title">{monthLabel}</h3>
        <div className="actions-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onPrevMonth}
            aria-label="Previous month"
          >
            &larr;
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onToday}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onNextMonth}
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="calendar-grid booking-calendar-grid" role="grid" aria-label={monthLabel}>
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
          const isSelected = key === dateKey(selectedDay)
          const hasPending = dayBookings.some((b) => b.status === 'PENDING')

          if (!isCurrentMonth) {
            return (
              <div
                key={key}
                className="calendar-day other-month placeholder"
                aria-hidden="true"
              />
            )
          }

          return (
            <button
              key={key}
              type="button"
              className={[
                'calendar-day',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                dayBookings.length > 0 ? 'has-bookings' : '',
                hasPending ? 'has-pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDay(day)}
              aria-label={`${day.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}${dayBookings.length ? `, ${dayBookings.length} bookings` : ''}`}
              aria-pressed={isSelected}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              {compact ? (
                dayBookings.length > 0 && (
                  <span className="calendar-day-dot" aria-hidden="true">
                    {dayBookings.length}
                  </span>
                )
              ) : (
                <span className="calendar-day-chips">
                  {dayBookings.slice(0, maxChips).map((booking) => (
                    <span
                      key={booking.id}
                      className={`calendar-chip chip-${booking.status}`}
                      title={`${formatTime(booking.startDatetime)} ${booking.service.name}`}
                    >
                      {formatTime(booking.startDatetime)}{' '}
                      {booking.customer.firstName}
                    </span>
                  ))}
                  {dayBookings.length > maxChips && (
                    <span className="calendar-chip chip-more">
                      +{dayBookings.length - maxChips}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
