const CACHE_NAME = 'spcalculator-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'brand-slider.js',
  'brand-slider.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'offline.html' // A fallback page for offline scenarios
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // console.log('[Service Worker] Caching core assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        // Silent error handling in production
      })
  );
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            // console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all open clients once activated
});

// Fetch event: Serve from cache first, then network
self.addEventListener('fetch', event => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the response because it's a stream and can only be consumed once.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              // console.log('[Service Worker] Caching new asset:', event.request.url);
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(error => {
          // If fetch fails (e.g., offline), return the offline fallback page
          return caches.match('offline.html');
        });
      })
  );
});
