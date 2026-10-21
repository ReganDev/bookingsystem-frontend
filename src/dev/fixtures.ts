// Sample data for `npm run dev:mock`. Every business here is fictional.
import type {
  AuthResponse,
  Booking,
  BookingStatus,
  Business,
  CustomerBooking,
  Service,
  User,
} from '../types/api'

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=75&auto=format&fit=crop`

const base = {
  country: 'United Kingdom',
  currency: 'GBP',
  timezone: 'Europe/London',
  bookingAdvanceDays: 30,
  bookingNoticeHours: 2,
  cancellationNoticeHours: 24,
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  isActive: true,
}

export const businesses: Business[] = [
  {
    ...base,
    id: 'mock-nails',
    slug: 'polished-nail-bar',
    name: 'Polished Nail Bar',
    description:
      'Gel, BIAB and hand-painted nail art in a calm studio just off Briggate.',
    addressLine1: '14 Kirkgate',
    city: 'Leeds',
    postalCode: 'LS1 6HB',
    phone: '0113 496 0001',
    photoUrls: [photo('1604654894610-df63bc536371')],
    autoConfirmBookings: true,
  },
  {
    ...base,
    id: 'mock-barber',
    slug: 'northside-barbers',
    name: 'Northside Barbers',
    description:
      'Skin fades, beard sculpting and hot towel shaves. Walk-ins welcome.',
    addressLine1: '3 Station Parade',
    city: 'Harrogate',
    postalCode: 'HG1 1BA',
    phone: '01423 496 002',
    photoUrls: [
      photo('1503951914875-452162b0f3f1'),
      photo('1621605815971-fbc98d665033'),
    ],
    autoConfirmBookings: true,
  },
  {
    ...base,
    id: 'mock-hair',
    slug: 'linden-hair-studio',
    name: 'Linden Hair Studio',
    description:
      'Colour specialists — balayage, lived-in blondes and precision cuts.',
    addressLine1: '22 Gillygate',
    city: 'York',
    postalCode: 'YO31 7EQ',
    phone: '01904 496 003',
    photoUrls: [
      photo('1522337360788-8b13dee7a37e'),
      photo('1560066984-138dadb4c035'),
    ],
    autoConfirmBookings: false,
  },
  {
    ...base,
    id: 'mock-massage',
    slug: 'restore-sports-massage',
    name: 'Restore Sports Massage',
    description:
      'Deep tissue and sports massage for runners, lifters and desk backs.',
    addressLine1: '8 Micklegate',
    city: 'York',
    postalCode: 'YO1 6JX',
    phone: '01904 496 004',
    photoUrls: [photo('1544161515-4ab6ce6db874')],
    autoConfirmBookings: false,
  },
  {
    ...base,
    id: 'mock-skin',
    slug: 'the-glow-room',
    name: 'The Glow Room',
    description: 'Facials, brows and lashes with a skin-first approach.',
    addressLine1: '51 Otley Road',
    city: 'Leeds',
    postalCode: 'LS6 3AB',
    phone: '0113 496 0005',
    photoUrls: [photo('1570172619644-dfd03ed5d881')],
    autoConfirmBookings: true,
  },
  {
    ...base,
    id: 'mock-groom',
    slug: 'pawfect-mobile-grooming',
    name: 'Pawfect Mobile Grooming',
    description:
      'Full grooms, baths and nail trims from our van, right outside your door.',
    city: 'Wakefield',
    postalCode: 'WF1 2DD',
    phone: '01924 496 006',
    photoUrls: [photo('1516734212186-a967f81ad0d7')],
    autoConfirmBookings: false,
  },
]

const serviceMenus: Record<string, [string, number, number][]> = {
  'mock-nails': [
    ['Gel manicure', 45, 28],
    ['BIAB overlay', 60, 35],
    ['BIAB infill', 60, 32],
    ['Nail art (per hand)', 15, 8],
  ],
  'mock-barber': [
    ['Skin fade', 45, 22],
    ['Scissor cut', 30, 18],
    ['Beard trim & shape', 20, 12],
    ['Hot towel shave', 30, 20],
  ],
  'mock-hair': [
    ['Cut & blow dry', 60, 48],
    ['Full head balayage', 180, 145],
    ['Root colour', 90, 65],
  ],
  'mock-massage': [
    ['Sports massage (30 min)', 30, 35],
    ['Sports massage (60 min)', 60, 55],
    ['Deep tissue (90 min)', 90, 80],
  ],
  'mock-skin': [
    ['Signature facial', 60, 55],
    ['Brow lamination', 45, 40],
    ['Lash lift & tint', 45, 42],
  ],
  'mock-groom': [
    ['Full groom (small dog)', 90, 45],
    ['Full groom (large dog)', 120, 65],
    ['Bath & brush', 60, 30],
  ],
}

export const services: Service[] = Object.entries(serviceMenus).flatMap(
  ([businessId, menu]) =>
    menu.map(([name, durationMinutes, price], index) => ({
      id: `${businessId}-svc-${index}`,
      businessId,
      name,
      durationMinutes,
      price,
      displayOrder: index,
      isActive: true,
      requiresCustomerAddress: businessId === 'mock-groom',
    })),
)

export const customer: User = {
  id: 'mock-customer',
  email: 'alex@example.com',
  firstName: 'Alex',
  lastName: 'Morgan',
  fullName: 'Alex Morgan',
  role: 'CUSTOMER',
  isActive: true,
  emailVerified: true,
}

export function customerAuth(): AuthResponse {
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: customer,
    business: null,
  }
}

function at(daysFromToday: number, hour: number, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  date.setHours(hour, minute, 0, 0)
  return date
}

function customerBooking(
  businessId: string,
  serviceIndex: number,
  daysFromToday: number,
  hour: number,
  status: BookingStatus,
): CustomerBooking {
  const business = businesses.find((b) => b.id === businessId)!
  const service = services.find(
    (s) => s.id === `${businessId}-svc-${serviceIndex}`,
  )!
  const start = at(daysFromToday, hour)
  const end = new Date(start.getTime() + service.durationMinutes * 60000)
  const booking: Booking = {
    id: `mock-booking-${businessId}-${daysFromToday}`,
    businessId,
    status,
    startDatetime: start.toISOString(),
    endDatetime: end.toISOString(),
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
  return {
    booking,
    businessName: business.name,
    businessSlug: business.slug,
    businessEmail: business.email,
    businessPhone: business.phone,
    canCancel: daysFromToday > 1,
    canReschedule: daysFromToday > 1,
  }
}

/** Relative to today, so the "upcoming" and "book again" sections always fill. */
export function customerBookings(): CustomerBooking[] {
  return [
    customerBooking('mock-nails', 2, 2, 14, 'CONFIRMED'),
    customerBooking('mock-barber', 0, 9, 10, 'PENDING'),
    customerBooking('mock-massage', 1, -12, 17, 'COMPLETED'),
    customerBooking('mock-nails', 0, -27, 11, 'COMPLETED'),
    customerBooking('mock-groom', 0, -41, 9, 'COMPLETED'),
    customerBooking('mock-skin', 1, -55, 15, 'CANCELLED'),
  ]
}
