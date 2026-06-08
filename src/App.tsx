import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout, Layout } from './components/Layout'
import { PublicLayout } from './components/PublicLayout'
import { useAuth } from './context/AuthContext'
import { BookBusinessPage } from './pages/BookBusinessPage'
import { BrowseBusinessesPage } from './pages/BrowseBusinessesPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function GuestAuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function HomeRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-page">Loading…</div>
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/book'} replace />
}

export default function App() {
  return (
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
          path="/register"
          element={
            <GuestAuthRoute>
              <RegisterPage />
            </GuestAuthRoute>
          }
        />
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
  )
}
