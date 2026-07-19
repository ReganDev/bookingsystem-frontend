import { useCallback, useEffect, useState, type FormEvent } from 'react'
import * as businessesApi from '../api/businesses'
import { ApiClientError } from '../api/client'
import type { Business } from '../types/api'

/** Lets the owner manage the photo URLs shown on their public booking page.
 *  Photos are provided as image links (no upload yet). */
export function PhotosPanel({
  businessId,
  token,
}: {
  businessId: string
  token: string
}) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await businessesApi.getBusiness(businessId, token)
      setBusiness(data)
      setPhotos(data.photoUrls ?? [])
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Failed to load photos.',
      )
    } finally {
      setLoading(false)
    }
  }, [businessId, token])

  useEffect(() => {
    load()
  }, [load])

  function addUrl(event: FormEvent) {
    event.preventDefault()
    const url = newUrl.trim()
    if (!url) return
    setPhotos((current) => [...current, url])
    setNewUrl('')
    setSaved(false)
  }

  function removeAt(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index))
    setSaved(false)
  }

  function move(index: number, delta: number) {
    setPhotos((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSaved(false)
  }

  async function save() {
    if (!business) return
    setSaving(true)
    setError(null)
    try {
      const updated = await businessesApi.updateBusiness(
        businessId,
        { ...business, photoUrls: photos },
        token,
      )
      setBusiness(updated)
      setPhotos(updated.photoUrls ?? [])
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Failed to save photos.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Booking page photos</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={save}
          disabled={saving || loading}
        >
          {saving ? 'Saving…' : 'Save photos'}
        </button>
      </div>
      <p className="panel-hint">
        These images appear next to your booking form. Paste a link to an image
        (for example from your website or an image host). The first photo is
        shown largest. Photos save only when you click Save.
      </p>

      {error && <div className="error-banner">{error}</div>}
      {saved && (
        <div className="success-banner">
          <p>Photos saved and now live on your booking page.</p>
        </div>
      )}

      {loading ? (
        <p className="slot-hint">Loading…</p>
      ) : (
        <>
          {photos.length === 0 ? (
            <div className="empty-state">
              <strong>No photos yet</strong>
              <p>Add a few images to make your booking page more inviting.</p>
            </div>
          ) : (
            <div className="photo-editor-grid">
              {photos.map((url, index) => (
                <div key={`${url}-${index}`} className="photo-editor-item">
                  <img src={url} alt="" loading="lazy" />
                  {index === 0 && (
                    <span className="photo-editor-badge">Main</span>
                  )}
                  <div className="photo-editor-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move earlier"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => move(index, 1)}
                      disabled={index === photos.length - 1}
                      aria-label="Move later"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeAt(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form className="inline-form photo-add-form" onSubmit={addUrl}>
            <div className="form-row">
              <label htmlFor="photoUrl">Add a photo by link</label>
              <div className="password-row">
                <input
                  id="photoUrl"
                  type="url"
                  placeholder="https://…/photo.jpg"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
                <button className="btn btn-secondary btn-sm" type="submit">
                  Add
                </button>
              </div>
              <span className="field-hint">
                Remember to click Save photos once you&apos;re happy.
              </span>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
