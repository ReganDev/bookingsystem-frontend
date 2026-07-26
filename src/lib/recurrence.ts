import type { RecurrenceFrequency } from '../types/api'

export const MIN_SERIES_LENGTH = 2
export const MAX_SERIES_LENGTH = 52
export const MIN_INTERVAL_WEEKS = 1
export const MAX_INTERVAL_WEEKS = 52
export const MIN_INTERVAL_MONTHS = 1
export const MAX_INTERVAL_MONTHS = 12

export type RecurrenceUnit = 'weeks' | 'months'

/**
 * Mirrors RecurrenceCalculator.java so the form can describe a series before
 * creating it.
 */
export function occurrenceDates(
  first: Date,
  frequency: RecurrenceFrequency,
  count: number,
  intervalWeeks = 1,
  intervalMonths = 1,
): Date[] {
  const dates: Date[] = []
  for (let index = 0; index < count; index++) {
    dates.push(
      dateForOccurrence(first, frequency, index, intervalWeeks, intervalMonths),
    )
  }
  return dates
}

function weeksBetween(frequency: RecurrenceFrequency, intervalWeeks: number) {
  if (frequency === 'FORTNIGHTLY') return 2
  return Math.max(1, intervalWeeks)
}

function dateForOccurrence(
  first: Date,
  frequency: RecurrenceFrequency,
  index: number,
  intervalWeeks: number,
  intervalMonths: number,
): Date {
  if (frequency === 'MONTHLY') {
    return nthWeekdayOfMonth(first, index * Math.max(1, intervalMonths))
  }
  const weeks = weeksBetween(frequency, intervalWeeks)
  return addDays(first, index * weeks * 7)
}

function addDays(from: Date, days: number) {
  const next = new Date(from)
  next.setDate(next.getDate() + days)
  return next
}

function nthWeekdayOfMonth(first: Date, monthsAhead: number): Date {
  const ordinal = Math.floor((first.getDate() - 1) / 7) + 1
  const weekday = first.getDay()

  const target = new Date(first)
  target.setDate(1)
  target.setMonth(target.getMonth() + monthsAhead)

  if (ordinal >= 5) {
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0)
    lastDay.setDate(lastDay.getDate() - ((lastDay.getDay() - weekday + 7) % 7))
    return withTimeOf(first, lastDay)
  }

  const offset = (weekday - target.getDay() + 7) % 7
  target.setDate(1 + offset + (ordinal - 1) * 7)
  return withTimeOf(first, target)
}

function withTimeOf(source: Date, date: Date) {
  const result = new Date(date)
  result.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  )
  return result
}

export function frequencyForUnit(unit: RecurrenceUnit): RecurrenceFrequency {
  return unit === 'months' ? 'MONTHLY' : 'WEEKLY'
}

export function describeSeries(
  first: Date,
  frequency: RecurrenceFrequency,
  count: number,
  intervalWeeks = 1,
  intervalMonths = 1,
): string {
  const dates = occurrenceDates(
    first,
    frequency,
    count,
    intervalWeeks,
    intervalMonths,
  )
  const last = dates[dates.length - 1]
  const weekday = first.toLocaleDateString('en-GB', { weekday: 'long' })

  const cadence =
    frequency === 'MONTHLY'
      ? intervalMonths === 1
        ? `monthly on the ${ordinalLabel(first)} ${weekday}`
        : `every ${intervalMonths} months on the ${ordinalLabel(first)} ${weekday}`
      : (() => {
          const weeks =
            frequency === 'FORTNIGHTLY' ? 2 : Math.max(1, intervalWeeks)
          return weeks === 1
            ? `every ${weekday}`
            : `every ${weeks} weeks on ${weekday}`
        })()

  return `${count} bookings, ${cadence}, ${formatShort(first)} – ${formatShort(last)}`
}

function ordinalLabel(date: Date) {
  const ordinal = Math.floor((date.getDate() - 1) / 7) + 1
  return ordinal >= 5 ? 'last' : ['1st', '2nd', '3rd', '4th'][ordinal - 1]
}

function formatShort(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
