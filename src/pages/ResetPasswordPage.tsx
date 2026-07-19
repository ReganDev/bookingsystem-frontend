import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as authApi from '../api/auth'
import { ApiClientError } from '../api/client'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to reset your password. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="card">
        <h2>Link not accepted</h2>
        <p>This password reset link is missing its token.</p>
        <p className="auth-footer">
          Request a new link from the{' '}
          <Link to="/forgot-password">forgot password</Link> page.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="card">
        <h2>Password updated</h2>
        <p role="status">
          Your password has been reset. You can now sign in with your new
          password.
        </p>
        <Link className="btn btn-primary" to="/login">
          Continue to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Choose a new password</h2>
      <p>Enter a new password for your account.</p>

      {error && <div className="error-banner">{error}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
          />
        </div>
        <div className="form-row">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <p className="auth-footer">
        Link expired? Request a new one from the{' '}
        <Link to="/forgot-password">forgot password</Link> page.
      </p>
    </div>
  )
}
