# BookingBase Frontend

A React, Vite, and Progressive Web App frontend for the Java booking backend
(`booking-backend-app-java`).

## Prerequisites

- Node.js 18+
- Backend running on `http://localhost:8080`
- PostgreSQL configured for the backend (see `booking-backend-app-java`)

## Setup

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173 and proxies API requests to the backend.

## Deployment

The dashboard is served at `https://app.bookingbase.co.uk`. It calls the API
with relative `/api/v1/...` paths, and `vercel.json` rewrites `/api/*` to the
Railway backend, so the browser never makes a cross-origin request. That
destination must stay the Railway origin hostname — pointing it at
`app.bookingbase.co.uk` would make Vercel rewrite to itself and loop.

The marketing site is a separate repo (`booking-landing-page`) at
`https://bookingbase.co.uk`.

## Features

- Register a new business account
- Sign in with JWT authentication
- View and manage bookings (confirm, complete, cancel)
- Add services
- Create bookings with new customers
- Install BookingBase on supported mobile and desktop devices
- Show the app shell and a clear status message when offline

## Scripts

- `npm run dev` — start development server
- `npm run dev:mock` — start on http://localhost:5174 with fixture data and no backend (see below)
- `npm run build` — production build
- `npm run preview` — preview production build

## Mock data mode

`npm run dev:mock` serves the customer pages from sample data in `src/dev/`
(six fictional businesses with photos, services and open slots), so you can
work on the UI without the backend. Pick who you are with the URL:

- `/book?as=customer` — signed in as a returning customer with an upcoming
  booking and past visits
- `/book?as=guest` — signed out

Any login and any 6-digit verification code work. The mock code is left out of
production builds.

## Test the PWA locally

The service worker is generated only for production builds so it does not
interfere with normal development:

```bash
npm run build
npm run preview
```

Open the preview URL in Chrome, then use **Application → Manifest** and
**Application → Service Workers** in DevTools. Booking, authentication, and
availability API requests always require the network and are never cached.

In production, Android and desktop browsers offer an install action. On iOS,
open BookingBase in Safari and choose **Share → Add to Home Screen**.
