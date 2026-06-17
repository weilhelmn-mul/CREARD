const CACHE_NAME = 'creard-v2';
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/creard-logo.png',
  '/favicon.ico',
  '/apple-touch-icon.png'
];

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_API = [
  '/api/courts',
  '/api/admin/users',
  '/api/settings'
];

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Some static assets may fail, that's ok
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;

  // NEVER cache /api/bookings — must always be fresh data
  if (url.pathname.startsWith('/api/bookings')) {
    // Pass through to network, no caching
    return;
  }

  // NEVER cache /api/stats, /api/expenses, /api/equipment — mutable admin data
  if (url.pathname.startsWith('/api/stats') ||
      url.pathname.startsWith('/api/expenses') ||
      url.pathname.startsWith('/api/equipment') ||
      url.pathname.startsWith('/api/payments')) {
    return;
  }

  // API calls: stale-while-revalidate (serve cache, update in background)
  const isCacheableApi = CACHEABLE_API.some((api) => url.pathname.startsWith(api));
  if (isCacheableApi) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets & pages: cache-first (only non-API routes)
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Sin conexión' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}