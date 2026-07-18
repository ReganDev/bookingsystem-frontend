import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError } from '../api/client'
import * as publicApi from '../api/public'
import { useAuth } from '../context/AuthContext'
import type { Business } from '../types/api'

export function BrowseBusinessesPage() {
  const { isCustomer, user } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [query, setQuery] = useState('')
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return businesses
    return businesses.filter((business) =>
      [
        business.name,
        business.description,
        business.city,
        business.postalCode,
        business.country,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle)),
    )
  }, [businesses, query])

  return (
    <>
      <section className="browse-hero">
        <p className="browse-eyebrow">Simple online booking</p>
        <h2>
          {isCustomer && user
            ? `Welcome back, ${user.firstName}!`
            : 'Book your next appointment'}
        </h2>
        <p>
          Find a local business, choose a time and send your request in just a
          few clicks.
        </p>
        <div className="search-bar">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            type="search"
            placeholder="Search by name or location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search businesses"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="browse-benefits" aria-label="Booking benefits">
          <span>Free to book</span>
          <span>Book anytime</span>
          <span>No phone call needed</span>
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="slot-hint" role="status">
          Loading businesses…
        </p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <strong>
            {query ? 'No matches found' : 'No businesses available yet'}
          </strong>
          <p>
            {query
              ? 'Try a different name or location, or clear the search to see everything.'
              : 'Please check back soon.'}
          </p>
          {query && (
            <button
              type="button"
              className="btn btn-secondary empty-state-action"
              onClick={() => setQuery('')}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <section aria-labelledby="business-results-heading">
          <div className="business-results-header">
            <h3 id="business-results-heading">
              {query ? 'Search results' : 'Available businesses'}
            </h3>
            <span>
              {filtered.length} {filtered.length === 1 ? 'business' : 'businesses'}
            </span>
          </div>
          <div className="business-grid">
            {filtered.map((business) => (
              <Link
                key={business.id}
                to={`/book/${business.slug}`}
                className="business-card"
              >
                <div className="business-card-avatar" aria-hidden="true">
                  {business.name.charAt(0).toUpperCase()}
                </div>
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
                <span className="business-card-cta">View availability →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
