
const CACHE_NAME = 'ufm-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // STRATEGY 1: Network First for system_config.json
  // We want the lock status to be as fresh as possible.
  if (requestUrl.pathname.includes('system_config.json')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
            // If offline, try to return from cache if available, or return fallback
            return caches.match(event.request);
        })
    );
    return;
  }

  // STRATEGY 2: Stale-While-Revalidate for other requests
  // Serve from cache immediately, but update in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
