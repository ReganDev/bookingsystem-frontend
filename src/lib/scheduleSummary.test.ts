import { describe, expect, it } from 'vitest'
import type { ScheduleDayRow } from './scheduleSummary'
import {
  formatHoursSummary,
  formatSaveSummary,
  groupContiguousDays,
  openDayCount,
} from './scheduleSummary'

function row(
  day: ScheduleDayRow['day'],
  open: boolean,
  startTime = '09:00',
  endTime = '17:00',
  breaks: ScheduleDayRow['breaks'] = [],
): ScheduleDayRow {
  return { day, open, startTime, endTime, breaks }
}

const weekdays = [
  row('MONDAY', true),
  row('TUESDAY', true),
  row('WEDNESDAY', true),
  row('THURSDAY', true),
  row('FRIDAY', true),
  row('SATURDAY', false),
  row('SUNDAY', false),
]

describe('openDayCount', () => {
  it('counts open days', () => {
    expect(openDayCount(weekdays)).toBe(5)
    expect(openDayCount([row('MONDAY', false)])).toBe(0)
  })
})

describe('groupContiguousDays', () => {
  it('groups consecutive days with the same hours', () => {
    expect(groupContiguousDays(weekdays)).toEqual([
      {
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        startTime: '09:00',
        endTime: '17:00',
      },
    ])
  })

  it('splits when hours differ or days are not consecutive', () => {
    const rows = [
      ...weekdays.slice(0, 5),
      row('SATURDAY', true, '10:00', '14:00'),
      row('SUNDAY', false),
    ]
    expect(groupContiguousDays(rows)).toEqual([
      {
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        startTime: '09:00',
        endTime: '17:00',
      },
      { days: ['SATURDAY'], startTime: '10:00', endTime: '14:00' },
    ])
  })
})

describe('formatHoursSummary', () => {
  it('describes open weekdays', () => {
    expect(formatHoursSummary(weekdays)).toBe(
      '5 days open · Mon–Fri 09:00–17:00',
    )
  })

  it('handles no open days', () => {
    expect(formatHoursSummary([row('MONDAY', false)])).toBe('No days open')
  })
})

describe('formatSaveSummary', () => {
  it('describes days ready to save', () => {
    expect(formatSaveSummary(weekdays)).toBe('5 days ready to save')
  })

  it('includes break counts', () => {
    const rows = [
      row('MONDAY', true, '09:00', '17:00', [
        { startTime: '12:00', endTime: '13:00', label: 'Lunch' },
      ]),
      row('TUESDAY', true),
      row('WEDNESDAY', false),
      row('THURSDAY', false),
      row('FRIDAY', false),
      row('SATURDAY', false),
      row('SUNDAY', false),
    ]
    expect(formatSaveSummary(rows)).toBe('2 days · 1 break on Monday')
  })
})
