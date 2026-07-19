import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthLayout, Layout } from './components/Layout'
import { NetworkStatus } from './components/NetworkStatus'
import { PublicLayout } from './components/PublicLayout'
import { useAuth } from './context/AuthContext'
import { resolveHashPath } from './lib/hashRedirect'
import { AdminPage } from './pages/AdminPage'
import { BookBusinessPage } from './pages/BookBusinessPage'
import { BrowseBusinessesPage } from './pages/BrowseBusinessesPage'
import { ContactPage } from './pages/ContactPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { SignUpPage } from './pages/SignUpPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

// Client sites send customers here as <host>/#<business-slug>; turn that
// hash into the /book/:slug route on first load.
function HashSlugRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const path = resolveHashPath(window.location.hash)
    if (path) {
      navigate(path, { replace: true })
    }
  }, [navigate])

  return null
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCustomer, isAdmin, isVerified, user, isLoading } =
    useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isVerified) {
    return (
      <Navigate
        to={`/check-email?email=${encodeURIComponent(user?.email ?? '')}`}
        replace
      />
    )
  }

  // Customer accounts have no business to manage
  if (isCustomer) {
    return <Navigate to="/book" replace />
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return children
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

function GuestAuthRoute({
  children,
  allowUnverified = false,
}: {
  children: React.ReactNode
  allowUnverified?: boolean
}) {
  const { isAuthenticated, isVerified, user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (isAuthenticated) {
    if (!isVerified) {
      if (allowUnverified) {
        return children
      }
      return (
        <Navigate
          to={`/check-email?email=${encodeURIComponent(user?.email ?? '')}`}
          replace
        />
      )
    }
    return <Navigate to="/" replace />
  }

  return children
}

function HomeRedirect() {
  const {
    isAuthenticated,
    isCustomer,
    isAdmin,
    isVerified,
    user,
    isLoading,
  } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (!isAuthenticated || isCustomer) {
    if (isAuthenticated && !isVerified) {
      return (
        <Navigate
          to={`/check-email?email=${encodeURIComponent(user?.email ?? '')}`}
          replace
        />
      )
    }
    return <Navigate to="/book" replace />
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <>
      <NetworkStatus />
      <HashSlugRedirect />
      <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<PublicLayout />}>
        <Route path="/book" element={<BrowseBusinessesPage />} />
        <Route path="/book/:slug" element={<BookBusinessPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestAuthRoute allowUnverified>
              <LoginPage />
            </GuestAuthRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestAuthRoute>
              <SignUpPage />
            </GuestAuthRoute>
          }
        />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
      </Route>

      <Route
        element={
          <OwnerRoute>
            <Layout />
          </OwnerRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
