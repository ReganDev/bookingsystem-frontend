import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError } from '../api/client'
import * as publicApi from '../api/public'
import type { Business } from '../types/api'

export function BrowseBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    publicApi
      .listBusinesses()
      .then(setBusinesses)
      .catch((err) => {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Unable to load businesses.'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3>Choose a business</h3>
          <p className="panel-subtitle">
            Browse available businesses and book an appointment.
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Loading businesses…</p>
      ) : businesses.length === 0 ? (
        <div className="empty-state">
          No businesses are available to book right now.
        </div>
      ) : (
        <div className="business-grid">
          {businesses.map((business) => (
            <Link
              key={business.id}
              to={`/book/${business.slug}`}
              className="business-card"
            >
              <div className="business-card-name">{business.name}</div>
              {business.description && (
                <p className="business-card-description">
                  {business.description}
                </p>
              )}
              <div className="business-card-meta">
                {[business.city, business.country].filter(Boolean).join(', ') ||
                  'View services and book'}
              </div>
              <span className="business-card-cta">Book appointment →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
