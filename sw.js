const CACHE_NAME = 'spcalculator-v5';

const ASSETS = [
  './',
  'index.html',
  'privacy.html',
  'offline.html',
  'styles.css',
  'components.css',
  'results.css',
  'app.js',
  'markup.js',
  'scoring.js',
  'manifest.json',
  'fonts/geist-latin.woff2',
  'fonts/geist-mono-latin.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigations go to the network first, so a redeploy is picked up on the
  // next load instead of being pinned until the cache name changes.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('offline.html'))),
    );
    return;
  }

  // Static assets are cache-first; they are versioned by CACHE_NAME.
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (!response || response.status !== 200 || response.type !== 'basic') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })).catch(() => caches.match('offline.html')),
  );
});
