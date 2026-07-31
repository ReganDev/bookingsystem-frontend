import { useEffect, useRef } from 'react'
import { useModalStack } from '../lib/modalStack'
import { NewBookingPanel } from './NewBookingPanel'
import type { Service } from '../types/api'

export function NewBookingModal({
  businessId,
  token,
  services,
  initialPickerDate,
  onCreated,
  onClose,
}: {
  businessId: string
  token: string
  services: Service[]
  initialPickerDate?: string
  onCreated: (createdStartIso?: string) => Promise<void>
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useModalStack(true, onClose)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog new-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-booking-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h4 id="new-booking-modal-title">New booking</h4>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <NewBookingPanel
          embedded
          services={services}
          businessId={businessId}
          token={token}
          initialPickerDate={initialPickerDate}
          onCreated={onCreated}
          onRequestClose={onClose}
        />
      </div>
    </div>
  )
}
