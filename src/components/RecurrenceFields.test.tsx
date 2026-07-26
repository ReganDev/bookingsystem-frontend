import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecurrenceUnit } from '../lib/recurrence'
import { RecurrenceFields } from './RecurrenceFields'

const onRepeatsChange = vi.fn()
const onUnitChange = vi.fn()
const onIntervalChange = vi.fn()
const onOccurrenceCountChange = vi.fn()

function renderFields({
  repeats = true,
  unit = 'weeks' as RecurrenceUnit,
  interval = 1,
  occurrenceCount = 12,
  startDatetime = '2026-08-04T10:00',
} = {}) {
  return render(
    <RecurrenceFields
      repeats={repeats}
      onRepeatsChange={onRepeatsChange}
      unit={unit}
      onUnitChange={onUnitChange}
      interval={interval}
      onIntervalChange={onIntervalChange}
      occurrenceCount={occurrenceCount}
      onOccurrenceCountChange={onOccurrenceCountChange}
      startDatetime={startDatetime}
    />,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('RecurrenceFields', () => {
  it('hides the detail until repeating is turned on', () => {
    renderFields({ repeats: false })

    expect(screen.getByLabelText('Repeat this booking')).not.toBeChecked()
    expect(screen.queryByLabelText('Repeat every')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Number of bookings')).not.toBeInTheDocument()
  })

  it('previews a weekly series in plain English', () => {
    renderFields({ unit: 'weeks', interval: 1, occurrenceCount: 12 })

    expect(
      screen.getByText('12 bookings, every Tuesday, 4 Aug 2026 – 20 Oct 2026'),
    ).toBeInTheDocument()
  })

  it('previews a custom week interval', () => {
    renderFields({ unit: 'weeks', interval: 6, occurrenceCount: 3 })

    expect(
      screen.getByText(
        '3 bookings, every 6 weeks on Tuesday, 4 Aug 2026 – 27 Oct 2026',
      ),
    ).toBeInTheDocument()
  })

  it('previews a monthly series', () => {
    renderFields({ unit: 'months', interval: 1, occurrenceCount: 3 })

    expect(screen.getByText(/Same weekday each month/)).toBeInTheDocument()
    expect(
      screen.getByText('3 bookings, monthly on the 1st Tuesday, 4 Aug 2026 – 6 Oct 2026'),
    ).toBeInTheDocument()
  })

  it('previews a custom month interval', () => {
    renderFields({ unit: 'months', interval: 2, occurrenceCount: 3 })

    expect(
      screen.getByText(
        '3 bookings, every 2 months on the 1st Tuesday, 4 Aug 2026 – 1 Dec 2026',
      ),
    ).toBeInTheDocument()
  })

  it('asks for a date before it can preview anything', () => {
    renderFields({ startDatetime: '' })

    expect(screen.getByText(/Pick a date and time to preview/)).toBeInTheDocument()
  })

  it('does not preview a count outside the allowed range', () => {
    renderFields({ occurrenceCount: 99 })

    expect(screen.queryByText(/bookings, every/)).not.toBeInTheDocument()
  })
})
