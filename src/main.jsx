import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Welcome from './Welcome.jsx'

function Router() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onpop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onpop)
    return () => window.removeEventListener('popstate', onpop)
  }, [])
  if (path === '/' || path === '/welcome') return <Welcome />
  return <App />
}

const container = document.getElementById('root')
if (!window.__APP_ROOT) {
  window.__APP_ROOT = createRoot(container)
}
window.__APP_ROOT.render(
  <StrictMode>
    <Router />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        registration.update().catch(() => {})

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        let refreshed = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshed) return
          refreshed = true
          window.location.reload()
        })
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err)
      })
  })
}
