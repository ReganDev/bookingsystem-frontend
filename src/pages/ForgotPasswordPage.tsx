import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as authApi from '../api/auth'
import { ApiClientError } from '../api/client'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to send the reset email. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p role="status">
          If an account exists for {email}, a password reset link has been
          sent. The link expires shortly, so use it soon.
        </p>
        <p className="auth-footer">
          Back to <Link to="/login">sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Forgot your password?</h2>
      <p>
        Enter the email you signed up with and we&apos;ll send you a link to
        reset your password.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="auth-footer">
        Remembered it? <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  )
}
