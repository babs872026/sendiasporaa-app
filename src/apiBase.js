const PRODUCTION_API_BY_HOST = {
  'sendiasporaa.com': 'https://api.sendiasporaa.com',
  'www.sendiasporaa.com': 'https://api.sendiasporaa.com'
}

const DEFAULT_REMOTE_API = 'https://api.sendiasporaa.com'

export function getApiBaseUrl() {
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'

  // Force the custom domain to use the stable API custom domain,
  // regardless of potentially stale Vercel env vars.
  const mapped = PRODUCTION_API_BY_HOST[host]
  if (mapped) return mapped

  const envBase = import.meta.env.VITE_API_BASE
  if (envBase && envBase.toString().trim()) {
    const normalized = envBase.toString().trim().replace(/\/$/, '')
    const looksLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(normalized)

    // Avoid broken production builds caused by localhost env vars on Vercel
    if (!looksLocal) return normalized
    if (isLocalHost) return normalized
  }

  if (typeof window === 'undefined') return 'http://localhost:3000'

  if (isLocalHost) return 'http://localhost:3000'

  return DEFAULT_REMOTE_API
}

export const API = getApiBaseUrl()