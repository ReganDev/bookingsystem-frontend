import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as adminApi from '../api/admin'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Business } from '../types/api'

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  const pick = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)]
  let password = pick(upper) + pick(lower) + pick(digits)
  for (let i = 0; i < 9; i++) {
    password += pick(all)
  }
  return password
}

const EMPTY_FORM = {
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
}

export function AdminPage() {
  const { accessToken, user, logout } = useAuth()
  const token = accessToken!

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<{
    businessName: string
    email: string
    password: string
  } | null>(null)

  const loadBusinesses = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      setBusinesses(await adminApi.listBusinesses(token))
    } catch (err) {
      setListError(
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load businesses.',
      )
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const account = await adminApi.createBusinessAccount(
        {
          businessName: form.businessName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        },
        token,
      )
      setCreated({
        businessName: account.business.name,
        email: form.email,
        password: form.password,
      })
      setForm({ ...EMPTY_FORM })
      await loadBusinesses()
    } catch (err) {
      let message = 'Unable to create the account. Please try again.'
      if (err instanceof ApiClientError) {
        message = getApiErrorMessage(err.status, err.body)
      }
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Admin console</h1>
        <div className="app-header-meta">
          <Link to="/book" className="header-link">
            Customer booking page
          </Link>
          <span>{user?.email}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <div className="panel">
          <div className="panel-header">
            <h3>Create a business account</h3>
          </div>
          <p className="panel-hint">
            Sets up the business and its owner login in one go. Share the email
            and password with the business owner; they sign in at the normal
            login page.
          </p>

          {created && (
            <div className="success-banner">
              <h3>{created.businessName} created</h3>
              <p>
                Login: <strong>{created.email}</strong> · Password:{' '}
                <strong>{created.password}</strong>
              </p>
              <p>
                Copy these now and share them securely. The password is not
                shown again.
              </p>
            </div>
          )}

          {formError && <div className="error-banner">{formError}</div>}

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="businessName">Business name</label>
              <input
                id="businessName"
                value={form.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="firstName">Owner first name</label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="lastName">Owner last name</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="email">Owner email (their login)</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="password">Password</label>
              <div className="password-row">
                <input
                  id="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                  minLength={8}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => updateField('password', generatePassword())}
                >
                  Generate
                </button>
              </div>
              <span className="field-hint">
                Shown in plain text so you can copy it for the owner.
              </span>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create business account'}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Businesses</h3>
            <span>{businesses.length} total</span>
          </div>

          {listError && <div className="error-banner">{listError}</div>}

          {loading ? (
            <p className="slot-hint">Loading…</p>
          ) : businesses.length === 0 ? (
            <div className="empty-state">
              <strong>No businesses yet</strong>
              <p>Accounts you create will appear here.</p>
            </div>
          ) : (
            <div className="list">
              {businesses.map((business) => (
                <div key={business.id} className="list-item">
                  <div className="list-item-title">{business.name}</div>
                  <div className="list-item-meta">
                    {business.email} · /book/{business.slug} ·{' '}
                    {business.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
