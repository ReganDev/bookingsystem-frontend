import { useEffect, useMemo, useState } from 'react'
import * as publicApi from '../api/public'
import {
  WEEKDAY_LABELS,
  buildMonthCells,
  dateKey,
  toISODate,
} from '../lib/monthGrid'

function fullDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Month calendar for customers: only days where the business actually has
 *  bookable slots for the chosen service are selectable. */
export function BookingCalendar({
  businessId,
  serviceId,
  advanceDays,
  selectedDate,
  onSelect,
}: {
  businessId: string
  serviceId: string
  advanceDays: number
  selectedDate: string
  onSelect: (isoDate: string) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    publicApi
      .getAvailableDays(businessId, serviceId, monthParam)
      .then((days) => {
        if (!cancelled) setAvailableDays(new Set(days))
      })
      .catch(() => {
        if (!cancelled) setAvailableDays(new Set())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, serviceId, monthParam])

  const lastBookableDay = useMemo(() => {
    const limit = new Date(today)
    limit.setDate(limit.getDate() + advanceDays)
    return limit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceDays])

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth()
  const nextMonthStart = new Date(year, month + 1, 1)

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const cells = buildMonthCells(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const todayKey = dateKey(today)

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-header">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => changeMonth(-1)}
          disabled={isCurrentMonth}
          aria-label="Previous month"
        >
          &larr;
        </button>
        <span className="booking-calendar-month">{monthLabel}</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => changeMonth(1)}
          disabled={nextMonthStart > lastBookableDay}
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>

      <div className="calendar-grid booking-calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}
        {cells.map((day) => {
          const iso = toISODate(day)
          const inMonth = day.getMonth() === month
          const available = inMonth && availableDays.has(iso)
          const isSelected = selectedDate === iso

          if (!inMonth) {
            return <div key={iso} className="booking-day placeholder" />
          }

          return (
            <button
              key={iso}
              type="button"
              className={[
                'booking-day',
                available ? 'available' : '',
                isSelected ? 'selected' : '',
                dateKey(day) === todayKey ? 'today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!available}
              onClick={() => onSelect(iso)}
              aria-label={fullDateLabel(day)}
              aria-pressed={isSelected}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      <p className="slot-hint">
        {loading
          ? 'Checking availability…'
          : availableDays.size === 0
            ? 'No availability this month. Try the next one.'
            : 'Highlighted days have appointments available.'}
      </p>
    </div>
  )
}
