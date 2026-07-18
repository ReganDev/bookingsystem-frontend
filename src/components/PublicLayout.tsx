import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PublicLayout() {
  const { isAuthenticated, isCustomer, isAdmin, user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell public-shell">
      <header className="app-header public-header">
        <Link to="/book" className="brand-link">
          <h1>Book Now</h1>
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
              <span>Hi, {user?.firstName}</span>
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
