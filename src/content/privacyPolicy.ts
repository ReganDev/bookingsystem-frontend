/**
 * Every fact the privacy policy states about the business lives here so the
 * prose in PrivacyPolicyPage never hardcodes one. Values still set to
 * PLACEHOLDER surface an on-page warning banner until someone fills them in.
 */
export const PLACEHOLDER = 'REPLACE_ME'

export type ProviderEntry = {
  name: string
  purpose: string
  receives: string
  location: string
}

export type RetentionEntry = {
  category: string
  period: string
  /**
   * 'bookingbase' — BookingBase itself controls this record and the period is
   * a firm commitment. 'business-default' — a business controls this record
   * as controller; the period shown is BookingBase's platform default, which
   * the business can shorten, extend or delete sooner at any time.
   */
  controller: 'bookingbase' | 'business-default'
}

export type PrivacySection = {
  id: string
  title: string
}

export const privacyDetails = {
  serviceName: 'BookingBase',
  appDomain: 'app.bookingbase.co.uk',
  marketingDomain: 'bookingbase.co.uk',
  /** Registered company name, or "<your name>, trading as BookingBase". */
  legalEntity: PLACEHOLDER,
  /** Companies House number. Set to '' for a sole trader — the line is then omitted. */
  companyNumber: PLACEHOLDER,
  registeredAddress: PLACEHOLDER,
  /** Published contact for privacy requests, e.g. privacy@bookingbase.co.uk. */
  privacyEmail: PLACEHOLDER,
  /** ICO data protection register entry. Set to '' if genuinely exempt. */
  icoRegistrationNumber: PLACEHOLDER,
  lastUpdated: '19 August 2026',
}

export type PrivacyDetails = typeof privacyDetails

/**
 * Confirm these before launch: no scheduled deletion job exists in the backend
 * yet, so each period below is a commitment someone has to keep by hand.
 */
export const retentionPeriods: RetentionEntry[] = [
  {
    category: 'Booking records (including any address given for a mobile visit)',
    period:
      'six years after the appointment, so the business can meet HMRC record-keeping and legal claim time limits, unless the business sets a different period',
    controller: 'business-default',
  },
  {
    category: 'Account details for business owners and customers',
    period:
      'for as long as the account is open, and up to 12 months after it is closed',
    controller: 'bookingbase',
  },
  {
    category: 'Customer records held by a business (including notes)',
    period:
      'until the business deletes the customer, or the business account is closed',
    controller: 'business-default',
  },
  {
    category: 'Unconfirmed bookings awaiting an email code',
    period: '10 minutes, after which the details expire unused',
    controller: 'bookingbase',
  },
  {
    category: 'Sign-in sessions',
    period:
      'access tokens last 15 minutes and refresh tokens 7 days; signing out ends them',
    controller: 'bookingbase',
  },
  {
    category: 'Email verification and password reset links',
    period: '24 hours from being sent',
    controller: 'bookingbase',
  },
  {
    category: 'Contact enquiries',
    period:
      'kept in our email inbox for up to 12 months, then deleted; enquiries are never stored in our database',
    controller: 'bookingbase',
  },
]

/**
 * Only services that personal data actually reaches. Deliberately excludes
 * developer architecture (frameworks, database migrations, the CDN rewrite),
 * which is not privacy information.
 */
export const providers: ProviderEntry[] = [
  {
    name: 'Supabase',
    purpose: 'Stores our database and the photos businesses upload',
    receives:
      'names, email addresses, phone numbers, any address given for a mobile visit, booking details and notes',
    location: 'United States and EU',
  },
  {
    name: 'Resend',
    purpose:
      'Delivers our emails — verification, password resets, booking confirmations and contact enquiries',
    receives: 'names, email addresses and the content of those messages',
    location: 'United States',
  },
  {
    name: 'Vercel',
    purpose: 'Hosts and delivers the website you are reading',
    receives: 'IP addresses and standard web request logs',
    location: 'United States',
  },
  {
    name: 'Railway',
    purpose: 'Hosts the service that processes bookings',
    receives: 'everything you submit, in transit, plus server logs',
    location: 'United States',
  },
  {
    name: 'postcodes.io',
    purpose:
      'Turns a postcode into map coordinates so a business can see how far it needs to travel',
    receives: 'the postcode only — never a name, street or booking detail',
    location: 'United Kingdom',
  },
  {
    name: 'OSRM (Project OSRM demo server)',
    purpose: 'Calculates the driving distance between two sets of coordinates',
    receives:
      'map coordinates only — never a name, address, postcode or booking detail',
    location: 'Germany',
  },
  {
    name: 'Google Fonts',
    purpose: 'Serves the typefaces this site uses',
    receives: 'your IP address when the fonts load',
    location: 'United States and EU',
  },
]

export const PRIVACY_SECTIONS: PrivacySection[] = [
  { id: 'who-we-are', title: 'Who we are' },
  { id: 'our-roles', title: 'Our two roles' },
  { id: 'what-we-collect', title: 'What information we collect' },
  { id: 'lawful-basis', title: 'Why we collect it, and our lawful basis' },
  { id: 'how-we-use-it', title: 'How we use your information' },
  { id: 'sharing', title: 'Who we share it with' },
  { id: 'providers', title: 'Third-party service providers' },
  { id: 'transfers', title: 'Where your information is processed' },
  { id: 'retention', title: 'How long we keep it' },
  { id: 'security', title: 'How we keep it secure' },
  { id: 'cookies', title: 'Cookies and browser storage' },
  { id: 'rights', title: 'Your data protection rights' },
  { id: 'exercising-rights', title: 'Getting a copy of your data, or deleting it' },
  { id: 'withdrawing-consent', title: 'Withdrawing your consent' },
  { id: 'complaints', title: 'How to complain' },
  { id: 'changes', title: 'Changes to this policy' },
]

/** Keys whose value is still the placeholder. A blank string counts as filled. */
export function unfilledDetailKeys(
  details: PrivacyDetails = privacyDetails,
): (keyof PrivacyDetails)[] {
  return (Object.entries(details) as [keyof PrivacyDetails, string][])
    .filter(([, value]) => value === PLACEHOLDER)
    .map(([key]) => key)
}

export function hasUnfilledDetails(
  details: PrivacyDetails = privacyDetails,
): boolean {
  return unfilledDetailKeys(details).length > 0
}
