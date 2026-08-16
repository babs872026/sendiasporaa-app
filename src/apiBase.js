const PRODUCTION_API_BY_HOST = {
  'sendiasporaa.com': 'https://sendiasporaa-api.onrender.com',
  'www.sendiasporaa.com': 'https://sendiasporaa-api.onrender.com'
}

const DEFAULT_REMOTE_API = 'https://sendiasporaa-api.onrender.com'

export function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE
  if (envBase && envBase.toString().trim()) {
    const normalized = envBase.toString().trim().replace(/\/$/, '')
    const looksLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(normalized)

    // Avoid broken production builds caused by localhost env vars on Vercel
    if (!looksLocal) return normalized
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname.toLowerCase()
      const isLocalHost = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '0.0.0.0'
      if (isLocalHost) return normalized
    }
  }

  if (typeof window === 'undefined') return 'http://localhost:3000'

  const host = window.location.hostname.toLowerCase()
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  if (isLocalHost) return 'http://localhost:3000'

  const mapped = PRODUCTION_API_BY_HOST[host]
  if (mapped) return mapped

  return DEFAULT_REMOTE_API
}

export const API = getApiBaseUrl()