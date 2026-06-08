import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await register({
        ...form,
        phone: form.phone || undefined,
      })
      navigate('/dashboard')
    } catch (err) {
      let message = 'Unable to create account. Please try again.'
      if (err instanceof ApiClientError) {
        message = getApiErrorMessage(err.status, err.body)
        if (err.status === 409) {
          message = 'That email is already registered. Try signing in instead.'
        }
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Create account</h2>
      <p>Register your business and start managing bookings.</p>

      {error && <div className="error-banner">{error}</div>}

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
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            value={form.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            value={form.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
            autoComplete="email"
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
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
