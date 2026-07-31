import type { DayOfWeek, ScheduleBreak } from '../types/api'

export type ScheduleDayRow = {
  day: DayOfWeek
  open: boolean
  startTime: string
  endTime: string
  breaks: ScheduleBreak[]
}

const DAY_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}

type HoursGroup = {
  days: DayOfWeek[]
  startTime: string
  endTime: string
}

export function openDayCount(rows: ScheduleDayRow[]) {
  return rows.filter((row) => row.open).length
}

/** Group consecutive open days that share the same hours. */
export function groupContiguousDays(rows: ScheduleDayRow[]): HoursGroup[] {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const groups: HoursGroup[] = []
  let current: HoursGroup | null = null

  for (const day of DAY_ORDER) {
    const row = byDay.get(day)
    if (!row?.open) {
      current = null
      continue
    }

    if (
      current &&
      current.endTime === row.endTime &&
      current.startTime === row.startTime &&
      dayIndex(current.days[current.days.length - 1]) === dayIndex(day) - 1
    ) {
      current.days.push(day)
      continue
    }

    current = {
      days: [day],
      startTime: row.startTime,
      endTime: row.endTime,
    }
    groups.push(current)
  }

  return groups
}

function dayIndex(day: DayOfWeek) {
  return DAY_ORDER.indexOf(day)
}

function formatDayRange(days: DayOfWeek[]) {
  if (days.length === 1) return DAY_SHORT[days[0]]
  return `${DAY_SHORT[days[0]]}–${DAY_SHORT[days[days.length - 1]]}`
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime}–${endTime}`
}

/** Top summary bar, e.g. "5 days open · Mon–Fri 9:00–17:00". */
export function formatHoursSummary(rows: ScheduleDayRow[]) {
  const openCount = openDayCount(rows)
  if (openCount === 0) {
    return 'No days open'
  }

  const groups = groupContiguousDays(rows)
  const schedule = groups
    .map(
      (group) =>
        `${formatDayRange(group.days)} ${formatTimeRange(group.startTime, group.endTime)}`,
    )
    .join(', ')

  const dayWord = openCount === 1 ? 'day' : 'days'
  return `${openCount} ${dayWord} open · ${schedule}`
}

/** Footer hint before save, e.g. "5 days · 1 break on Monday". */
export function formatSaveSummary(rows: ScheduleDayRow[]) {
  const openCount = openDayCount(rows)
  if (openCount === 0) {
    return 'Nothing to save until at least one day is open'
  }

  const breakCount = rows.reduce(
    (total, row) => total + (row.open ? row.breaks.length : 0),
    0,
  )

  const dayWord = openCount === 1 ? 'day' : 'days'
  if (breakCount === 0) {
    return `${openCount} ${dayWord} ready to save`
  }

  const breakWord = breakCount === 1 ? 'break' : 'breaks'
  const daysWithBreaks = rows
    .filter((row) => row.open && row.breaks.length > 0)
    .map((row) => DAY_LABEL[row.day])

  if (daysWithBreaks.length === 1) {
    return `${openCount} ${dayWord} · ${breakCount} ${breakWord} on ${daysWithBreaks[0]}`
  }

  return `${openCount} ${dayWord} · ${breakCount} ${breakWord}`
}

export { DAY_LABEL, DAY_ORDER, DAY_SHORT }
