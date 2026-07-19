import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as authApi from '../api/auth'
import { ApiClientError } from '../api/client'
import { safeReturnTo, withReturnTo } from '../lib/navigation'

export function CheckEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')?.trim() ?? ''
  const returnTo = safeReturnTo(searchParams.get('returnTo'), '/book')
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resend() {
    if (!email) return
    setResending(true)
    setMessage(null)
    setError(null)
    try {
      await authApi.resendVerification(email)
      setMessage('If an account exists for that email, a new link has been sent.')
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to resend the verification email.',
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="card verification-card">
      <div className="verification-mark" aria-hidden="true">
        ✉
      </div>
      <h2>Check your email</h2>
      <p>
        We sent a verification link{email ? ` to ${email}` : ''}. Open it to
        confirm your account before signing in or booking.
      </p>

      {error && <div className="error-banner">{error}</div>}
      {message && (
        <div className="success-banner" role="status">
          <p>{message}</p>
        </div>
      )}

      {email && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void resend()}
          disabled={resending}
        >
          {resending ? 'Sending…' : 'Resend verification email'}
        </button>
      )}

      <p className="auth-footer">
        Already verified?{' '}
        <Link to={withReturnTo('/login', returnTo)}>Sign in</Link>
      </p>
    </div>
  )
}
