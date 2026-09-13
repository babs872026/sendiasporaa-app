const PRODUCTION_API_BY_HOST = {
  'sendiasporaa.com': 'https://api.sendiasporaa.com',
  'www.sendiasporaa.com': 'https://api.sendiasporaa.com'
}

const DEFAULT_REMOTE_API = 'https://api.sendiasporaa.com'

export function getApiBaseUrl() {
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  const localApi = 'http://localhost:3000'

  // In local development we always want the local backend.
  if (import.meta.env.DEV) return localApi

  // Force the custom domain to use the stable API custom domain,
  // regardless of potentially stale Vercel env vars.
  const mapped = PRODUCTION_API_BY_HOST[host]
  if (mapped) return mapped

  const envBase = import.meta.env.VITE_API_BASE
  if (envBase && envBase.toString().trim()) {
    const normalized = envBase.toString().trim().replace(/\/$/, '')
    const looksLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(normalized)

    // In local development, always prefer a local backend unless
    // a local URL is explicitly configured.
    if (isLocalHost) {
      return looksLocal ? normalized : localApi
    }

    // Avoid broken production builds caused by localhost env vars on Vercel
    if (!looksLocal) return normalized
  }

  if (typeof window === 'undefined') return localApi

  if (isLocalHost) return localApi

  return DEFAULT_REMOTE_API
}

export const API = getApiBaseUrl()