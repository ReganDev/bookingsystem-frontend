# Privacy Policy Page — Design

_Date: 2026-08-19_

## Goal

Add a UK GDPR-compliant privacy notice to the BookingBase app at
`app.bookingbase.co.uk`, reachable from every page and linked next to each form
that collects personal information.

The policy covers both audiences on the domain:

- **Business owners** who sign up — BookingBase is the **controller**.
- **Customers** who book appointments — the **business** is the controller and
  BookingBase is the **processor** acting on its instructions.

## What the app actually collects

Established by reading the source, not assumed.

| Data | Where it comes from |
|---|---|
| Owner account: first name, last name, email, phone, hashed password, business name | `RegisterRequest`, `/signup` |
| Customer account: first name, last name, email, phone, hashed password | `CustomerRegisterRequest` |
| Customer records held by a business: name, email, phone, free-text notes | `Customer`, `CustomerRequest` |
| Booking records: service, date/time, price, customer notes, internal notes | `Booking` |
| **Customer address + postcode** for mobile-visit services | `addressLine1/2`, `addressCity`, `addressPostcode` on `Booking` |
| Derived drive distance and duration | `distanceMeters`, `durationSeconds` |
| Reminder preferences | `emailReminder`, `smsReminder` |
| Pending guest booking held during email OTP verification | `BookingOtpSession`, 10-minute expiry |
| Business profile: address, contact details, photos | `Business`, `photoUrls` |
| Contact enquiries: name, email, business name, message | `EnquiryRequest` — **forwarded by email, never stored in the database** |

### Verified negatives

These must be stated as absent, because they are:

- **No payment processor.** `price` is recorded; payment happens offline.
- **No analytics, tag manager, advertising or tracking pixel** — in the app, the
  backend, or the marketing site.
- **No SMS provider.** `smsReminder` is stored as a preference on `Booking` and
  `BookingOtpSession`, but nothing sends SMS. Phone numbers are not shared with
  any messaging provider.
- **No cookie banner needed.** The only browser storage is the strictly-necessary
  `localStorage` key `booking-auth` holding the access and refresh tokens.

## Recipients

Written for a reader, not an architect: provider, plain-English purpose, what it
receives, where it processes. Closed with a category-level sentence so adding a
minor tool does not instantly falsify the page.

| Provider | Purpose | Receives |
|---|---|---|
| Supabase | Database and business photo storage | Names, emails, phones, addresses, booking details, notes, photos |
| Resend | Transactional email and enquiry forwarding | Name, email, message content |
| Vercel | App hosting and delivery | IP address, request logs |
| Railway | Backend API hosting | All submitted data in transit, server logs |
| postcodes.io | UK postcode lookup for travel distance | **Postcode only** — no name, no street |
| OSRM demo server | Driving distance between two points | **Coordinates only** — no name, no address |
| Google Fonts | Web font delivery | IP address |

Not disclosed, because they are developer architecture rather than privacy
information: Spring Boot, Flyway, Hibernate, the connection pool, React/Vite,
the `vercel.json` rewrite, JWT internals, the service worker.

**OSRM caveat to state plainly:** it is a keyless public demo server with no SLA
and no data processing agreement in place. It only ever receives bare
coordinates, which is what makes that defensible; the policy says so rather than
hiding it under "mapping providers".

International transfers section required — Vercel, Railway, Supabase, Resend and
Google are all US-linked.

## Retention

There are **no `@Scheduled` cleanup jobs in the backend**. Nothing is deleted
automatically today: expired OTP sessions, spent verification tokens and
cancelled bookings all persist. The policy therefore states retention as a
commitment being made, and describes deletion as handled manually on request,
which is the truth.

Token lifetimes stated as fact: access token 15 minutes, refresh token 7 days,
email verification 24 hours, password reset 24 hours, booking OTP 10 minutes.

## Implementation

### New files

- `src/content/privacyPolicy.ts` — every fact in one editable place:
  controller identity, address, privacy contact email, ICO registration number,
  `lastUpdated`, retention periods, and the provider list. Unknown values are
  literal `REPLACE_ME` markers, never plausible-looking fakes.
- `src/pages/PrivacyPolicyPage.tsx` — prose rendered as `<section id=…>` blocks
  reading from those constants, with a table-of-contents anchor list built from
  a `PRIVACY_SECTIONS` array.
- `src/components/SiteFooter.tsx` — `Privacy · Contact · © BookingBase`.
- `src/pages/PrivacyPolicyPage.test.tsx` — asserts every required heading
  renders, and that no `REPLACE_ME` marker survives, so the build fails loudly
  until the facts are filled in.

### Edited files

- `src/App.tsx` — `/privacy` route inside `PublicLayout` so it is reachable
  signed out.
- `src/components/PublicLayout.tsx`, `src/components/Layout.tsx`,
  `AuthLayout` — render `SiteFooter`.
- `src/pages/BookBusinessPage.tsx`, `src/pages/SignUpPage.tsx`,
  `src/pages/ContactPage.tsx` — inline privacy line at the point of collection.
- `src/index.css` — footer and policy-page styles.

### Approach

Plain JSX prose with interpolated constants, matching how every other page in
the repo is written. Rejected: encoding legal prose as a data structure (nested
lists and links make it worse, not better), and adding a markdown renderer (a
new dependency for one page).

## Content checklist

Who we are · contact details · what is collected · why · lawful basis
(contract, legitimate interests, consent for reminder opt-ins, legal obligation)
· how it is used · who it is shared with · third-party providers · retention ·
security (TLS, hashed passwords, JWT auth, access controls) · all eight data
protection rights · how to request data or deletion · how to withdraw consent ·
how to complain · ICO contact details · last updated date. Plus cookies/storage
and international transfers.

## Out of scope, flagged as gaps

1. **Art. 28 data processing agreement.** As a processor for the businesses on
   the platform, a written DPA with each business is required. A privacy policy
   does not satisfy this. It needs the same sub-processor list, plus a change
   notification commitment.
2. **Terms & conditions** for business customers.
3. `app.enquiry.to` defaults to a personal Gmail address, making Google a
   recipient of enquiry data. The policy names a `privacy@` address instead;
   the backend default should be changed separately.
4. `app.enquiry.from` defaults to `onboarding@resend.dev`, Resend's shared
   sandbox sender rather than a verified BookingBase domain.
5. Self-hosting Open Sans and Poppins would remove Google as a recipient
   entirely.
