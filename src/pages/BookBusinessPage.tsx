import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError, getApiErrorMessage } from '../api/client'
import * as publicApi from '../api/public'
import { BookingCalendar } from '../components/BookingCalendar'
import { BusinessGallery } from '../components/BusinessGallery'
import { useAuth } from '../context/AuthContext'
import { withReturnTo } from '../lib/navigation'
import type { Booking, Business, Service, TimeSlot } from '../types/api'

function formatPrice(price?: number, currency = 'GBP') {
  if (price == null) return 'Price on request'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(price)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDayHeading(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

type Step = 1 | 2 | 3 | 4

type BookingDraft = {
  step: Step
  serviceId: string
  selectedDate: string
  selectedSlot: string
  customerNotes: string
  emailReminder: boolean
  smsReminder: boolean
}

const DRAFT_PREFIX = 'booking-draft:'

const STEP_LABELS: Record<Step, string> = {
  1: 'Service',
  2: 'Day',
  3: 'Time',
  4: 'Details',
}

export function BookBusinessPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isCustomer, isVerified, accessToken, user } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Booking | null>(null)

  const [step, setStep] = useState<Step>(1)
  const [serviceId, setServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [emailReminder, setEmailReminder] = useState(true)
  const [smsReminder, setSmsReminder] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [otpSession, setOtpSession] = useState<{
    id: string
    email: string
  } | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Logged-in customers get their details filled in automatically
  useEffect(() => {
    if (isCustomer && user) {
      setCustomer({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? '',
      })
    }
  }, [isCustomer, user])

  useEffect(() => {
    if (!slug) return
    try {
      const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${slug}`)
      if (raw) {
        const draft = JSON.parse(raw) as BookingDraft
        setStep(draft.step)
        setServiceId(draft.serviceId)
        setSelectedDate(draft.selectedDate)
        setSelectedSlot(draft.selectedSlot)
        setCustomerNotes(draft.customerNotes)
        setEmailReminder(draft.emailReminder)
        setSmsReminder(draft.smsReminder)
      }
    } catch {
      sessionStorage.removeItem(`${DRAFT_PREFIX}${slug}`)
    } finally {
      setDraftLoaded(true)
    }
  }, [slug])

  useEffect(() => {
    if (!slug || !draftLoaded || confirmation) return
    const draft: BookingDraft = {
      step,
      serviceId,
      selectedDate,
      selectedSlot,
      customerNotes,
      emailReminder,
      smsReminder,
    }
    sessionStorage.setItem(`${DRAFT_PREFIX}${slug}`, JSON.stringify(draft))
  }, [
    slug,
    draftLoaded,
    confirmation,
    step,
    serviceId,
    selectedDate,
    selectedSlot,
    customerNotes,
    emailReminder,
    smsReminder,
  ])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000,
    )
    return () => clearInterval(timer)
  }, [resendCooldown])

  const loadBusiness = useCallback(async () => {
    if (!slug) return

    setLoading(true)
    setError(null)

    try {
      const businessData = await publicApi.getBusinessBySlug(slug)
      const serviceList = await publicApi.getActiveServices(businessData.id)
      setBusiness(businessData)
      setServices(serviceList)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load this business.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadBusiness()
  }, [loadBusiness])

  const loadSlots = useCallback(async () => {
    if (!business || !serviceId || !selectedDate) {
      setSlots([])
      return
    }

    setSlotsLoading(true)
    setSelectedSlot('')

    try {
      const available = await publicApi.getAvailability(
        business.id,
        serviceId,
        selectedDate,
      )
      setSlots(available)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [business, serviceId, selectedDate])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  function resetOtpSession() {
    setOtpSession(null)
    setOtpCode('')
    setResendCooldown(0)
  }

  function pickService(id: string) {
    resetOtpSession()
    if (id !== serviceId) {
      setServiceId(id)
      setSelectedDate('')
      setSelectedSlot('')
    }
    setStep(2)
  }

  function pickDay(isoDate: string) {
    resetOtpSession()
    setSelectedDate(isoDate)
    setStep(3)
  }

  function pickSlot(startDatetime: string) {
    resetOtpSession()
    setSelectedSlot(startDatetime)
    setStep(4)
  }

  function goBack() {
    resetOtpSession()
    setStep((current) => Math.max(1, current - 1) as Step)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (
      !business ||
      !selectedSlot ||
      !isCustomer ||
      !isVerified ||
      !accessToken
    ) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const booking = await publicApi.createPublicBooking(
        business.id,
        {
          customer: {
            ...customer,
            phone: customer.phone || undefined,
          },
          serviceId,
          startDatetime: selectedSlot,
          customerNotes: customerNotes || undefined,
          emailReminder,
          smsReminder,
        },
        accessToken,
      )
      if (slug) {
        sessionStorage.removeItem(`${DRAFT_PREFIX}${slug}`)
      }
      setConfirmation(booking)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err.status, err.body)
          : 'Unable to create booking. Please try again.'
      setError(message)
      // The slot may have been taken while the form was open
      setStep(3)
      loadSlots()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGuestStart(event: FormEvent) {
    event.preventDefault()
    if (!business || !selectedSlot) return
    setSubmitting(true)
    setError(null)
    try {
      const session = await publicApi.startGuestBooking({
        businessId: business.id,
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email: customer.email.trim(),
        phone: customer.phone || undefined,
        serviceId,
        startDatetime: selectedSlot,
        customerNotes: customerNotes || undefined,
        emailReminder,
        smsReminder,
      })
      setOtpSession({ id: session.bookingSessionId, email: customer.email.trim() })
      setOtpCode('')
      setResendCooldown(60)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err.status, err.body)
          : 'Unable to send your code. Please try again.'
      setError(message)
      if (err instanceof ApiClientError && err.status === 409) {
        // Slot taken while filling in details: back to time selection
        setStep(3)
        loadSlots()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGuestVerify(event: FormEvent) {
    event.preventDefault()
    if (!otpSession) return
    setSubmitting(true)
    setError(null)
    try {
      const booking = await publicApi.verifyGuestBooking(otpSession.id, otpCode)
      if (slug) sessionStorage.removeItem(`${DRAFT_PREFIX}${slug}`)
      setConfirmation(booking)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err.status, err.body)
          : 'Unable to confirm your booking. Please try again.'
      setError(message)
      if (err instanceof ApiClientError && err.status === 409) {
        // Slot taken while verifying: back to time selection
        setOtpSession(null)
        setStep(3)
        loadSlots()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGuestResend() {
    if (!otpSession || resendCooldown > 0) return
    setResendCooldown(60)
    try {
      await publicApi.resendGuestBookingCode(otpSession.id)
    } catch {
      // Resend is best-effort; the cooldown still applies
    }
  }

  if (loading) {
    return (
      <div className="panel booking-panel" role="status">
        <p className="slot-hint">Loading booking page…</p>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="panel">
        {error && <div className="error-banner">{error}</div>}
        <div className="empty-state">
          Business not found.{' '}
          <Link to="/book">Choose another business</Link>
        </div>
      </div>
    )
  }

  if (confirmation) {
    const isConfirmed = confirmation.status === 'CONFIRMED'
    return (
      <div className="panel booking-panel booking-confirmation">
        <div className="confirmation-mark" aria-hidden="true">
          ✓
        </div>
        <div>
          <p className="booking-eyebrow">
            {isConfirmed ? 'Confirmed ✓' : 'Request sent'}
          </p>
          <h2>Thanks, {confirmation.customer.firstName}</h2>
          <p>
            Your appointment with <strong>{business.name}</strong> for{' '}
            <strong>{confirmation.service.name}</strong> on{' '}
            <strong>{formatDateTime(confirmation.startDatetime)}</strong>{' '}
            {isConfirmed ? 'is booked.' : 'has been sent.'}
          </p>
        </div>
        <p className="confirmation-note">
          {isConfirmed ? (
            <>
              You&apos;re booked — there&apos;s nothing else you need to do.
              If anything changes, {business.name} will contact you at{' '}
              <strong>{confirmation.customer.email}</strong>.
            </>
          ) : (
            <>
              {business.name} will confirm your appointment. You&apos;ll hear
              back at <strong>{confirmation.customer.email}</strong>.
              There&apos;s nothing else you need to do.
            </>
          )}
        </p>
        <div className="actions-row">
          <Link to="/book" className="btn btn-secondary">
            Book with another business
          </Link>
          <Link to={`/book/${business.slug}`} className="btn btn-primary">
            Make another booking
          </Link>
        </div>
      </div>
    )
  }

  const selectedService = services.find((service) => service.id === serviceId)

  const stepSummaries: Record<Step, string | null> = {
    1: selectedService?.name ?? null,
    2: selectedDate ? formatDayHeading(selectedDate) : null,
    3: selectedSlot ? formatTime(selectedSlot) : null,
    4: null,
  }

  const photos = business.photoUrls ?? []

  return (
    <div className={`booking-layout ${photos.length > 0 ? '' : 'no-photos'}`}>
      <BusinessGallery photos={photos} businessName={business.name} />

      <div className="panel booking-panel">
        <Link to="/book" className="back-link">
          ← All businesses
        </Link>

      <div className="booking-business-header">
        <div className="booking-business-avatar" aria-hidden="true">
          {business.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="booking-eyebrow">Book an appointment</p>
          <h2>{business.name}</h2>
          {business.description && (
            <p className="panel-subtitle">{business.description}</p>
          )}
          {(business.city || business.country) && (
            <p className="booking-location">
              {[business.city, business.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {services.length === 0 ? (
        <div className="empty-state">
          This business has no services available to book right now.
        </div>
      ) : (
        <>
          <ol className="wizard-progress" aria-label="Booking progress">
            {([1, 2, 3, 4] as Step[]).map((n) => (
              <li
                key={n}
                className={`wizard-progress-step ${
                  n === step ? 'current' : n < step ? 'done' : ''
                }`}
              >
                <button
                  type="button"
                  className="wizard-progress-button"
                  onClick={() => {
                    resetOtpSession()
                    setStep(n)
                  }}
                  disabled={n >= step}
                  aria-current={n === step ? 'step' : undefined}
                >
                  <span className="wizard-progress-marker">
                    {n < step ? '✓' : n}
                  </span>
                  <span className="wizard-progress-text">
                    <span className="wizard-progress-label">
                      {STEP_LABELS[n]}
                    </span>
                    {n < step && stepSummaries[n] && (
                      <span className="wizard-progress-value">
                        {stepSummaries[n]}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="wizard-step" key={step}>
            <p className="wizard-step-count">Step {step} of 4</p>
            {step > 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm wizard-back"
                onClick={goBack}
              >
                ← Back
              </button>
            )}

            {step === 1 && (
              <section className="form-section">
                <h4>Choose a service</h4>
                <p className="wizard-step-intro">
                  Select the appointment that works for you.
                </p>
                <div className="service-options">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`service-option ${
                        serviceId === service.id ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="service"
                        value={service.id}
                        checked={serviceId === service.id}
                        onChange={() => pickService(service.id)}
                        onClick={() => pickService(service.id)}
                      />
                      <div className="service-option-content">
                        <div className="service-option-name">
                          {service.name}
                        </div>
                        <div className="service-option-meta">
                          <span>{service.durationMinutes} min</span>
                          <strong>
                            {formatPrice(
                            service.price,
                            business.currency ?? 'GBP',
                          )}
                          </strong>
                        </div>
                        {service.description && (
                          <div className="service-option-description">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="form-section">
                <h4>Pick a day</h4>
                <p className="wizard-step-intro">
                  Available dates are highlighted below.
                </p>
                <BookingCalendar
                  businessId={business.id}
                  serviceId={serviceId}
                  advanceDays={business.bookingAdvanceDays ?? 30}
                  selectedDate={selectedDate}
                  onSelect={pickDay}
                />
              </section>
            )}

            {step === 3 && (
              <section className="form-section">
                <h4>Pick a time</h4>
                <p className="wizard-step-intro">
                  All times are shown in your local timezone.
                </p>
                <div className="form-row">
                  <span className="form-label">
                    Times for {formatDayHeading(selectedDate)}
                  </span>
                  {slotsLoading ? (
                    <p className="slot-hint">Checking availability…</p>
                  ) : slots.length === 0 ? (
                    <p className="slot-hint">
                      No available times on this date. Go back and pick
                      another day.
                    </p>
                  ) : (
                    <div className="slot-grid">
                      {slots.map((slot) => (
                        <button
                          key={slot.startDatetime}
                          type="button"
                          className={`slot-option ${
                            selectedSlot === slot.startDatetime
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() => pickSlot(slot.startDatetime)}
                        >
                          {formatTime(slot.startDatetime)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 4 && (
              isCustomer && isVerified ? (
              <form className="form-grid booking-form" onSubmit={handleSubmit}>
                <section className="form-section">
                  <h4>Your details</h4>
                  <p className="slot-hint">
                    Your verified account details will be used for this
                    booking.
                  </p>
                  <div className="booking-name-fields">
                    <div className="form-row">
                      <label htmlFor="firstName">First name</label>
                      <input
                        id="firstName"
                        autoComplete="given-name"
                        value={customer.firstName}
                        readOnly
                        required
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="lastName">Last name</label>
                      <input
                        id="lastName"
                        autoComplete="family-name"
                        value={customer.lastName}
                        readOnly
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={customer.email}
                      readOnly
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={customer.phone}
                      readOnly
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="notes">Notes (optional)</label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={emailReminder}
                        onChange={(e) => setEmailReminder(e.target.checked)}
                      />
                      <span>
                        Email me my booking details
                        <span className="field-hint">
                          {' '}
                          (sent to the email address above)
                        </span>
                      </span>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={smsReminder}
                        onChange={(e) => setSmsReminder(e.target.checked)}
                        disabled
                      />
                      <span>
                        Send me an SMS reminder
                        <span className="field-hint"> (coming soon)</span>
                      </span>
                    </label>
                  </div>
                </section>

                {selectedService && selectedSlot && (
                  <div className="booking-summary">
                    <p className="booking-summary-label">Your appointment</p>
                    <strong>{selectedService.name}</strong>
                    <span>
                      {formatDayHeading(selectedDate)} at{' '}
                      {formatTime(selectedSlot)}
                    </span>
                    <span>
                      {selectedService.durationMinutes} min ·{' '}
                      {formatPrice(
                        selectedService.price,
                        business.currency ?? 'GBP',
                      )}
                    </span>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting || !selectedSlot}
                >
                  {submitting ? 'Sending request…' : 'Request appointment'}
                </button>
              </form>
              ) : otpSession ? (
                <form className="form-grid booking-form" onSubmit={handleGuestVerify}>
                  <section className="form-section">
                    <h4>Check your email</h4>
                    <p className="slot-hint">
                      We sent a code to <strong>{otpSession.email}</strong>.
                      Enter it below to confirm your booking.
                    </p>
                    <div className="form-row">
                      <label htmlFor="otp-code">6-digit code</label>
                      <input
                        id="otp-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.replace(/\D/g, ''))
                        }
                        required
                        autoFocus
                      />
                    </div>
                    <div className="actions-row">
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={submitting || otpCode.length !== 6}
                      >
                        {submitting ? 'Confirming…' : 'Confirm booking'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGuestResend}
                        disabled={resendCooldown > 0}
                      >
                        {resendCooldown > 0
                          ? `Resend code (${resendCooldown}s)`
                          : 'Resend code'}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={resetOtpSession}
                    >
                      Wrong email? Edit your details
                    </button>
                  </section>
                </form>
              ) : (
                <form className="form-grid booking-form" onSubmit={handleGuestStart}>
                  <section className="form-section">
                    <h4>Your details</h4>
                    <p className="slot-hint">
                      No account needed — we&apos;ll email you a code to
                      confirm your booking.{' '}
                      <Link to={withReturnTo('/login', `/book/${slug}`)}>
                        Have an account? Sign in
                      </Link>
                    </p>
                    <div className="booking-name-fields">
                      <div className="form-row">
                        <label htmlFor="firstName">First name</label>
                        <input
                          id="firstName"
                          autoComplete="given-name"
                          value={customer.firstName}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, firstName: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="form-row">
                        <label htmlFor="lastName">Last name</label>
                        <input
                          id="lastName"
                          autoComplete="family-name"
                          value={customer.lastName}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, lastName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={customer.email}
                        onChange={(e) =>
                          setCustomer((c) => ({ ...c, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="phone">Phone (optional)</label>
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={customer.phone}
                        onChange={(e) =>
                          setCustomer((c) => ({ ...c, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="notes">Notes (optional)</label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                      />
                    </div>
                  </section>

                  {selectedService && selectedSlot && (
                    <div className="booking-summary">
                      <p className="booking-summary-label">Your appointment</p>
                      <strong>{selectedService.name}</strong>
                      <span>
                        {formatDayHeading(selectedDate)} at {formatTime(selectedSlot)}
                      </span>
                      <span>
                        {selectedService.durationMinutes} min ·{' '}
                        {formatPrice(selectedService.price, business.currency ?? 'GBP')}
                      </span>
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={submitting || !selectedSlot}
                  >
                    {submitting ? 'Sending code…' : 'Email me a code'}
                  </button>
                </form>
              )
            )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
