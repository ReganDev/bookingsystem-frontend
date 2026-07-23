import { useCallback, useEffect, useState } from 'react'
import { ApiClientError } from '../api/client'
import * as businessesApi from '../api/businesses'
import type { Business } from '../types/api'

export function BookingSettingsPanel({
  businessId,
  token,
}: {
  businessId: string
  token: string
}) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState(false)

  const loadBusiness = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loaded = await businessesApi.getBusiness(businessId, token)
      setBusiness(loaded)
      setAutoConfirm(loaded.autoConfirmBookings !== false)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load settings.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [businessId, token])

  useEffect(() => {
    loadBusiness()
  }, [loadBusiness])

  async function handleSave() {
    if (!business) return

    setSaving(true)
    setError(null)
    setSavedMessage(false)

    try {
      // Full-object PUT: the backend validates name/email are present,
      // so send the loaded business merged with the change.
      const updated = await businessesApi.updateBusiness(
        businessId,
        { ...business, autoConfirmBookings: autoConfirm },
        token,
      )
      setBusiness(updated)
      setAutoConfirm(updated.autoConfirmBookings !== false)
      setSavedMessage(true)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to save settings.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

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
          <h3>Booking settings</h3>
          <p className="panel-subtitle">
            How new bookings from your public booking page behave.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving || !business}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {savedMessage && <div className="success-banner">Settings saved.</div>}

      <label className="schedule-day-toggle">
        <input
          type="checkbox"
          checked={autoConfirm}
          onChange={(e) => {
            setSavedMessage(false)
            setAutoConfirm(e.target.checked)
          }}
        />
        <span className="schedule-day-name">
          Automatically confirm new bookings
        </span>
      </label>
      <p className="panel-subtitle">
        On: customers see "Confirmed ✓" the moment they book — no action
        needed from you. Off: new bookings arrive as requests you confirm
        from the Bookings tab, and customers wait to hear back.
      </p>
    </div>
  )
}
