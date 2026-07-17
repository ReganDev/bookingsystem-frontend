import { useCallback, useEffect, useState } from 'react'
import { ApiClientError } from '../api/client'
import * as schedulesApi from '../api/schedules'
import type { DayOfWeek, ScheduleBreak } from '../types/api'

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
]

type DayRow = {
  day: DayOfWeek
  scheduleId?: string
  open: boolean
  startTime: string
  endTime: string
  breaks: ScheduleBreak[]
}

function defaultRows(): DayRow[] {
  return DAYS.map(({ value }) => ({
    day: value,
    open: false,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
  }))
}

// Backend serialises LocalTime as HH:mm or HH:mm:ss; time inputs want HH:mm
function toTimeInput(value: string) {
  return value.slice(0, 5)
}

export function OpeningHoursPanel({
  businessId,
  token,
  onSaved,
}: {
  businessId: string
  token: string
  onSaved?: () => void
}) {
  const [rows, setRows] = useState<DayRow[]>(defaultRows)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState(false)

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const schedules = await schedulesApi.getSchedules(businessId, token)
      setRows(
        DAYS.map(({ value }) => {
          const existing = schedules.find(
            (schedule) => schedule.dayOfWeek === value && schedule.isActive,
          )
          if (!existing) {
            return {
              day: value,
              open: false,
              startTime: '09:00',
              endTime: '17:00',
              breaks: [],
            }
          }
          return {
            day: value,
            scheduleId: existing.id,
            open: true,
            startTime: toTimeInput(existing.startTime),
            endTime: toTimeInput(existing.endTime),
            breaks: existing.breaks.map((scheduleBreak) => ({
              startTime: toTimeInput(scheduleBreak.startTime),
              endTime: toTimeInput(scheduleBreak.endTime),
              label: scheduleBreak.label,
            })),
          }
        }),
      )
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load opening hours.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [businessId, token])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  function updateRow(day: DayOfWeek, patch: Partial<DayRow>) {
    setSavedMessage(false)
    setRows((current) =>
      current.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    )
  }

  function updateBreak(
    day: DayOfWeek,
    index: number,
    patch: Partial<ScheduleBreak>,
  ) {
    setSavedMessage(false)
    setRows((current) =>
      current.map((row) =>
        row.day === day
          ? {
              ...row,
              breaks: row.breaks.map((scheduleBreak, i) =>
                i === index ? { ...scheduleBreak, ...patch } : scheduleBreak,
              ),
            }
          : row,
      ),
    )
  }

  function validate(): string | null {
    for (const row of rows) {
      if (!row.open) continue
      const label = DAYS.find((d) => d.value === row.day)?.label ?? row.day
      if (row.endTime <= row.startTime) {
        return `${label}: closing time must be after opening time.`
      }
      for (const scheduleBreak of row.breaks) {
        if (scheduleBreak.endTime <= scheduleBreak.startTime) {
          return `${label}: break end must be after break start.`
        }
        if (
          scheduleBreak.startTime < row.startTime ||
          scheduleBreak.endTime > row.endTime
        ) {
          return `${label}: breaks must be within opening hours.`
        }
      }
    }
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)
    setSavedMessage(false)

    try {
      for (const row of rows) {
        if (row.open) {
          await schedulesApi.saveSchedule(
            businessId,
            {
              dayOfWeek: row.day,
              startTime: row.startTime,
              endTime: row.endTime,
              isActive: true,
              breaks: row.breaks,
            },
            token,
          )
        } else if (row.scheduleId) {
          await schedulesApi.deleteSchedule(businessId, row.scheduleId, token)
        }
      }
      await loadSchedules()
      setSavedMessage(true)
      onSaved?.()
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to save opening hours.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const noDaysOpen = rows.every((row) => !row.open)

  if (loading) {
    return (
      <div className="panel">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3>Opening hours</h3>
          <p className="panel-subtitle">
            Customers can only book time slots within these hours.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save opening hours'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {savedMessage && (
        <div className="success-banner">Opening hours saved.</div>
      )}
      {noDaysOpen && (
        <div className="empty-state">
          No opening hours set. Your booking page will show no available
          times until you open at least one day.
        </div>
      )}

      <div className="schedule-grid">
        {rows.map((row) => {
          const dayLabel = DAYS.find((d) => d.value === row.day)!.label
          return (
            <div key={row.day} className="schedule-day">
              <label className="schedule-day-toggle">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) =>
                    updateRow(row.day, { open: e.target.checked })
                  }
                />
                <span className="schedule-day-name">{dayLabel}</span>
              </label>

              {row.open ? (
                <div className="schedule-day-times">
                  <div className="schedule-time-range">
                    <label>
                      <span className="form-label">Open</span>
                      <input
                        type="time"
                        aria-label={`${dayLabel} opening time`}
                        value={row.startTime}
                        onChange={(e) =>
                          updateRow(row.day, { startTime: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span className="form-label">Close</span>
                      <input
                        type="time"
                        aria-label={`${dayLabel} closing time`}
                        value={row.endTime}
                        onChange={(e) =>
                          updateRow(row.day, { endTime: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  {row.breaks.map((scheduleBreak, index) => (
                    <div className="schedule-time-range" key={index}>
                      <label>
                        <span className="form-label">Break from</span>
                        <input
                          type="time"
                          aria-label={`${dayLabel} break start`}
                          value={scheduleBreak.startTime}
                          onChange={(e) =>
                            updateBreak(row.day, index, {
                              startTime: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span className="form-label">to</span>
                        <input
                          type="time"
                          aria-label={`${dayLabel} break end`}
                          value={scheduleBreak.endTime}
                          onChange={(e) =>
                            updateBreak(row.day, index, {
                              endTime: e.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          updateRow(row.day, {
                            breaks: row.breaks.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      updateRow(row.day, {
                        breaks: [
                          ...row.breaks,
                          { startTime: '12:00', endTime: '13:00', label: 'Break' },
                        ],
                      })
                    }
                  >
                    + Add break
                  </button>
                </div>
              ) : (
                <span className="schedule-closed">Closed</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
