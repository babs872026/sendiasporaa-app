const CACHE_VERSION = 'sendiasporaa-v2'
const APP_SHELL = ['/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const reqUrl = new URL(event.request.url)
  // Ignore browser-extension and other non-web schemes.
  if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') return

  // Always prefer fresh HTML to avoid serving stale app versions.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', cloned)).catch(() => {})
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response
          const cloned = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, cloned)).catch(() => {})
          return response
        })
        .catch(() => caches.match('/index.html'))
    }),
  )
})
