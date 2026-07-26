import { useEffect, useMemo, useRef, useState } from 'react'
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

function parseDateTime(value: string) {
  if (!value) {
    return { date: '', time: '09:00' }
  }
  const [date, time = '09:00'] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

function combineDateTime(date: string, time: string) {
  if (!date || !time) return ''
  return `${date}T${time}`
}

export function formatDateTimeLabel(value: string) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type DateTimePickerModalProps = {
  open: boolean
  value: string
  onClose: () => void
  onConfirm: (value: string) => void
}

export function DateTimePickerModal({
  open,
  value,
  onClose,
  onConfirm,
}: DateTimePickerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const today = useMemo(() => new Date(), [])
  const parsed = parseDateTime(value)

  const initialDate = parsed.date
    ? new Date(`${parsed.date}T12:00:00`)
    : today

  const [year, setYear] = useState(initialDate.getFullYear())
  const [month, setMonth] = useState(initialDate.getMonth())
  const [selectedDate, setSelectedDate] = useState(parsed.date)
  const [selectedTime, setSelectedTime] = useState(parsed.time)

  useEffect(() => {
    if (!open) return
    const next = parseDateTime(value)
    const anchor = next.date ? new Date(`${next.date}T12:00:00`) : today
    setYear(anchor.getFullYear())
    setMonth(anchor.getMonth())
    setSelectedDate(next.date)
    setSelectedTime(next.time)
  }, [open, value, today])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const cells = buildMonthCells(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const todayKey = dateKey(today)
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth()

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  function isPast(day: Date) {
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    return day < startOfToday
  }

  function handleConfirm() {
    const combined = combineDateTime(selectedDate, selectedTime)
    if (!combined) return
    onConfirm(combined)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog datetime-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="datetime-picker-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h4 id="datetime-picker-title">Pick date & time</h4>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="datetime-picker-body">
          <div className="booking-calendar datetime-picker-calendar">
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
                const past = isPast(day)
                const selectable = inMonth && !past
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
                      selectable ? 'available' : 'unavailable',
                      isSelected ? 'selected' : '',
                      dateKey(day) === todayKey ? 'today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!selectable}
                    onClick={() => setSelectedDate(iso)}
                    aria-label={fullDateLabel(day)}
                    aria-pressed={isSelected}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="datetime-picker-time">
            <label htmlFor="pickerTime">Time</label>
            <input
              id="pickerTime"
              type="time"
              step={900}
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
              required
            />
            <p className="field-hint">
              {selectedDate
                ? fullDateLabel(new Date(`${selectedDate}T12:00:00`))
                : 'Choose a date from the calendar.'}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
