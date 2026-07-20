import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as businessesApi from '../api/businesses'
import { ApiClientError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { DashboardPage } from './DashboardPage'
import type { Business } from '../types/api'

export function AdminBusinessDashboardPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { accessToken, logout } = useAuth()
  const token = accessToken!

  const [business, setBusiness] = useState<Business | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadBusiness = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      setBusiness(await businessesApi.getBusiness(businessId, token))
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load this business.',
      )
    } finally {
      setLoading(false)
    }
  }, [businessId, token])

  useEffect(() => {
    loadBusiness()
  }, [loadBusiness])

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{business?.name ?? 'Business dashboard'}</h1>
        <div className="app-header-meta">
          <Link to="/admin" className="header-link">
            Back to admin console
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="panel">
            <p>Loading…</p>
          </div>
        ) : (
          business && <DashboardPage business={business} token={token} />
        )}
      </main>
    </div>
  )
}
