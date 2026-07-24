import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as authApi from '../api/auth'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import { AuthImageCarousel } from '../components/AuthImageCarousel'
import { useAuth } from '../context/AuthContext'
import { safeReturnTo, withReturnTo } from '../lib/navigation'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('returnTo'), '/')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setVerificationRequired(false)
    setResent(false)
    setLoading(true)

    try {
      await login({ email, password })
      // HomeRedirect sends business users to the dashboard and customers
      // to the booking pages
      navigate(returnTo)
    } catch (err) {
      let message = 'Unable to sign in. Please try again.'
      if (err instanceof ApiClientError) {
        message = getApiErrorMessage(err.status, err.body)
        if (err.status === 401) {
          message = 'Invalid email or password.'
        }
        if (
          err.body.code === 'EMAIL_NOT_VERIFIED' ||
          (err.status === 403 && /verif/i.test(err.message))
        ) {
          message = 'Please verify your email before signing in.'
          setVerificationRequired(true)
        }
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setResending(true)
    setError(null)
    try {
      await authApi.resendVerification(email)
      setResent(true)
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
    <div className="auth-split">
      <AuthImageCarousel />

      <div className="auth-split-content">
        <div className="card auth-card">
          <h2>Sign in</h2>
          <p>Access your customer account or business dashboard.</p>

          {error && <div className="error-banner">{error}</div>}
          {verificationRequired && (
            <div className="verification-action">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => void resend()}
                disabled={resending || !email}
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
              {resent && (
                <p className="field-hint" role="status">
                  If an account exists for that email, a new link has been sent.
                </p>
              )}
            </div>
          )}

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
            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-footer">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
          <p className="auth-footer">
            New here?{' '}
            <Link to={withReturnTo('/signup', returnTo)}>
              Create a customer account
            </Link>
          </p>
          <p className="auth-footer">
            Business accounts are set up personally.{' '}
            <Link to="/contact">Get in touch</Link> to request one.
          </p>
        </div>
      </div>
    </div>
  )
}
