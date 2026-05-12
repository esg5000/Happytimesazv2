/**
 * HappyTimesAZ service worker — no fetch handler.
 * Intercepting navigations broke some PWA home-screen launches (blank / instant close).
 * This still registers a worker (Chrome install criteria) and wipes legacy caches on activate.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
