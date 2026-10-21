// Dev harness: answers /api/v1 requests from fixtures so the customer-facing
// pages can be viewed without the backend. Enabled by `npm run dev:mock`
// (VITE_MOCK_API=true); never bundled into production builds.
//
// Personas, via the URL:  ?as=customer  signs in as a returning customer
//                         ?as=guest     signs out
import type {
  Booking,
  GuestBookingStartRequest,
  PublicBookingRequest,
  TimeSlot,
} from '../types/api'
import {
  businesses,
  customer,
  customerAuth,
  customerBookings,
  services,
} from './fixtures'

const AUTH_STORAGE_KEY = 'booking-auth'
const LATENCY_MS = 350

type Handler = (match: RegExpMatchArray, url: URL, body: unknown) => unknown

const json = (status: number, data?: unknown) =>
  new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Open Monday to Saturday, from tomorrow up to the advance-booking window. */
function availableDays(month: string): string[] {
  const days: string[] = []
  for (let offset = 1; offset <= 30; offset++) {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    const key = toDateKey(date)
    if (date.getDay() !== 0 && key.startsWith(month)) days.push(key)
  }
  return days
}

function slotsFor(serviceId: string, date: string): TimeSlot[] {
  const service = services.find((s) => s.id === serviceId)
  const duration = service?.durationMinutes ?? 30
  const slots: TimeSlot[] = []
  for (
    let minutes = 9 * 60;
    minutes + duration <= 17 * 60 + 30;
    minutes += 30
  ) {
    // Knock out a few slots so the day doesn't look empty-booked.
    if ((minutes / 30 + date.length) % 4 === 0) continue
    const start = new Date(
      `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`,
    )
    if (start.getTime() < Date.now()) continue
    slots.push({
      startDatetime: start.toISOString(),
      endDatetime: new Date(start.getTime() + duration * 60000).toISOString(),
    })
  }
  return slots
}

function fakeBooking(
  businessId: string,
  request: Partial<PublicBookingRequest>,
): Booking {
  const service =
    services.find((s) => s.id === request.serviceId) ?? services[0]
  const start = request.startDatetime ?? new Date().toISOString()
  return {
    id: `mock-booking-${Date.now()}`,
    businessId,
    status: businesses.find((b) => b.id === businessId)?.autoConfirmBookings
      ? 'CONFIRMED'
      : 'PENDING',
    startDatetime: start,
    endDatetime: new Date(
      new Date(start).getTime() + service.durationMinutes * 60000,
    ).toISOString(),
    price: service.price,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
    },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
    },
  }
}

let lastGuestRequest: Partial<GuestBookingStartRequest> = {}

const routes: [string, RegExp, Handler][] = [
  ['GET', /^\/public\/businesses$/, () => businesses],
  [
    'GET',
    /^\/public\/businesses\/slug\/([^/]+)$/,
    ([, slug]) =>
      businesses.find((b) => b.slug === slug) ??
      json(404, { message: 'Business not found' }),
  ],
  [
    'GET',
    /^\/public\/businesses\/([^/]+)\/services$/,
    ([, id]) => services.filter((s) => s.businessId === id),
  ],
  [
    'GET',
    /^\/public\/businesses\/[^/]+\/availability\/days$/,
    (_, url) => availableDays(url.searchParams.get('month') ?? ''),
  ],
  [
    'GET',
    /^\/public\/businesses\/[^/]+\/availability$/,
    (_, url) =>
      slotsFor(
        url.searchParams.get('serviceId') ?? '',
        url.searchParams.get('date') ?? '',
      ),
  ],
  [
    'POST',
    /^\/public\/businesses\/([^/]+)\/bookings$/,
    ([, id], _, body) => fakeBooking(id, body as PublicBookingRequest),
  ],
  [
    'POST',
    /^\/public\/bookings\/start$/,
    (_, __, body) => {
      lastGuestRequest = body as GuestBookingStartRequest
      return {
        bookingSessionId: 'mock-session',
        expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
      }
    },
  ],
  // Any 6-digit code works in mock mode.
  [
    'POST',
    /^\/public\/bookings\/verify$/,
    () =>
      fakeBooking(
        lastGuestRequest.businessId ?? businesses[0].id,
        lastGuestRequest,
      ),
  ],
  ['POST', /^\/public\/bookings\/resend$/, () => undefined],
  ['POST', /^\/public\/enquiry$/, () => undefined],
  ['GET', /^\/customers\/me\/bookings$/, () => customerBookings()],
  ['POST', /^\/auth\/login$/, () => customerAuth()],
  ['POST', /^\/auth\/refresh$/, () => customerAuth()],
  ['POST', /^\/auth\/logout$/, () => undefined],
]

function applyPersona() {
  const url = new URL(window.location.href)
  const persona = url.searchParams.get('as')
  if (!persona) return
  if (persona === 'customer') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customerAuth()))
  } else if (persona === 'guest') {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  url.searchParams.delete('as')
  window.history.replaceState(null, '', url)
}

export function installMockApi() {
  applyPersona()
  const realFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
      window.location.origin,
    )
    if (!url.pathname.startsWith('/api/v1/')) return realFetch(input, init)

    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.pathname.slice('/api/v1'.length)
    const body =
      typeof init?.body === 'string' ? JSON.parse(init.body) : undefined

    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

    for (const [routeMethod, pattern, handler] of routes) {
      const match = path.match(pattern)
      if (routeMethod !== method || !match) continue
      const result = handler(match, url, body)
      if (result instanceof Response) return result
      return result === undefined
        ? new Response(null, { status: 204 })
        : json(200, result)
    }
    return json(404, {
      message: `Not available in mock mode: ${method} ${path}`,
    })
  }

  console.info(
    '[mock api] Serving fixture data. Add ?as=customer or ?as=guest to switch persona.',
  )
}
