const CACHE_NAME = 'creard-v4';
const STATIC_ASSETS = [
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

// Install: pre-cache static assets only (NOT HTML pages)
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
    return;
  }

  // NEVER cache mutable admin API endpoints
  if (url.pathname.startsWith('/api/stats') ||
      url.pathname.startsWith('/api/expenses') ||
      url.pathname.startsWith('/api/equipment') ||
      url.pathname.startsWith('/api/payments') ||
      url.pathname.startsWith('/api/retained-advances')) {
    return;
  }

  // API calls: stale-while-revalidate (serve cache, update in background)
  const isCacheableApi = CACHEABLE_API.some((api) => url.pathname.startsWith(api));
  if (isCacheableApi) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // HTML pages: NETWORK-FIRST (always try to get the latest version)
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
    const isHtml = request.headers.get('accept')?.includes('text/html') ||
                   url.pathname === '/' ||
                   url.pathname === '/admin' ||
                   url.pathname.endsWith('/') ||
                   !url.pathname.includes('.');
    if (isHtml) {
      event.respondWith(networkFirstForPages(request));
      return;
    }
    // Static assets (images, JS, CSS with hash): cache-first
    event.respondWith(cacheFirst(request));
    return;
  }
});

// Network-first for HTML pages: always fetch fresh, fall back to cache
async function networkFirstForPages(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' });
  }
}

// Cache-first for static assets (JS/CSS bundles have content hashes)
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