import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import bookingbaseLogo from '../assets/bookingbase-logo.png'

export function PublicLayout() {
  const {
    isAuthenticated,
    isCustomer,
    isAdmin,
    isVerified,
    user,
    logout,
  } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell public-shell">
      <header className="app-header public-header">
        <Link to="/book" className="brand-link" aria-label="BookingBase home">
          <img src={bookingbaseLogo} alt="BookingBase" className="brand-logo" />
        </Link>
        <div className="app-header-meta">
          {!isAuthenticated && (
            <>
              <Link to="/login" className="header-link">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Create account
              </Link>
            </>
          )}
          {isAuthenticated && isCustomer && (
            <>
              {isVerified ? (
                <span>Hi, {user?.firstName}</span>
              ) : (
                <Link
                  to={`/check-email?email=${encodeURIComponent(user?.email ?? '')}`}
                  className="header-link"
                >
                  Verify your email
                </Link>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await logout()
                  navigate('/book')
                }}
              >
                Sign out
              </button>
            </>
          )}
          {isAuthenticated && !isCustomer && (
            <Link
              to={isAdmin ? '/admin' : '/dashboard'}
              className="header-link"
            >
              {isAdmin ? 'Admin console' : 'Business dashboard'}
            </Link>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
