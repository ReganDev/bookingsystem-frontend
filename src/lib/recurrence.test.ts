import { describe, expect, it } from 'vitest'
import { describeSeries, occurrenceDates } from './recurrence'

const at = (iso: string) => new Date(iso)
const asDates = (dates: Date[]) =>
  dates.map((date) => date.toISOString().slice(0, 10))
const asTimes = (dates: Date[]) =>
  dates.map((date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`)

describe('occurrenceDates', () => {
  it('repeats weekly on the same weekday', () => {
    const dates = occurrenceDates(at('2026-08-04T10:00'), 'WEEKLY', 4)

    expect(asDates(dates)).toEqual([
      '2026-08-04',
      '2026-08-11',
      '2026-08-18',
      '2026-08-25',
    ])
  })

  it('supports custom week intervals', () => {
    const dates = occurrenceDates(at('2026-08-04T10:00'), 'WEEKLY', 3, 6)

    expect(asDates(dates)).toEqual(['2026-08-04', '2026-09-15', '2026-10-27'])
  })

  it('skips every other week when fortnightly', () => {
    const dates = occurrenceDates(at('2026-08-04T10:00'), 'FORTNIGHTLY', 3)

    expect(asDates(dates)).toEqual(['2026-08-04', '2026-08-18', '2026-09-01'])
  })

  it('repeats monthly on the same weekday, not the same date', () => {
    const dates = occurrenceDates(at('2026-08-11T14:00'), 'MONTHLY', 5)

    expect(asDates(dates)).toEqual([
      '2026-08-11',
      '2026-09-08',
      '2026-10-13',
      '2026-11-10',
      '2026-12-08',
    ])
    expect(dates.every((date) => date.getDay() === 2)).toBe(true)
  })

  it('supports custom month intervals', () => {
    const dates = occurrenceDates(at('2026-08-11T14:00'), 'MONTHLY', 3, 1, 2)

    expect(asDates(dates)).toEqual(['2026-08-11', '2026-10-13', '2026-12-08'])
  })

  it('treats a fifth weekday as the last of the month', () => {
    const dates = occurrenceDates(at('2026-09-30T09:00'), 'MONTHLY', 4)

    expect(asDates(dates)).toEqual([
      '2026-09-30',
      '2026-10-28',
      '2026-11-25',
      '2026-12-30',
    ])
    expect(dates.every((date) => date.getDay() === 3)).toBe(true)
  })

  it('keeps the time of day on every occurrence', () => {
    const dates = occurrenceDates(at('2026-10-20T14:30'), 'WEEKLY', 3)

    expect(asTimes(dates)).toEqual(['14:30', '14:30', '14:30'])
  })

  it('returns exactly the count asked for, starting with the chosen slot', () => {
    const first = at('2026-08-04T10:00')
    const dates = occurrenceDates(first, 'MONTHLY', 7)

    expect(dates).toHaveLength(7)
    expect(dates[0].getTime()).toBe(first.getTime())
  })
})

describe('describeSeries', () => {
  it('describes a weekly series', () => {
    expect(describeSeries(at('2026-08-04T10:00'), 'WEEKLY', 12)).toBe(
      '12 bookings, every Tuesday, 4 Aug 2026 – 20 Oct 2026',
    )
  })

  it('describes a custom week interval', () => {
    expect(describeSeries(at('2026-08-04T10:00'), 'WEEKLY', 3, 6)).toBe(
      '3 bookings, every 6 weeks on Tuesday, 4 Aug 2026 – 27 Oct 2026',
    )
  })

  it('describes a fortnightly series', () => {
    expect(describeSeries(at('2026-08-04T10:00'), 'FORTNIGHTLY', 3)).toBe(
      '3 bookings, every 2 weeks on Tuesday, 4 Aug 2026 – 1 Sept 2026',
    )
  })

  it('names the weekday ordinal for a monthly series', () => {
    expect(describeSeries(at('2026-08-11T14:00'), 'MONTHLY', 5)).toBe(
      '5 bookings, monthly on the 2nd Tuesday, 11 Aug 2026 – 8 Dec 2026',
    )
  })

  it('describes a custom month interval', () => {
    expect(describeSeries(at('2026-08-11T14:00'), 'MONTHLY', 3, 1, 2)).toBe(
      '3 bookings, every 2 months on the 2nd Tuesday, 11 Aug 2026 – 8 Dec 2026',
    )
  })

  it('says "last" for a fifth weekday', () => {
    expect(describeSeries(at('2026-09-30T09:00'), 'MONTHLY', 4)).toBe(
      '4 bookings, monthly on the last Wednesday, 30 Sept 2026 – 30 Dec 2026',
    )
  })
})
