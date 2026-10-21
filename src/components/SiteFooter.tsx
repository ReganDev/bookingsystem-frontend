import { Link } from 'react-router-dom'
import { privacyDetails } from '../content/privacyPolicy'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <p className="site-footer-legal">
        © {new Date().getFullYear()} {privacyDetails.serviceName}
      </p>
    </footer>
  )
}
