import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import { submitEnquiry } from '../api/public'

export function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    businessName: '',
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await submitEnquiry({
        ...form,
        businessName: form.businessName || undefined,
      })
      setSent(true)
    } catch (err) {
      let message = 'Unable to send your enquiry. Please try again.'
      if (err instanceof ApiClientError) {
        message = getApiErrorMessage(err.status, err.body)
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card">
        <div className="success-banner">
          <h3>Thanks, {form.name.split(' ')[0] || 'there'}!</h3>
          <p>
            Your enquiry has been sent. We&apos;ll get back to you at{' '}
            <strong>{form.email}</strong> as soon as possible.
          </p>
        </div>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Get in touch</h2>
      <p>
        Want to take bookings for your business? Accounts are set up personally
        for each business — send us a message and we&apos;ll get you started.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            autoComplete="name"
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
          <span className="field-hint">We&apos;ll reply to this address.</span>
        </div>
        <div className="form-row">
          <label htmlFor="businessName">Business name (optional)</label>
          <input
            id="businessName"
            value={form.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            rows={5}
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            required
            placeholder="Tell us a little about your business and what you'd like to offer bookings for."
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send enquiry'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
