import { useState } from 'react'
import { BookingSettingsPanel } from './BookingSettingsPanel'
import { PhotosPanel } from './PhotosPanel'

type SettingsSection = 'general' | 'photos'

/**
 * Settings hub: a pill switcher over the focused settings views. New
 * sections (business info, booking rules…) slot in as further pills.
 */
export function SettingsPanel({
  businessId,
  token,
}: {
  businessId: string
  token: string
}) {
  const [section, setSection] = useState<SettingsSection>('general')

  return (
    <div className="settings-panel">
      <div
        className="settings-subtabs"
        role="group"
        aria-label="Settings sections"
      >
        <button
          type="button"
          className={`filter-pill${section === 'general' ? ' active' : ''}`}
          aria-pressed={section === 'general'}
          onClick={() => setSection('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`filter-pill${section === 'photos' ? ' active' : ''}`}
          aria-pressed={section === 'photos'}
          onClick={() => setSection('photos')}
        >
          Photos
        </button>
      </div>

      {section === 'general' ? (
        <BookingSettingsPanel businessId={businessId} token={token} />
      ) : (
        <PhotosPanel businessId={businessId} token={token} />
      )}
    </div>
  )
}
