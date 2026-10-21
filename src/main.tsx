import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('BookingBase service worker registration failed', error)
  },
})

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

// `npm run dev:mock` serves fixture data instead of calling the backend.
if (import.meta.env.VITE_MOCK_API === 'true') {
  import('./dev/mockApi').then(({ installMockApi }) => {
    installMockApi()
    render()
  })
} else {
  render()
}
