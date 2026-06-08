import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PublicLayout() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="app-shell public-shell">
      <header className="app-header public-header">
        <Link to="/book" className="brand-link">
          <h1>Book Now</h1>
        </Link>
        <div className="app-header-meta">
          {isAuthenticated ? (
            <Link to="/dashboard" className="header-link">
              Business dashboard
            </Link>
          ) : (
            <Link to="/login" className="header-link">
              Business login
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
