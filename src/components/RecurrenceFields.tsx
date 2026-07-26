import {
  describeSeries,
  frequencyForUnit,
  MAX_INTERVAL_MONTHS,
  MAX_INTERVAL_WEEKS,
  MAX_SERIES_LENGTH,
  MIN_INTERVAL_MONTHS,
  MIN_INTERVAL_WEEKS,
  MIN_SERIES_LENGTH,
  type RecurrenceUnit,
} from '../lib/recurrence'

export const MIN_OCCURRENCES = MIN_SERIES_LENGTH
export const MAX_OCCURRENCES = MAX_SERIES_LENGTH

export type { RecurrenceUnit }

function intervalInRange(unit: RecurrenceUnit, interval: number) {
  if (unit === 'weeks') {
    return interval >= MIN_INTERVAL_WEEKS && interval <= MAX_INTERVAL_WEEKS
  }
  return interval >= MIN_INTERVAL_MONTHS && interval <= MAX_INTERVAL_MONTHS
}

/**
 * Turns a one-off into a standing appointment with a custom interval,
 * e.g. every 6 weeks or every 2 months.
 */
export function RecurrenceFields({
  repeats,
  onRepeatsChange,
  unit,
  onUnitChange,
  interval,
  onIntervalChange,
  occurrenceCount,
  onOccurrenceCountChange,
  startDatetime,
}: {
  repeats: boolean
  onRepeatsChange: (repeats: boolean) => void
  unit: RecurrenceUnit
  onUnitChange: (unit: RecurrenceUnit) => void
  interval: number
  onIntervalChange: (interval: number) => void
  occurrenceCount: number
  onOccurrenceCountChange: (count: number) => void
  startDatetime: string
}) {
  const first = startDatetime ? new Date(startDatetime) : null
  const frequency = frequencyForUnit(unit)
  const intervalWeeks = unit === 'weeks' ? interval : 1
  const intervalMonths = unit === 'months' ? interval : 1

  const countInRange =
    occurrenceCount >= MIN_OCCURRENCES && occurrenceCount <= MAX_OCCURRENCES
  const intervalValid = intervalInRange(unit, interval)

  const preview =
    first &&
    !Number.isNaN(first.getTime()) &&
    countInRange &&
    intervalValid
      ? describeSeries(
          first,
          frequency,
          occurrenceCount,
          intervalWeeks,
          intervalMonths,
        )
      : null

  const maxInterval = unit === 'weeks' ? MAX_INTERVAL_WEEKS : MAX_INTERVAL_MONTHS
  const minInterval = unit === 'weeks' ? MIN_INTERVAL_WEEKS : MIN_INTERVAL_MONTHS

  return (
    <>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={repeats}
          onChange={(e) => onRepeatsChange(e.target.checked)}
        />
        Repeat this booking
      </label>

      {repeats && (
        <div className="recurrence-fields">
          <div className="form-row recurrence-interval-row">
            <label htmlFor="recurrenceInterval">Repeat every</label>
            <div className="recurrence-interval-inputs">
              <input
                id="recurrenceInterval"
                type="number"
                min={minInterval}
                max={maxInterval}
                value={interval}
                onChange={(e) => onIntervalChange(Number(e.target.value))}
                required
              />
              <select
                id="recurrenceUnit"
                aria-label="Recurrence unit"
                value={unit}
                onChange={(e) => onUnitChange(e.target.value as RecurrenceUnit)}
              >
                <option value="weeks">weeks</option>
                <option value="months">months</option>
              </select>
            </div>
            {unit === 'months' && (
              <p className="field-hint">
                Same weekday each month (e.g. 2nd Tuesday), not the same date.
              </p>
            )}
          </div>

          <div className="form-row">
            <label htmlFor="occurrenceCount">Number of bookings</label>
            <input
              id="occurrenceCount"
              type="number"
              min={MIN_OCCURRENCES}
              max={MAX_OCCURRENCES}
              value={occurrenceCount}
              onChange={(e) => onOccurrenceCountChange(Number(e.target.value))}
              required
            />
          </div>

          {preview ? (
            <p className="recurrence-preview" role="status">
              {preview}
            </p>
          ) : (
            <p className="field-hint">
              Pick a date and time to preview the dates.
            </p>
          )}
        </div>
      )}
    </>
  )
}
