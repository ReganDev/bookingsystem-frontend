# Privacy Policy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a UK GDPR-compliant privacy notice at `/privacy`, reachable from a site-wide footer and linked next to every form that collects personal information.

**Architecture:** All facts (legal identity, contact details, ICO number, retention periods, provider list) live in one editable module, `src/content/privacyPolicy.ts`. `PrivacyPolicyPage.tsx` renders prose as anchored `<section>` blocks reading from those constants. A `SiteFooter` component is added to all three layouts. No new dependencies.

**Tech Stack:** React 19, react-router-dom 7, TypeScript, Vite, Vitest + Testing Library, plain CSS with the existing design tokens in `src/index.css`.

## Global Constraints

- Do not add dependencies. The repo has no markdown renderer and none is to be introduced.
- Follow existing page style: function components, named exports, no default exports except `App`.
- Tests use Vitest + `@testing-library/react`, wrapped in `MemoryRouter`, matching `src/pages/SignUpPage.test.tsx`.
- Use existing CSS tokens (`--color-fg-muted`, `--color-border`, `--radius-md`, …). No new colour literals except the placeholder banner.
- Every factual claim in the policy must be true of the code as it stands. Do not name Stripe, Google Analytics, Cloudflare, or any SMS provider — **none are in use**.
- Copy uses `&apos;` for apostrophes in JSX text, matching the existing pages.
- Run `npm test` after every task; run `npm run build` before the final commit.

---

### Task 1: Privacy content module

**Files:**
- Create: `src/content/privacyPolicy.ts`
- Test: `src/content/privacyPolicy.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PLACEHOLDER: string`, `privacyDetails` object, `providers: ProviderEntry[]`, `retentionPeriods: RetentionEntry[]`, `PRIVACY_SECTIONS: PrivacySection[]`, `unfilledDetailKeys(details?): string[]`, `hasUnfilledDetails(details?): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/content/privacyPolicy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  PLACEHOLDER,
  PRIVACY_SECTIONS,
  hasUnfilledDetails,
  privacyDetails,
  providers,
  retentionPeriods,
  unfilledDetailKeys,
} from './privacyPolicy'

describe('privacyPolicy content', () => {
  it('flags every detail still set to the placeholder', () => {
    const keys = unfilledDetailKeys({
      ...privacyDetails,
      legalEntity: PLACEHOLDER,
      privacyEmail: 'privacy@example.com',
    })

    expect(keys).toContain('legalEntity')
    expect(keys).not.toContain('privacyEmail')
    expect(keys).not.toContain('serviceName')
  })

  it('treats a deliberately blank value as filled in, not missing', () => {
    // A sole trader has no company number; blank means "omit this line".
    const keys = unfilledDetailKeys({ ...privacyDetails, companyNumber: '' })

    expect(keys).not.toContain('companyNumber')
  })

  it('reports whether anything is still unfilled', () => {
    expect(hasUnfilledDetails({ ...privacyDetails, legalEntity: PLACEHOLDER })).toBe(true)

    const filled = Object.fromEntries(
      Object.entries(privacyDetails).map(([key, value]) => [
        key,
        value === PLACEHOLDER ? 'filled in' : value,
      ]),
    ) as typeof privacyDetails

    expect(hasUnfilledDetails(filled)).toBe(false)
  })

  it('names only providers that personal data actually reaches', () => {
    const names = providers.map((provider) => provider.name)

    expect(names).toEqual([
      'Supabase',
      'Resend',
      'Vercel',
      'Railway',
      'postcodes.io',
      'OSRM (Project OSRM demo server)',
      'Google Fonts',
    ])
  })

  it('does not name services the product does not use', () => {
    const serialised = JSON.stringify(providers).toLowerCase()

    for (const absent of ['stripe', 'google analytics', 'cloudflare', 'twilio']) {
      expect(serialised).not.toContain(absent)
    }
  })

  it('gives every section a unique anchor id', () => {
    const ids = PRIVACY_SECTIONS.map((section) => section.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('who-we-are')
    expect(ids).toContain('complaints')
  })

  it('states a retention period for each category it lists', () => {
    expect(retentionPeriods.length).toBeGreaterThan(0)
    for (const entry of retentionPeriods) {
      expect(entry.period.trim()).not.toBe('')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/privacyPolicy.test.ts`
Expected: FAIL — `Failed to resolve import "./privacyPolicy"`.

- [ ] **Step 3: Write the content module**

Create `src/content/privacyPolicy.ts`:

```ts
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
      'six years after the appointment, so the business can meet HMRC record-keeping and legal claim time limits',
  },
  {
    category: 'Account details for business owners and customers',
    period:
      'for as long as the account is open, and up to 12 months after it is closed',
  },
  {
    category: 'Customer records held by a business (including notes)',
    period:
      'until the business deletes the customer, or the business account is closed',
  },
  {
    category: 'Unconfirmed bookings awaiting an email code',
    period: '10 minutes, after which the details expire unused',
  },
  {
    category: 'Sign-in sessions',
    period:
      'access tokens last 15 minutes and refresh tokens 7 days; signing out ends them',
  },
  {
    category: 'Email verification and password reset links',
    period: '24 hours from being sent',
  },
  {
    category: 'Contact enquiries',
    period:
      'kept in our email inbox for up to 12 months, then deleted; enquiries are never stored in our database',
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
): string[] {
  return Object.entries(details)
    .filter(([, value]) => value === PLACEHOLDER)
    .map(([key]) => key)
}

export function hasUnfilledDetails(
  details: PrivacyDetails = privacyDetails,
): boolean {
  return unfilledDetailKeys(details).length > 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/privacyPolicy.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/privacyPolicy.ts src/content/privacyPolicy.test.ts
git commit -m "feat: add privacy policy content module"
```

---

### Task 2: Privacy policy page and route

**Files:**
- Create: `src/pages/PrivacyPolicyPage.tsx`
- Create: `src/pages/PrivacyPolicyPage.test.tsx`
- Modify: `src/App.tsx` (import, and a route inside the `PublicLayout` block at lines 159–162)

**Interfaces:**
- Consumes: everything Task 1 produced.
- Produces: `PrivacyPolicyPage` named export; the `/privacy` route path other tasks link to.

- [ ] **Step 1: Write the failing test**

Create `src/pages/PrivacyPolicyPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PRIVACY_SECTIONS } from '../content/privacyPolicy'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPolicyPage />
    </MemoryRouter>,
  )
}

describe('PrivacyPolicyPage', () => {
  it('renders a heading for every section in the contents', () => {
    renderPage()

    for (const section of PRIVACY_SECTIONS) {
      expect(
        screen.getByRole('heading', { name: section.title }),
      ).toBeInTheDocument()
    }
  })

  it('gives each section an anchor the contents list can reach', () => {
    const { container } = renderPage()

    for (const section of PRIVACY_SECTIONS) {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull()
    }
  })

  it('tells the reader how to complain to the ICO', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /ico\.org\.uk/i })).toHaveAttribute(
      'href',
      'https://ico.org.uk/make-a-complaint/',
    )
    expect(screen.getByText(/0303 123 1113/)).toBeInTheDocument()
  })

  it('names each third-party provider and what it receives', () => {
    renderPage()

    expect(screen.getByText('Supabase')).toBeInTheDocument()
    expect(screen.getByText('Resend')).toBeInTheDocument()
    expect(screen.getByText('postcodes.io')).toBeInTheDocument()
    // Two places say this: the OSRM provider entry, and the note below the
    // list explaining why we send it nothing identifying.
    expect(screen.getAllByText(/coordinates only/i)).toHaveLength(2)
  })

  it('says no text messages are sent', () => {
    renderPage()

    expect(screen.getByText(/we do not send text messages/i)).toBeInTheDocument()
  })

  it('states plainly that there is no tracking or payment processing', () => {
    renderPage()

    expect(screen.getByText(/no analytics/i)).toBeInTheDocument()
    expect(screen.getByText(/do not take payments/i)).toBeInTheDocument()
  })

  it('warns while business details are still unfilled', () => {
    renderPage()

    // Fails once the constants are filled in — delete this test then, and keep
    // the one below.
    expect(screen.getByRole('status')).toHaveTextContent(/not ready to publish/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/PrivacyPolicyPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./PrivacyPolicyPage"`.

- [ ] **Step 3: Write the page**

Create `src/pages/PrivacyPolicyPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import {
  PRIVACY_SECTIONS,
  hasUnfilledDetails,
  privacyDetails,
  providers,
  retentionPeriods,
  unfilledDetailKeys,
} from '../content/privacyPolicy'

const {
  serviceName,
  appDomain,
  legalEntity,
  companyNumber,
  registeredAddress,
  privacyEmail,
  icoRegistrationNumber,
  lastUpdated,
} = privacyDetails

export function PrivacyPolicyPage() {
  return (
    <article className="card policy-page">
      {hasUnfilledDetails() && (
        <p className="policy-warning" role="status">
          This policy is not ready to publish. Fill in{' '}
          <code>{unfilledDetailKeys().join(', ')}</code> in{' '}
          <code>src/content/privacyPolicy.ts</code>.
        </p>
      )}

      <header className="policy-header">
        <h2>Privacy policy</h2>
        <p className="policy-updated">Last updated: {lastUpdated}</p>
        <p>
          This policy explains what {serviceName} does with personal
          information, and what rights you have over it. It covers both the
          businesses that use {serviceName} to take bookings, and the customers
          who book with them at {appDomain}.
        </p>
      </header>

      <nav className="policy-contents" aria-label="Sections of this policy">
        <h3>Contents</h3>
        <ol>
          {PRIVACY_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="who-we-are" className="policy-section">
        <h3>Who we are</h3>
        <p>
          {serviceName} is booking software operated by {legalEntity}
          {companyNumber ? `, registered in England and Wales under company number ${companyNumber}` : ''}
          . Our address is {registeredAddress}.
        </p>
        <p>
          For anything to do with your personal information, email us at{' '}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </p>
        {icoRegistrationNumber && (
          <p>
            We are registered with the Information Commissioner&apos;s Office
            (ICO), registration number {icoRegistrationNumber}.
          </p>
        )}
      </section>

      <section id="our-roles" className="policy-section">
        <h3>Our two roles</h3>
        <p>
          Data protection law distinguishes between the organisation that
          decides how personal information is used (the <strong>controller</strong>)
          and one that handles it on that organisation&apos;s behalf (the{' '}
          <strong>processor</strong>). {serviceName} is both, depending on whose
          information it is.
        </p>
        <p>
          <strong>We are the controller</strong> for the accounts businesses and
          customers create with us, for enquiries sent through our contact form,
          and for keeping the service running and secure.
        </p>
        <p>
          <strong>We are the processor</strong> for the customer and booking
          records a business keeps in {serviceName}. That business decides what
          to record and how long to keep it; we only act on its instructions. If
          you booked an appointment and want your details changed or removed,
          contact the business you booked with first. You can also contact us
          and we will help.
        </p>
      </section>

      <section id="what-we-collect" className="policy-section">
        <h3>What information we collect</h3>
        <p>If you create an account, we collect:</p>
        <ul>
          <li>your first and last name</li>
          <li>your email address</li>
          <li>your phone number, if you give us one</li>
          <li>your password, which we store only as an encrypted hash</li>
          <li>your business name and contact details, if you run a business</li>
        </ul>
        <p>If you book an appointment, the business you book with collects:</p>
        <ul>
          <li>your name, email address and phone number</li>
          <li>the service, date and time you booked, and the price</li>
          <li>any notes you add to your booking</li>
          <li>
            <strong>your address and postcode</strong>, but only when the
            service takes place at your address rather than at the
            business&apos;s premises
          </li>
          <li>
            the driving distance and travel time between the business and that
            address, worked out from postcodes
          </li>
          <li>whether you asked for a reminder</li>
        </ul>
        <p>
          Reminders are sent by email. We do not send text messages, and your
          phone number is not shared with any messaging service. If you tick the
          text reminder option, we record only that you would like one.
        </p>
        <p>
          If you book without an account, we hold your details for up to 10
          minutes while you confirm the code we email you. If you never confirm,
          those details expire unused.
        </p>
        <p>
          Businesses can also add notes about their customers, and upload photos
          of their premises and work.
        </p>
        <p>
          If you send us an enquiry, we collect your name, email address,
          business name if you give one, and your message.
        </p>
      </section>

      <section id="lawful-basis" className="policy-section">
        <h3>Why we collect it, and our lawful basis</h3>
        <ul>
          <li>
            <strong>To provide the service you asked for</strong> — creating
            your account, taking and managing your bookings, and letting you
            sign in. Lawful basis: <em>performance of a contract</em>.
          </li>
          <li>
            <strong>To send you a reminder or confirmation</strong> when you ask
            for one. Lawful basis: <em>consent</em>, which you can withdraw at
            any time.
          </li>
          <li>
            <strong>To keep the service running, secure and free of abuse</strong>{' '}
            — verifying email addresses, limiting repeated attempts, and keeping
            server logs. Lawful basis: <em>legitimate interests</em>, namely
            running a functioning and secure service.
          </li>
          <li>
            <strong>To reply to your enquiry.</strong> Lawful basis:{' '}
            <em>legitimate interests</em>, namely responding to someone who
            contacted us.
          </li>
          <li>
            <strong>To keep records we are legally required to keep</strong>,
            such as records relevant to tax. Lawful basis:{' '}
            <em>legal obligation</em>.
          </li>
        </ul>
      </section>

      <section id="how-we-use-it" className="policy-section">
        <h3>How we use your information</h3>
        <p>
          We use it to run the booking service and nothing else. We do not sell
          it, rent it, or share it for anyone&apos;s marketing. We do not build
          advertising profiles, and we do not make any decision about you by
          automated means.
        </p>
        <p>
          We do not take payments through {serviceName}. Prices are recorded so
          a business can see what a booking is worth, but you pay the business
          directly, outside this service.
        </p>
      </section>

      <section id="sharing" className="policy-section">
        <h3>Who we share it with</h3>
        <ul>
          <li>
            <strong>The business you booked with</strong> receives the details
            of your booking. That is the point of making one.
          </li>
          <li>
            <strong>Our service providers</strong>, listed in the next section,
            handle information on our behalf under contract.
          </li>
          <li>
            <strong>A small number of our own staff</strong> can access accounts
            to provide support and keep the service running.
          </li>
          <li>
            <strong>Authorities or advisers</strong>, where the law requires it
            or to establish or defend a legal claim.
          </li>
        </ul>
      </section>

      <section id="providers" className="policy-section">
        <h3>Third-party service providers</h3>
        <p>
          We use trusted providers to operate {serviceName}. They process
          personal information on our behalf and may not use it for their own
          purposes.
        </p>
        <dl className="policy-providers">
          {providers.map((provider) => (
            <div key={provider.name} className="policy-provider">
              <dt>{provider.name}</dt>
              <dd>
                <p>{provider.purpose}.</p>
                <p className="policy-provider-meta">
                  Receives: {provider.receives}. Processed in:{' '}
                  {provider.location}.
                </p>
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Two of these deserve a note. Postcode lookup and distance calculation
          use free public services: the postcode service receives a postcode on
          its own, and the routing service receives{' '}
          <strong>coordinates only</strong> — never a name, address or booking
          detail. The routing service is a public demo server we have no
          contract with, which is why we send it nothing that identifies anyone.
        </p>
        <p>
          If we add a provider in future — for example a text-message service or
          a payment provider — we will update this list before it handles any of
          your information.
        </p>
      </section>

      <section id="transfers" className="policy-section">
        <h3>Where your information is processed</h3>
        <p>
          Some of our providers are based outside the UK, mainly in the United
          States and the European Economic Area, as set out above. Where
          information leaves the UK, we rely on the UK Government&apos;s
          adequacy regulations, or on the International Data Transfer Agreement
          or Addendum approved by the ICO, so that your information keeps
          essentially the same protection it has here.
        </p>
      </section>

      <section id="retention" className="policy-section">
        <h3>How long we keep it</h3>
        <p>
          We keep personal information only as long as we need it for the
          purposes above.
        </p>
        <dl className="policy-retention">
          {retentionPeriods.map((entry) => (
            <div key={entry.category} className="policy-retention-row">
              <dt>{entry.category}</dt>
              <dd>{entry.period}</dd>
            </div>
          ))}
        </dl>
        <p>
          Where a business is the controller of its own customer records, that
          business sets the retention period and can delete records at any time.
        </p>
      </section>

      <section id="security" className="policy-section">
        <h3>How we keep it secure</h3>
        <ul>
          <li>
            Everything you send travels over an encrypted HTTPS connection.
          </li>
          <li>
            Passwords are stored as one-way encrypted hashes. Nobody at{' '}
            {serviceName} can read your password.
          </li>
          <li>
            Signing in issues a short-lived access token that expires after 15
            minutes, alongside a refresh token that lasts 7 days.
          </li>
          <li>
            Accounts must verify their email address before they can be used,
            and booking without an account requires a code sent to your email.
          </li>
          <li>
            Businesses can only see their own customers and bookings. Our
            database sits behind the service and is not reachable from your
            browser.
          </li>
        </ul>
        <p>
          No service can promise perfect security, but we take these measures
          seriously and review them as the service grows.
        </p>
      </section>

      <section id="cookies" className="policy-section">
        <h3>Cookies and browser storage</h3>
        <p>
          We use <strong>no analytics</strong>, no advertising, no tag manager
          and no tracking cookies. Nothing here follows you between websites,
          which is why you were not asked to accept cookies.
        </p>
        <p>
          When you sign in, we store your session in your browser&apos;s local
          storage so you stay signed in. It is strictly necessary to provide a
          service you asked for, and signing out removes it. Clearing your
          browser data removes it too.
        </p>
        <p>
          The typefaces on this site load from Google Fonts, which receives your
          IP address as part of that request.
        </p>
      </section>

      <section id="rights" className="policy-section">
        <h3>Your data protection rights</h3>
        <p>Under UK data protection law you have the right to:</p>
        <ul>
          <li>
            <strong>be informed</strong> about how your information is used —
            which is what this policy is for
          </li>
          <li>
            <strong>access</strong> a copy of the information we hold about you
          </li>
          <li>
            <strong>rectification</strong> — have inaccurate information
            corrected
          </li>
          <li>
            <strong>erasure</strong> — ask us to delete your information, where
            we have no overriding reason to keep it
          </li>
          <li>
            <strong>restrict processing</strong> — ask us to pause using your
            information while a concern is resolved
          </li>
          <li>
            <strong>data portability</strong> — receive your information in a
            portable format
          </li>
          <li>
            <strong>object</strong> to processing we base on legitimate
            interests
          </li>
          <li>
            <strong>rights around automated decisions</strong> — though we make
            none
          </li>
        </ul>
        <p>Exercising these rights is free, and we will not treat you differently for it.</p>
      </section>

      <section id="exercising-rights" className="policy-section">
        <h3>Getting a copy of your data, or deleting it</h3>
        <p>
          Email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> and tell us
          what you would like. We may ask you to confirm your identity so we do
          not hand your information to someone else. We will respond within one
          month, and will tell you if we need longer because the request is
          complex.
        </p>
        <p>
          If your request is about a booking you made with a business, contact
          that business first — they control those records. Tell us if you
          cannot reach them and we will help.
        </p>
      </section>

      <section id="withdrawing-consent" className="policy-section">
        <h3>Withdrawing your consent</h3>
        <p>
          Where we rely on your consent — currently only for booking reminders —
          you can withdraw it at any time by changing the reminder option on a
          booking, or by emailing{' '}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Withdrawing
          consent does not affect anything done before you withdrew it, and does
          not affect messages we must send to operate your booking, such as
          confirming it.
        </p>
      </section>

      <section id="complaints" className="policy-section">
        <h3>How to complain</h3>
        <p>
          If you are unhappy with how we have handled your information, please
          tell us first at{' '}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> so we can put it
          right.
        </p>
        <p>
          You also have the right to complain to the Information
          Commissioner&apos;s Office, the UK regulator for data protection:
        </p>
        <ul>
          <li>
            <a
              href="https://ico.org.uk/make-a-complaint/"
              target="_blank"
              rel="noreferrer"
            >
              ico.org.uk/make-a-complaint
            </a>
          </li>
          <li>Helpline: 0303 123 1113</li>
          <li>
            Information Commissioner&apos;s Office, Wycliffe House, Water Lane,
            Wilmslow, Cheshire SK9 5AF
          </li>
        </ul>
      </section>

      <section id="changes" className="policy-section">
        <h3>Changes to this policy</h3>
        <p>
          We update this policy when the service changes. The date at the top
          shows when it last changed. If a change materially affects how we use
          your information, we will tell account holders by email.
        </p>
        <p className="policy-back">
          <Link to="/book">Back to booking</Link> ·{' '}
          <Link to="/contact">Contact us</Link>
        </p>
      </section>
    </article>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/PrivacyPolicyPage.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Add the route**

In `src/App.tsx`, add the import alongside the other page imports (keep alphabetical placement after `LoginPage`):

```tsx
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
```

Then extend the `PublicLayout` route block (currently lines 159–162) so it reads:

```tsx
      <Route element={<PublicLayout />}>
        <Route path="/book" element={<BrowseBusinessesPage />} />
        <Route path="/book/:slug" element={<BookBusinessPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
      </Route>
```

- [ ] **Step 6: Verify the route compiles and the suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PrivacyPolicyPage.tsx src/pages/PrivacyPolicyPage.test.tsx src/App.tsx
git commit -m "feat: add the privacy policy page at /privacy"
```

---

### Task 3: Site footer on every layout

**Files:**
- Create: `src/components/SiteFooter.tsx`
- Create: `src/components/SiteFooter.test.tsx`
- Modify: `src/components/PublicLayout.tsx` (import; render after `</main>`)
- Modify: `src/components/Layout.tsx` (both `Layout` and `AuthLayout`)

**Interfaces:**
- Consumes: `privacyDetails.serviceName` from Task 1; the `/privacy` route from Task 2.
- Produces: `SiteFooter` named export.

- [ ] **Step 1: Write the failing test**

Create `src/components/SiteFooter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('links to the privacy policy', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    )
  })

  it('links to the contact page', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact',
    )
  })

  it('renders as a landmark so screen readers can skip to it', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    )

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/SiteFooter.test.tsx`
Expected: FAIL — `Failed to resolve import "./SiteFooter"`.

- [ ] **Step 3: Write the component**

Create `src/components/SiteFooter.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { privacyDetails } from '../content/privacyPolicy'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <p className="site-footer-legal">
        © {new Date().getFullYear()} {privacyDetails.serviceName}
      </p>
    </footer>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/SiteFooter.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Render it in the public layout**

In `src/components/PublicLayout.tsx`, add to the imports:

```tsx
import { SiteFooter } from './SiteFooter'
```

and place it directly after the closing `</main>` tag, before `</div>`:

```tsx
      <main className="app-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
```

- [ ] **Step 6: Render it in the dashboard and auth layouts**

In `src/components/Layout.tsx`, add to the imports:

```tsx
import { SiteFooter } from './SiteFooter'
```

In `Layout`, after the closing `</main>`:

```tsx
      <main className="app-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
```

In `AuthLayout`, add the footer as the last child, after the existing
`auth-footer` paragraph block:

```tsx
      {!isLogin && (
        <p className="auth-footer">
          <Link to="/book">Book an appointment</Link> ·{' '}
          <Link to="/signup">Create account</Link> ·{' '}
          <Link to="/contact">Contact us</Link>
        </p>
      )}
      <SiteFooter />
    </div>
```

- [ ] **Step 7: Verify nothing broke**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass, including the existing `App.test.tsx`, `DashboardPage.test.tsx` and `LoginPage.test.tsx`.

If an existing test now fails because it queries a link text the footer also
renders (for example a bare `getByText('Contact')`), fix it by narrowing that
query with `getByRole('link', { name: … })` scoped to the region under test —
do not remove the footer to make a test pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/SiteFooter.tsx src/components/SiteFooter.test.tsx src/components/PublicLayout.tsx src/components/Layout.tsx
git commit -m "feat: add a site footer linking the privacy policy"
```

---

### Task 4: Privacy links at the point of collection

**Files:**
- Modify: `src/pages/BookBusinessPage.tsx` (immediately before the submit button at lines 860–866)
- Modify: `src/pages/SignUpPage.tsx` (immediately before the submit button)
- Modify: `src/pages/ContactPage.tsx` (immediately before the submit button)
- Test: `src/pages/PrivacyNotice.test.tsx` (create)

**Interfaces:**
- Consumes: the `/privacy` route from Task 2.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `src/pages/PrivacyNotice.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { ContactPage } from './ContactPage'
import { SignUpPage } from './SignUpPage'

vi.mock('../api/auth')
vi.mock('../api/public')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('privacy notices at the point of collection', () => {
  it('links to the policy from the sign-up form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SignUpPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'privacy policy' }),
    ).toHaveAttribute('href', '/privacy')
  })

  it('links to the policy from the contact form', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'privacy policy' }),
    ).toHaveAttribute('href', '/privacy')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/PrivacyNotice.test.tsx`
Expected: FAIL — "Unable to find role 'link' with name 'privacy policy'".

- [ ] **Step 3: Add the notice to the sign-up form**

In `src/pages/SignUpPage.tsx`, confirm `Link` is already imported from
`react-router-dom` (it is, used by the footer links). Insert directly above the
submit button:

```tsx
        <p className="field-hint privacy-notice">
          We use your details to create and run your account. See our{' '}
          <Link to="/privacy">privacy policy</Link>.
        </p>
        <button className="btn btn-primary" type="submit" disabled={loading}>
```

- [ ] **Step 4: Add the notice to the contact form**

In `src/pages/ContactPage.tsx`, insert directly above the submit button:

```tsx
        <p className="field-hint privacy-notice">
          We use your details only to reply to this enquiry. See our{' '}
          <Link to="/privacy">privacy policy</Link>.
        </p>
        <button className="btn btn-primary" type="submit" disabled={loading}>
```

- [ ] **Step 5: Add the notice to the booking form**

In `src/pages/BookBusinessPage.tsx`, confirm `Link` is imported from
`react-router-dom` (it is, used at line 476). Insert directly above the
`Request appointment` submit button at line 860:

```tsx
                <p className="field-hint privacy-notice">
                  Your details are sent to this business so it can manage your
                  appointment. See our <Link to="/privacy">privacy policy</Link>.
                </p>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting || !selectedSlot}
                >
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/pages/PrivacyNotice.test.tsx src/pages/BookBusinessPage.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PrivacyNotice.test.tsx src/pages/SignUpPage.tsx src/pages/ContactPage.tsx src/pages/BookBusinessPage.tsx
git commit -m "feat: link the privacy policy beside each data-collecting form"
```

---

### Task 5: Styles and full verification

**Files:**
- Modify: `src/index.css` (append a new section at the end of the file)

**Interfaces:**
- Consumes: the class names produced by Tasks 2–4.
- Produces: nothing.

- [ ] **Step 1: Append the styles**

Add to the end of `src/index.css`:

```css
/* ---------- Site footer ---------- */

.site-footer {
  border-top: 1px solid var(--color-border);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--color-fg-muted);
}

.site-footer-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.site-footer-links a {
  color: var(--color-fg-muted);
  text-decoration: none;
  /* Comfortable tap target on a phone. */
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
}

.site-footer-links a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.site-footer-legal {
  margin: 0;
}

/* ---------- Privacy policy page ---------- */

.policy-page {
  max-width: 46rem;
  margin: 0 auto;
}

.policy-warning {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
}

.policy-updated {
  color: var(--color-fg-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.policy-contents {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
}

.policy-contents h3 {
  margin-top: 0;
  font-size: 1rem;
}

.policy-contents ol {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.35rem;
}

.policy-section {
  /* Anchor links land below the sticky public header. */
  scroll-margin-top: 5rem;
  margin-top: 2rem;
}

.policy-section h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.policy-section ul {
  padding-left: 1.25rem;
  display: grid;
  gap: 0.5rem;
}

.policy-providers,
.policy-retention {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}

.policy-provider dt,
.policy-retention-row dt {
  font-weight: 600;
}

.policy-provider dd,
.policy-retention-row dd {
  margin: 0.25rem 0 0;
}

.policy-provider dd p {
  margin: 0.25rem 0 0;
}

.policy-provider-meta {
  color: var(--color-fg-muted);
  font-size: 0.9rem;
}

.policy-back {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.privacy-notice {
  display: block;
  margin: 0;
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every pre-existing suite.

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: no TypeScript errors, build completes.

- [ ] **Step 4: Look at the page**

Run: `npm run dev`, open `http://localhost:5173/privacy`.
Expected: the red "not ready to publish" banner listing the unfilled keys; a
contents list whose links jump to each section without the sticky header
covering the heading; the footer at the bottom of the page.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "style: lay out the privacy policy page and site footer"
```

---

## Before this goes live

The code is finished when Task 5 is committed, but the policy is not publishable
until these are done. None are code changes.

- [ ] Fill in `legalEntity`, `companyNumber`, `registeredAddress`, `privacyEmail` and `icoRegistrationNumber` in `src/content/privacyPolicy.ts`. The red banner disappears when they are all set; delete the "warns while business details are still unfilled" test in `PrivacyPolicyPage.test.tsx` at that point.
- [ ] Confirm the retention periods in `retentionPeriods` are ones the business will actually keep. Nothing deletes data automatically — there is no scheduled cleanup job in the backend — so each period is a manual commitment today.
- [ ] Register with the ICO if not already registered (£40–£60 a year for most small businesses).
- [ ] Point `app.enquiry.to` at the business address rather than the personal Gmail default in `application-prod.properties`.
- [ ] Set `RESEND_FROM` to a verified BookingBase domain instead of `onboarding@resend.dev`.

## Known gaps, out of scope for this plan

1. **Art. 28 data processing agreement** with each business using the platform. The privacy policy does not satisfy this. It needs the same provider list plus a commitment to notify businesses before sub-processors change.
2. **Terms and conditions** for business customers.
3. **Self-hosting Open Sans and Poppins** would remove Google Fonts from the provider list entirely.
4. The marketing site at `bookingbase.co.uk` is a separate repo and needs its own link to this policy.
