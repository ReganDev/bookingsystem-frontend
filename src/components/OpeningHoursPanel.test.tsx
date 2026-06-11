import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as schedulesApi from '../api/schedules'
import type { Schedule } from '../types/api'
import { OpeningHoursPanel } from './OpeningHoursPanel'

vi.mock('../api/schedules')

const mondaySchedule: Schedule = {
  id: 'sch-1',
  businessId: 'b-1',
  dayOfWeek: 'MONDAY',
  startTime: '09:00:00',
  endTime: '17:00:00',
  isActive: true,
  breaks: [{ id: 'br-1', startTime: '12:00:00', endTime: '13:00:00', label: 'Lunch' }],
}

function renderPanel() {
  return render(<OpeningHoursPanel businessId="b-1" token="tok" />)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(schedulesApi.getSchedules).mockResolvedValue([mondaySchedule])
  vi.mocked(schedulesApi.saveSchedule).mockResolvedValue(mondaySchedule)
  vi.mocked(schedulesApi.deleteSchedule).mockResolvedValue(undefined)
})

describe('OpeningHoursPanel', () => {
  it('shows existing schedule days as open with their times and breaks', async () => {
    renderPanel()

    expect(await screen.findByText('Opening hours')).toBeInTheDocument()
    expect(screen.getByLabelText('Monday opening time')).toHaveValue('09:00')
    expect(screen.getByLabelText('Monday closing time')).toHaveValue('17:00')
    expect(screen.getByLabelText('Monday break start')).toHaveValue('12:00')
    // the other six days are closed
    expect(screen.getAllByText('Closed')).toHaveLength(6)
  })

  it('warns when no days are open', async () => {
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue([])
    renderPanel()

    expect(
      await screen.findByText(/will show no available times/),
    ).toBeInTheDocument()
  })

  it('saves opened days and deletes closed ones', async () => {
    const user = userEvent.setup()
    renderPanel()
    await screen.findByLabelText('Monday opening time')

    // open Tuesday with default hours, close Monday
    const [monday, tuesday] = screen.getAllByRole('checkbox')
    await user.click(tuesday)
    await user.click(monday)

    await user.click(
      screen.getByRole('button', { name: 'Save opening hours' }),
    )

    await waitFor(() =>
      expect(schedulesApi.saveSchedule).toHaveBeenCalledWith(
        'b-1',
        {
          dayOfWeek: 'TUESDAY',
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
          breaks: [],
        },
        'tok',
      ),
    )
    expect(schedulesApi.deleteSchedule).toHaveBeenCalledWith(
      'b-1',
      'sch-1',
      'tok',
    )
  })

  it('rejects a closing time before the opening time without calling the API', async () => {
    const user = userEvent.setup()
    renderPanel()

    const closeInput = await screen.findByLabelText('Monday closing time')
    await user.clear(closeInput)
    await user.type(closeInput, '08:00')
    await user.click(
      screen.getByRole('button', { name: 'Save opening hours' }),
    )

    expect(
      await screen.findByText(/closing time must be after opening time/),
    ).toBeInTheDocument()
    expect(schedulesApi.saveSchedule).not.toHaveBeenCalled()
  })

  it('rejects breaks outside opening hours', async () => {
    const user = userEvent.setup()
    renderPanel()

    const breakEnd = await screen.findByLabelText('Monday break end')
    await user.clear(breakEnd)
    await user.type(breakEnd, '18:00')
    await user.click(
      screen.getByRole('button', { name: 'Save opening hours' }),
    )

    expect(
      await screen.findByText(/breaks must be within opening hours/),
    ).toBeInTheDocument()
    expect(schedulesApi.saveSchedule).not.toHaveBeenCalled()
  })

  it('adds a break row with sensible defaults', async () => {
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue([
      { ...mondaySchedule, breaks: [] },
    ])
    const user = userEvent.setup()
    renderPanel()

    await screen.findByLabelText('Monday opening time')
    await user.click(screen.getByRole('button', { name: '+ Add break' }))

    expect(screen.getByLabelText('Monday break start')).toHaveValue('12:00')
    expect(screen.getByLabelText('Monday break end')).toHaveValue('13:00')
  })
})
