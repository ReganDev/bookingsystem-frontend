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
- `npm run build` — production build
- `npm run preview` — preview production build

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
