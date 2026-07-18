import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function SignUpPage() {
  const { registerCustomer } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
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
      await registerCustomer({
        ...form,
        phone: form.phone || undefined,
      })
      navigate('/book')
    } catch (err) {
      let message = 'Unable to create your account. Please try again.'
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
      <h2>Create your account</h2>
      <p>
        Sign up to book appointments quickly, with your details filled in for
        you.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            value={form.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            required
            autoComplete="given-name"
          />
        </div>
        <div className="form-row">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            value={form.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            required
            autoComplete="family-name"
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
            autoComplete="tel"
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
          <span className="field-hint">At least 8 characters.</span>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      <p className="auth-footer">
        Run a business? <Link to="/contact">Get in touch</Link> about taking
        bookings.
      </p>
    </div>
  )
}
