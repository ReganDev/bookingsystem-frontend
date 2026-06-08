import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout() {
  const { user, business, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Business Dashboard</h1>
        <div className="app-header-meta">
          <Link to="/book" className="header-link">
            Customer booking page
          </Link>
          <span>
            {business?.name} · {user?.fullName}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="auth-page">
      <Outlet />
      <p className="auth-footer">
        <Link to="/book">Book an appointment</Link> ·{' '}
        <Link to="/login">Business login</Link> ·{' '}
        <Link to="/register">Register a business</Link>
      </p>
    </div>
  )
}
