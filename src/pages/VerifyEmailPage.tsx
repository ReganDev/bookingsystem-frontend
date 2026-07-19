import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as authApi from '../api/auth'
import { ApiClientError } from '../api/client'
import { safeReturnTo, withReturnTo } from '../lib/navigation'

type VerificationState = 'verifying' | 'success' | 'error'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const returnTo = safeReturnTo(
    searchParams.get('returnTo') ??
      sessionStorage.getItem('verification-return-to'),
    '/',
  )
  const [state, setState] = useState<VerificationState>('verifying')
  const [message, setMessage] = useState('Verifying your email…')
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    if (!token) {
      setState('error')
      setMessage('This verification link is missing its token.')
      return
    }

    authApi
      .verifyEmail(token)
      .then((response) => {
        sessionStorage.removeItem('verification-return-to')
        setState('success')
        setMessage(response.message || 'Your email has been verified.')
      })
      .catch((err) => {
        setState('error')
        setMessage(
          err instanceof ApiClientError
            ? err.message
            : 'This verification link is invalid or has expired.',
        )
      })
  }, [token])

  return (
    <div className="card verification-card">
      <div
        className={`verification-mark verification-${state}`}
        aria-hidden="true"
      >
        {state === 'verifying' ? '…' : state === 'success' ? '✓' : '!'}
      </div>
      <h2>
        {state === 'verifying'
          ? 'Verifying email'
          : state === 'success'
            ? 'Email verified'
            : 'Link not accepted'}
      </h2>
      <p role="status">{message}</p>

      {state === 'success' && (
        <Link
          className="btn btn-primary"
          to={withReturnTo('/login', returnTo)}
        >
          Continue to sign in
        </Link>
      )}
      {state === 'error' && (
        <p className="auth-footer">
          Return to <Link to="/login">sign in</Link> to request another link.
        </p>
      )}
    </div>
  )
}
