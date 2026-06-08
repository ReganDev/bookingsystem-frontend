import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      let message = 'Unable to sign in. Please try again.'
      if (err instanceof ApiClientError) {
        message = getApiErrorMessage(err.status, err.body)
        if (err.status === 401) {
          message = 'Invalid email or password.'
        }
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Sign in</h2>
      <p>Access your business dashboard.</p>

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
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  )
}
