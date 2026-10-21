/*
 * THESIS: a customer's booking home, Fresha/Booksy-grade. Returning customers
 * see their next appointment and where to rebook before the directory;
 * refuses the marketing-hero-plus-search layout.
 * OWN-WORLD: neutral page, white photo-led cards, emerald only for actions
 * and state; Poppins headings, Open Sans body.
 * STORY: "what's next, where do I rebook, what else is there" → tap a business.
 * FIRST VIEWPORT: greeting + full-width search, then Upcoming card and the
 * Book again row (signed in) or the photo grid (guests).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings } from '../api/bookings'
import { ApiClientError } from '../api/client'
import * as publicApi from '../api/public'
import { useAuth } from '../context/AuthContext'
import type { Business, CustomerBooking } from '../types/api'

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short' })
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
})
const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
})

function greeting(name: string) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return `Good ${part}, ${name}`
}

function Monogram({ name }: { name: string }) {
  return (
    <span className="venue-image-fallback" aria-hidden="true">
      <span className="venue-monogram">{name.charAt(0).toUpperCase()}</span>
    </span>
  )
}

function BusinessImage({ business }: { business: Business }) {
  const photo = business.photoUrls?.[0]
  if (photo) return <img src={photo} alt="" loading="lazy" />
  if (business.logoUrl) {
    return (
      <span className="venue-image-fallback">
        <img src={business.logoUrl} alt="" className="venue-logo" />
      </span>
    )
  }
  return <Monogram name={business.name} />
}

export function BrowseBusinessesPage() {
  const { isCustomer, isVerified, user, accessToken } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [myBookings, setMyBookings] = useState<CustomerBooking[]>([])
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

  const showPersonal = isCustomer && isVerified && Boolean(accessToken)

  useEffect(() => {
    if (!showPersonal || !accessToken) return
    // Personal sections are a bonus: if this fails the directory still works.
    getMyBookings(accessToken)
      .then(setMyBookings)
      .catch(() => setMyBookings([]))
  }, [showPersonal, accessToken])

  const businessesBySlug = useMemo(
    () => new Map(businesses.map((business) => [business.slug, business])),
    [businesses],
  )

  const upcoming = useMemo(() => {
    const now = Date.now()
    return myBookings
      .filter(
        ({ booking }) =>
          (booking.status === 'CONFIRMED' || booking.status === 'PENDING') &&
          new Date(booking.startDatetime).getTime() > now,
      )
      .sort(
        (a, b) =>
          new Date(a.booking.startDatetime).getTime() -
          new Date(b.booking.startDatetime).getTime(),
      )
  }, [myBookings])

  // Past visits, one entry per business, most recent first.
  const bookAgain = useMemo(() => {
    const now = Date.now()
    const latest = new Map<string, CustomerBooking>()
    ;[...myBookings]
      .filter(
        ({ booking }) =>
          booking.status === 'COMPLETED' ||
          (booking.status === 'CONFIRMED' &&
            new Date(booking.startDatetime).getTime() <= now),
      )
      .sort(
        (a, b) =>
          new Date(b.booking.startDatetime).getTime() -
          new Date(a.booking.startDatetime).getTime(),
      )
      .forEach((entry) => {
        if (!latest.has(entry.businessSlug)) {
          latest.set(entry.businessSlug, entry)
        }
      })
    return [...latest.values()].slice(0, 8)
  }, [myBookings])

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

  const searching = query.trim().length > 0
  const next = upcoming[0]
  const nextStart = next ? new Date(next.booking.startDatetime) : null
  const nextBusiness = next
    ? businessesBySlug.get(next.businessSlug)
    : undefined

  return (
    <div className="browse-page">
      <section className="browse-hero">
        <h2>
          {isCustomer && user
            ? greeting(user.firstName)
            : 'Book your next appointment'}
        </h2>
        <p className="browse-lead">
          Find a local business, choose a time and send your request in just a
          few clicks.
        </p>
        <div className="search-bar">
          <svg
            aria-hidden="true"
            width="20"
            height="20"
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
      </section>

      {showPersonal && !searching && next && nextStart && (
        <section className="browse-section" aria-labelledby="upcoming-heading">
          <div className="browse-section-head">
            <h3 id="upcoming-heading">Upcoming</h3>
            {upcoming.length > 1 && (
              <span>{upcoming.length - 1} more booked</span>
            )}
          </div>
          <Link to={`/book/${next.businessSlug}`} className="upcoming-card">
            <span className="upcoming-date" aria-hidden="true">
              <span>{dayFormat.format(nextStart)}</span>
              <strong>{dateFormat.format(nextStart)}</strong>
              <span>{monthFormat.format(nextStart)}</span>
            </span>
            <span className="upcoming-body">
              <span className={`status-badge status-${next.booking.status}`}>
                {next.booking.status === 'PENDING'
                  ? 'Awaiting confirmation'
                  : 'Confirmed'}
              </span>
              <strong className="upcoming-service">
                {next.booking.service.name}
              </strong>
              <span className="upcoming-meta">
                {next.businessName} · {shortDateFormat.format(nextStart)},{' '}
                {timeFormat.format(nextStart)}–
                {timeFormat.format(new Date(next.booking.endDatetime))}
              </span>
            </span>
            <span className="upcoming-image">
              {nextBusiness ? (
                <BusinessImage business={nextBusiness} />
              ) : (
                <Monogram name={next.businessName} />
              )}
            </span>
          </Link>
        </section>
      )}

      {showPersonal && !searching && bookAgain.length > 0 && (
        <section className="browse-section" aria-labelledby="again-heading">
          <div className="browse-section-head">
            <h3 id="again-heading">Book again</h3>
          </div>
          <ul className="again-row">
            {bookAgain.map((entry) => {
              const business = businessesBySlug.get(entry.businessSlug)
              return (
                <li key={entry.businessSlug}>
                  <Link
                    to={`/book/${entry.businessSlug}`}
                    className="again-card"
                  >
                    <span className="again-image">
                      {business ? (
                        <BusinessImage business={business} />
                      ) : (
                        <Monogram name={entry.businessName} />
                      )}
                    </span>
                    <span className="again-text">
                      <strong>{entry.businessName}</strong>
                      <span>
                        {entry.booking.service.name} ·{' '}
                        {shortDateFormat.format(
                          new Date(entry.booking.startDatetime),
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <section className="browse-section">
          <p className="visually-hidden" role="status">
            Loading businesses…
          </p>
          <div className="venue-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="venue-card venue-card-skeleton">
                <span className="venue-image" />
                <span className="skeleton-line" />
                <span className="skeleton-line short" />
              </div>
            ))}
          </div>
        </section>
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
        <section
          className="browse-section"
          aria-labelledby="business-results-heading"
        >
          <div className="browse-section-head">
            <h3 id="business-results-heading">
              {query ? 'Search results' : 'All businesses'}
            </h3>
            <span>
              {filtered.length}{' '}
              {filtered.length === 1 ? 'business' : 'businesses'}
            </span>
          </div>
          <div className="venue-grid">
            {filtered.map((business) => (
              <Link
                key={business.id}
                to={`/book/${business.slug}`}
                className="venue-card"
              >
                <span className="venue-image">
                  <BusinessImage business={business} />
                  {business.autoConfirmBookings && (
                    <span className="venue-tag">Instant confirmation</span>
                  )}
                </span>
                <span className="venue-name">{business.name}</span>
                <span className="venue-location">
                  {[business.city, business.postalCode]
                    .filter(Boolean)
                    .join(' · ') || 'View services and book'}
                </span>
                {business.description && (
                  <span className="venue-description">
                    {business.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
