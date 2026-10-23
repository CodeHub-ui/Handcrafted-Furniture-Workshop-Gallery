/* Caches the app's own files so it can start offline. Bump CACHE_VERSION when you change any cached file. */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `hfwg-static-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/config.js',
  './js/data/sample-furniture.js',
  './js/services/storage-service.js',
  './js/services/furniture-service.js',
  './js/utils/validation.js',
  './js/utils/sanitization.js',
  './js/utils/analytics.js',
  './js/utils/dom.js',
  './js/utils/format.js',
  './js/components/dashboard.js',
  './js/components/gallery.js',
  './js/components/furniture-form.js',
  './js/components/furniture-details.js',
  './js/components/notifications.js',
  './js/offline/connection-status.js',
  './js/offline/service-worker-registration.js',
  './assets/images/placeholder.svg',
  './assets/images/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const isSameOrigin = new URL(request.url).origin === self.location.origin;
  // Remote images and other cross-origin requests go straight to the network.
  if (request.method !== 'GET' || !isSameOrigin) return;
  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const refresh = fetch(request).then((response) => {
    if (response.status === 200) cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  try {
    return await refresh;
  } catch {
    return offlineFallback(request, cache);
  }
}

async function offlineFallback(request, cache) {
  if (request.mode === 'navigate') {
    const page = await cache.match('./index.html');
    if (page) return page;
  }
  if (request.destination === 'image') {
    const placeholder = await cache.match('./assets/images/placeholder.svg');
    if (placeholder) return placeholder;
  }
  return new Response('You are offline and this file was not cached.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
