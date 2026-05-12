/**
 * HappyTimesAZ — minimal installable PWA worker.
 * Chrome requires a fetch handler for installability; we only pass through to the network
 * (no caching) so home-screen launches are not intercepted or broken.
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Document navigations: never substitute a non-HTML 503 body — some clients treat that as a broken launch.
  const isNavigate = event.request.mode === 'navigate';
  if (isNavigate) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }))
  );
});
