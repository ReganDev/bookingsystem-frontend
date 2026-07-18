import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthLayout, Layout } from './components/Layout'
import { PublicLayout } from './components/PublicLayout'
import { useAuth } from './context/AuthContext'
import { resolveHashPath } from './lib/hashRedirect'
import { BookBusinessPage } from './pages/BookBusinessPage'
import { BrowseBusinessesPage } from './pages/BrowseBusinessesPage'
import { ContactPage } from './pages/ContactPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'

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
  const { isAuthenticated, isCustomer, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Customer accounts have no business to manage
  if (isCustomer) {
    return <Navigate to="/book" replace />
  }

  return children
}

function GuestAuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

function HomeRedirect() {
  const { isAuthenticated, isCustomer, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (!isAuthenticated || isCustomer) {
    return <Navigate to="/book" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <>
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
            <GuestAuthRoute>
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
