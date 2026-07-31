import { useCallback, useEffect, useState } from 'react'
import { ApiClientError } from '../api/client'
import * as schedulesApi from '../api/schedules'
import {
  DAY_LABEL,
  DAY_ORDER,
  formatHoursSummary,
  formatSaveSummary,
  type ScheduleDayRow,
} from '../lib/scheduleSummary'
import type { DayOfWeek, ScheduleBreak } from '../types/api'

const DAYS = DAY_ORDER.map((value) => ({
  value,
  label: DAY_LABEL[value],
}))

type DayRow = ScheduleDayRow & { scheduleId?: string }

const WEEKDAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
]

function defaultRows(): DayRow[] {
  return DAYS.map(({ value }) => ({
    day: value,
    open: false,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
  }))
}

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

  function updateRows(updater: (current: DayRow[]) => DayRow[]) {
    setSavedMessage(false)
    setRows(updater)
  }

  function updateRow(day: DayOfWeek, patch: Partial<DayRow>) {
    updateRows((current) =>
      current.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    )
  }

  function updateBreak(
    day: DayOfWeek,
    index: number,
    patch: Partial<ScheduleBreak>,
  ) {
    updateRows((current) =>
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

  function setMonFri() {
    updateRows((current) =>
      current.map((row) =>
        WEEKDAYS.includes(row.day)
          ? {
              ...row,
              open: true,
              startTime: '09:00',
              endTime: '17:00',
            }
          : row,
      ),
    )
  }

  function copyMonday() {
    const monday = rows.find((row) => row.day === 'MONDAY')
    if (!monday?.open) return

    updateRows((current) =>
      current.map((row) =>
        row.day === 'MONDAY' ||
        row.day === 'SATURDAY' ||
        row.day === 'SUNDAY'
          ? row
          : {
              ...row,
              open: true,
              startTime: monday.startTime,
              endTime: monday.endTime,
              breaks: monday.breaks.map((scheduleBreak) => ({ ...scheduleBreak })),
            },
      ),
    )
  }

  function validate(): string | null {
    for (const row of rows) {
      if (!row.open) continue
      const label = DAY_LABEL[row.day]
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
  const mondayOpen = rows.some((row) => row.day === 'MONDAY' && row.open)
  const summary = formatHoursSummary(rows)
  const saveSummary = formatSaveSummary(rows)

  if (loading) {
    return (
      <div className="panel">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="panel hours-panel">
      <div className="panel-header">
        <div>
          <h3>Opening hours</h3>
          <p className="panel-subtitle">
            Customers can only book time slots within these hours.
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {savedMessage && (
        <div className="success-banner">Opening hours saved.</div>
      )}

      <div className="hours-summary" aria-live="polite">
        {summary}
      </div>

      <div className="hours-presets actions-row">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={setMonFri}
        >
          Set Mon–Fri
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={copyMonday}
          disabled={!mondayOpen}
        >
          Copy Monday
        </button>
      </div>

      {noDaysOpen && (
        <div className="empty-state">
          <strong>No opening hours yet</strong>
          <p>
            Your booking page will show no available times until you open at
            least one day. Try “Set Mon–Fri” above to get started quickly.
          </p>
        </div>
      )}

      <div className="hours-week-list">
        {rows.map((row) => {
          const dayLabel = DAY_LABEL[row.day]
          return (
            <div
              key={row.day}
              className={`hours-day-card${row.open ? ' is-open' : ' is-closed'}`}
            >
              <div className="hours-day-header">
                <span className="hours-day-name">{dayLabel}</span>

                <label className="hours-day-toggle">
                  <input
                    type="checkbox"
                    checked={row.open}
                    onChange={(e) =>
                      updateRow(row.day, { open: e.target.checked })
                    }
                  />
                  <span>{row.open ? 'Open' : 'Closed'}</span>
                </label>

                {row.open ? (
                  <div className="hours-day-times">
                    <label className="hours-time-field">
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
                    <span className="hours-time-separator" aria-hidden="true">
                      –
                    </span>
                    <label className="hours-time-field">
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
                ) : (
                  <span className="hours-closed-badge">Closed</span>
                )}
              </div>

              {row.open && (
                <div className="hours-break-list">
                  {row.breaks.map((scheduleBreak, index) => (
                    <div className="hours-break-row" key={index}>
                      <span className="hours-break-label">
                        {scheduleBreak.label || 'Break'}
                      </span>
                      <label className="hours-time-field">
                        <span className="form-label">From</span>
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
                      <span className="hours-time-separator" aria-hidden="true">
                        –
                      </span>
                      <label className="hours-time-field">
                        <span className="form-label">To</span>
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
                        className="btn btn-link"
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
                          {
                            startTime: '12:00',
                            endTime: '13:00',
                            label: 'Break',
                          },
                        ],
                      })
                    }
                  >
                    + Add break
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="hours-footer booking-form-footer">
        <p className="booking-form-summary">{saveSummary}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save opening hours'}
        </button>
      </div>
    </div>
  )
}
