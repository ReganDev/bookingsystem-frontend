import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import * as businessesApi from '../api/businesses'
import { ApiClientError } from '../api/client'
import type { Business } from '../types/api'

const MAX_PHOTOS = 8
const MAX_FILE_SIZE = 12 * 1024 * 1024
const MAX_IMAGE_EDGE = 4032
const MAX_IMAGE_PIXELS = 4032 * 3024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

async function readImageDimensions(file: File) {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image dimensions could not be read'))
    }
    image.src = url
  })
}

/** Lets the owner upload and arrange photos shown on their booking page. */
export function PhotosPanel({
  businessId,
  token,
}: {
  businessId: string
  token: string
}) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function uploadFiles(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      setError(`You can upload up to ${MAX_PHOTOS} photos.`)
      return
    }
    if (selectedFiles.length > remaining) {
      setError(
        `Choose ${remaining} ${remaining === 1 ? 'photo' : 'photos'} or fewer.`,
      )
      return
    }

    const invalidType = selectedFiles.find(
      (file) => !ACCEPTED_TYPES.includes(file.type),
    )
    if (invalidType) {
      setError('Photos must be JPEG, PNG, WebP, or GIF files.')
      return
    }

    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE)
    if (oversized) {
      setError(`“${oversized.name}” is larger than 12 MB.`)
      return
    }

    try {
      for (const file of selectedFiles) {
        const { width, height } = await readImageDimensions(file)
        if (
          width > MAX_IMAGE_EDGE ||
          height > MAX_IMAGE_EDGE ||
          width * height > MAX_IMAGE_PIXELS
        ) {
          setError(
            `“${file.name}” is ${width}×${height}px. Photos can be up to ` +
              '4032px on either edge and 12.2 megapixels.',
          )
          return
        }
      }
    } catch {
      setError('One of the selected photos could not be read.')
      return
    }

    setUploading(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await businessesApi.uploadBusinessPhotos(
        businessId,
        selectedFiles,
        token,
      )
      setBusiness(updated)
      setPhotos(updated.photoUrls ?? [])
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Failed to upload photos.',
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(event.target.files ?? []))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    if (!uploading) {
      void uploadFiles(Array.from(event.dataTransfer.files))
    }
  }

  async function removePhoto(photoUrl: string) {
    setDeletingUrl(photoUrl)
    setError(null)
    setSaved(false)
    try {
      const updated = await businessesApi.removeBusinessPhoto(
        businessId,
        photoUrl,
        token,
      )
      setBusiness(updated)
      setPhotos(updated.photoUrls ?? [])
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Failed to remove photo.',
      )
    } finally {
      setDeletingUrl(null)
    }
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
          disabled={saving || loading || uploading}
        >
          {saving ? 'Saving…' : 'Save order'}
        </button>
      </div>
      <p className="panel-hint">
        Upload up to {MAX_PHOTOS} photos. The first photo is the main image on
        your booking page. Use the arrows to change the order, then save it.
      </p>

      {error && <div className="error-banner">{error}</div>}
      {saved && (
        <div className="success-banner">
          <p>Your photos are now live on your booking page.</p>
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
                      onClick={() => void removePhoto(url)}
                      disabled={deletingUrl === url}
                    >
                      {deletingUrl === url ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <div
              className={`photo-upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <svg
                className="photo-upload-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <strong>
                {uploading ? 'Uploading photos…' : 'Drop photos here'}
              </strong>
              <span>or choose files from your device</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Choose photos'}
              </button>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                aria-label="Choose business photos"
              />
              <small>
                Original resolution is preserved · maximum 4032px per edge,
                12.2 MP, and 12 MB · {MAX_PHOTOS - photos.length} remaining
              </small>
            </div>
          )}
        </>
      )}
    </div>
  )
}
