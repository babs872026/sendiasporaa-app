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
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.error('Service worker registration failed:', err)
    })
  })
}
